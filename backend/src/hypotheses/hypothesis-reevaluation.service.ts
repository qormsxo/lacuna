import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import { FactsService } from '../facts/facts.service';
import { LLM_PROVIDER } from '../llm/llm-provider';
import type { LlmProvider } from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { normalizeEntityToken } from '../analysis/candidates/fact-candidate.util';
import { HypothesisStatus } from './constants/hypothesis-status';
import { HypothesisReevaluationEntity } from './entities/hypothesis-reevaluation.entity';
import { HypothesisStatusHistoryEntity } from './entities/hypothesis-status-history.entity';
import { HypothesisEntity } from './entities/hypothesis.entity';
import {
  buildReevaluationSystemPrompt,
  buildReevaluationUserPrompt,
} from './prompts/reevaluation.prompt';
import { LlmReevaluationItem } from './schema/llm-reevaluation-response';
import { parseLlmReevaluationResponseJson } from './schema/llm-reevaluation-response.validator';

export type ReevaluationBatchResult = {
  articleId: string;
  extractedFactCount: number;
  candidateHypothesisCount: number;
  assessments: HypothesisReevaluationEntity[];
  skippedDuplicates: number;
};

@Injectable()
export class HypothesisReevaluationService {
  private readonly logger = new Logger(HypothesisReevaluationService.name);
  private readonly temperature: number;
  private readonly maxHypotheses: number;

  constructor(
    @InjectRepository(NewsArticleEntity)
    private readonly articles: Repository<NewsArticleEntity>,
    @InjectRepository(ExtractedFactEntity)
    private readonly facts: Repository<ExtractedFactEntity>,
    @InjectRepository(HypothesisEntity)
    private readonly hypotheses: Repository<HypothesisEntity>,
    @InjectRepository(HypothesisStatusHistoryEntity)
    private readonly statusHistories: Repository<HypothesisStatusHistoryEntity>,
    @InjectRepository(HypothesisReevaluationEntity)
    private readonly reevaluations: Repository<HypothesisReevaluationEntity>,
    private readonly factsService: FactsService,
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
    configService: ConfigService,
  ) {
    this.temperature = configService.get<number>('llm.temperature') ?? 0;
    this.maxHypotheses =
      configService.get<number>('hypotheses.maxReevaluateCandidates') ?? 20;
  }

  async reevaluateForArticle(
    articleId: string,
    force: boolean,
  ): Promise<ReevaluationBatchResult> {
    const article = await this.articles.findOne({ where: { id: articleId } });

    if (article === null) {
      throw new NotFoundException(`Article not found: ${articleId}`);
    }

    const extraction = await this.factsService.extractForArticle(
      articleId,
      false,
    );
    const newFacts = extraction.facts.filter(
      (fact) => fact.reviewStatus === 'accepted',
    );

    if (newFacts.length === 0) {
      throw new BadRequestException(
        'No accepted facts available for this article to reevaluate hypotheses',
      );
    }

    const candidates = await this.findCandidateHypotheses(newFacts);

    if (candidates.length === 0) {
      return {
        articleId,
        extractedFactCount: newFacts.length,
        candidateHypothesisCount: 0,
        assessments: [],
        skippedDuplicates: 0,
      };
    }

    if (!force) {
      const alreadyAssessed: HypothesisReevaluationEntity[] = [];
      let allCovered = true;

      for (const hypothesis of candidates) {
        const existingForPair = await this.reevaluations.find({
          where: {
            hypothesisId: hypothesis.id,
            sourceArticleId: articleId,
            status: 'completed',
          },
          order: { evaluatedAt: 'DESC' },
        });

        if (existingForPair.length === 0) {
          allCovered = false;
          break;
        }

        const latest = existingForPair[0];

        if (latest !== undefined) {
          alreadyAssessed.push(latest);
        }
      }

      if (allCovered) {
        return {
          articleId,
          extractedFactCount: newFacts.length,
          candidateHypothesisCount: candidates.length,
          assessments: alreadyAssessed,
          skippedDuplicates: alreadyAssessed.length,
        };
      }
    }

    const completion = await this.llmProvider.complete({
      messages: [
        { role: 'system', content: buildReevaluationSystemPrompt() },
        {
          role: 'user',
          content: buildReevaluationUserPrompt(article, newFacts, candidates),
        },
      ],
      temperature: this.temperature,
      jsonMode: true,
    });

    const parsed = parseLlmReevaluationResponseJson(completion.content);

    if (!parsed.ok) {
      throw new BadRequestException(
        `LLM reevaluation schema validation failed: ${parsed.message}`,
      );
    }

    const knownIds = new Set<string>();

    for (const hypothesis of candidates) {
      knownIds.add(hypothesis.id);
    }

    const assessments: HypothesisReevaluationEntity[] = [];
    let skippedDuplicates = 0;

    for (const item of parsed.data.assessments) {
      if (!knownIds.has(item.hypothesisId)) {
        continue;
      }

      const fingerprint = this.buildFingerprint(
        articleId,
        item.hypothesisId,
        item.evidenceKind,
      );

      const existing = await this.reevaluations.findOne({
        where: {
          hypothesisId: item.hypothesisId,
          sourceArticleId: articleId,
          evidenceFingerprint: fingerprint,
          status: 'completed',
        },
      });

      if (existing !== null && !force) {
        skippedDuplicates += 1;
        assessments.push(existing);
        continue;
      }

      const applied = await this.applyAssessment(
        item,
        articleId,
        fingerprint,
      );
      assessments.push(applied);
    }

    return {
      articleId,
      extractedFactCount: newFacts.length,
      candidateHypothesisCount: candidates.length,
      assessments,
      skippedDuplicates,
    };
  }


  async listRecent(limit: number): Promise<HypothesisReevaluationEntity[]> {
    return this.reevaluations.find({
      where: { status: 'completed' },
      order: { evaluatedAt: 'DESC' },
      take: limit,
    });
  }

  async listByHypothesis(
    hypothesisId: string,
  ): Promise<HypothesisReevaluationEntity[]> {
    return this.reevaluations.find({
      where: { hypothesisId, status: 'completed' },
      order: { evaluatedAt: 'DESC' },
    });
  }

  private async findCandidateHypotheses(
    newFacts: ExtractedFactEntity[],
  ): Promise<HypothesisEntity[]> {
    const entityTokens = new Set<string>();

    for (const fact of newFacts) {
      for (const entity of fact.entities) {
        entityTokens.add(normalizeEntityToken(entity));
      }
    }

    const all = await this.hypotheses.find({
      order: { generatedAt: 'DESC' },
      take: 100,
    });

    const matched: HypothesisEntity[] = [];

    for (const hypothesis of all) {
      if (matched.length >= this.maxHypotheses) {
        break;
      }

      const relatedFacts =
        hypothesis.relatedFactIds.length === 0
          ? []
          : await this.facts.find({
              where: { id: In(hypothesis.relatedFactIds) },
            });

      let overlap = false;

      for (const related of relatedFacts) {
        for (const entity of related.entities) {
          if (entityTokens.has(normalizeEntityToken(entity))) {
            overlap = true;
            break;
          }
        }

        if (overlap) {
          break;
        }
      }

      if (overlap) {
        matched.push(hypothesis);
      }
    }

    return matched;
  }

  private async applyAssessment(
    item: LlmReevaluationItem,
    articleId: string,
    fingerprint: string,
  ): Promise<HypothesisReevaluationEntity> {
    const hypothesis = await this.hypotheses.findOne({
      where: { id: item.hypothesisId },
    });

    if (hypothesis === null) {
      throw new NotFoundException(`Hypothesis not found: ${item.hypothesisId}`);
    }

    const previousStatus = hypothesis.status;
    let nextStatus: HypothesisStatus | null = item.newStatus;
    let applied = false;

    if (item.evidenceKind === 'supporting' && item.isIndependentSource) {
      if (!hypothesis.supportingEvidence.includes(item.evidenceText)) {
        const nextSupporting: string[] = [];

        for (const value of hypothesis.supportingEvidence) {
          nextSupporting.push(value);
        }

        nextSupporting.push(item.evidenceText);
        hypothesis.supportingEvidence = nextSupporting;
        applied = true;
      }

      if (nextStatus === null) {
        nextStatus = 'supporting_evidence_increasing';
      }
    } else if (
      item.evidenceKind === 'contradicting' &&
      item.isIndependentSource
    ) {
      if (!hypothesis.contradictingEvidence.includes(item.evidenceText)) {
        const nextContradicting: string[] = [];

        for (const value of hypothesis.contradictingEvidence) {
          nextContradicting.push(value);
        }

        nextContradicting.push(item.evidenceText);
        hypothesis.contradictingEvidence = nextContradicting;
        applied = true;
      }

      if (nextStatus === null) {
        nextStatus = 'contradicting_evidence_increasing';
      }
    } else if (item.evidenceKind === 'repeat') {
      applied = false;
      if (nextStatus === null) {
        nextStatus = previousStatus;
      }
    } else {
      applied = false;
      if (nextStatus === null) {
        nextStatus = previousStatus;
      }
    }

    const statusChanged =
      nextStatus !== null && nextStatus !== previousStatus;

    if (statusChanged && nextStatus !== null) {
      hypothesis.status = nextStatus;
      await this.statusHistories.save(
        this.statusHistories.create({
          hypothesisId: hypothesis.id,
          fromStatus: previousStatus,
          toStatus: nextStatus,
          reason: item.statusReason,
          evidenceRefs: [item.evidenceText],
          changedAt: new Date(),
        }),
      );
      applied = true;
    }

    hypothesis.lastReevaluatedAt = new Date();
    await this.hypotheses.save(hypothesis);

    return this.reevaluations.save(
      this.reevaluations.create({
        hypothesisId: hypothesis.id,
        sourceArticleId: articleId,
        evidenceFingerprint: fingerprint,
        status: 'completed',
        evidenceKind: item.evidenceKind,
        isIndependentSource: item.isIndependentSource,
        summary: item.summary,
        evidenceText: item.evidenceText,
        previousStatus,
        nextStatus: statusChanged ? nextStatus : previousStatus,
        statusReason: item.statusReason,
        applied,
        evaluatedAt: new Date(),
      }),
    );
  }

  private buildFingerprint(
    articleId: string,
    hypothesisId: string,
    evidenceKind: string,
  ): string {
    return createHash('sha256')
      .update(`${articleId}|${hypothesisId}|${evidenceKind}`)
      .digest('hex');
  }
}
