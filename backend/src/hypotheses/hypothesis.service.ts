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
import { FactRelationEntity } from '../analysis/entities/fact-relation.entity';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import { LLM_PROVIDER } from '../llm/llm-provider';
import type { LlmProvider } from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { HypothesisGenerationRunEntity } from './entities/hypothesis-generation-run.entity';
import { HypothesisStatusHistoryEntity } from './entities/hypothesis-status-history.entity';
import { HypothesisEntity } from './entities/hypothesis.entity';
import type { HypothesisStatus } from './constants/hypothesis-status';
import { evaluateHypothesisCandidate } from './filters/hypothesis-filter';
import {
  buildHypothesisSystemPrompt,
  buildHypothesisUserPrompt,
} from './prompts/hypothesis.prompt';
import { LlmHypothesisItem } from './schema/llm-hypothesis-response';
import { parseLlmHypothesisResponseJson } from './schema/llm-hypothesis-response.validator';

export type HypothesisGenerationResult = {
  run: HypothesisGenerationRunEntity;
  hypotheses: HypothesisEntity[];
  reusedExisting: boolean;
};

export type HypothesisDetailResult = {
  hypothesis: HypothesisEntity;
  relatedFacts: ExtractedFactEntity[];
  relatedArticles: NewsArticleEntity[];
  statusHistory: HypothesisStatusHistoryEntity[];
};

@Injectable()
export class HypothesisService {
  private readonly logger = new Logger(HypothesisService.name);
  private readonly temperature: number;
  private readonly maxFacts: number;

  constructor(
    @InjectRepository(ExtractedFactEntity)
    private readonly facts: Repository<ExtractedFactEntity>,
    @InjectRepository(NewsArticleEntity)
    private readonly articles: Repository<NewsArticleEntity>,
    @InjectRepository(FactRelationEntity)
    private readonly relations: Repository<FactRelationEntity>,
    @InjectRepository(HypothesisEntity)
    private readonly hypotheses: Repository<HypothesisEntity>,
    @InjectRepository(HypothesisStatusHistoryEntity)
    private readonly statusHistories: Repository<HypothesisStatusHistoryEntity>,
    @InjectRepository(HypothesisGenerationRunEntity)
    private readonly runs: Repository<HypothesisGenerationRunEntity>,
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
    configService: ConfigService,
  ) {
    this.temperature = configService.get<number>('llm.temperature') ?? 0;
    this.maxFacts =
      configService.get<number>('hypotheses.maxFactsPerRun') ?? 40;
  }

  async generate(
    factIdsInput: string[] | undefined,
    force: boolean,
  ): Promise<HypothesisGenerationResult> {
    const selectedFacts = await this.loadFacts(factIdsInput);

    if (selectedFacts.length < 2) {
      throw new BadRequestException(
        'At least two accepted facts from different articles are required',
      );
    }

    const articleIdSet = new Set<string>();

    for (const fact of selectedFacts) {
      articleIdSet.add(fact.articleId);
    }

    if (articleIdSet.size < 2) {
      throw new BadRequestException(
        'Hypothesis generation requires facts from at least two different articles',
      );
    }

    const factIds: string[] = [];

    for (const fact of selectedFacts) {
      factIds.push(fact.id);
    }

    const relatedRelations = await this.relations.find({
      where: [{ factIdA: In(factIds) }, { factIdB: In(factIds) }],
      order: { analyzedAt: 'DESC' },
    });

    const relationIds: string[] = [];

    for (const relation of relatedRelations) {
      if (
        factIds.includes(relation.factIdA) &&
        factIds.includes(relation.factIdB) &&
        !relationIds.includes(relation.id)
      ) {
        relationIds.push(relation.id);
      }
    }

    const inputHash = this.hashInputs(factIds, relationIds);

    if (!force) {
      const existing = await this.runs.findOne({
        where: { inputHash, status: 'completed' },
        order: { finishedAt: 'DESC' },
      });

      if (existing !== null) {
        const hypotheses = await this.hypotheses.find({
          where: { generationRunId: existing.id },
          order: { generatedAt: 'ASC' },
        });

        return {
          run: existing,
          hypotheses,
          reusedExisting: true,
        };
      }
    }

    const running = await this.runs.findOne({
      where: { inputHash, status: 'running' },
    });

    if (running !== null) {
      throw new BadRequestException(
        'Hypothesis generation is already running for this input set',
      );
    }

    const run = await this.runs.save(
      this.runs.create({
        inputHash,
        status: 'running',
        factIds,
        relationIds,
        model: null,
        hypothesisCount: 0,
        skippedCount: 0,
        errorMessage: null,
        startedAt: new Date(),
        finishedAt: null,
      }),
    );

    try {
      const articlesById = await this.loadArticlesForFacts(selectedFacts);
      const completion = await this.llmProvider.complete({
        messages: [
          { role: 'system', content: buildHypothesisSystemPrompt() },
          {
            role: 'user',
            content: buildHypothesisUserPrompt(
              selectedFacts,
              relatedRelations.filter((item) => relationIds.includes(item.id)),
              articlesById,
            ),
          },
        ],
        temperature: this.temperature,
        jsonMode: true,
        context: { stage: 'hypothesis' },
      });

      const parsed = parseLlmHypothesisResponseJson(completion.content);

      if (!parsed.ok) {
        throw new Error(
          `LLM hypothesis schema validation failed: ${parsed.message}`,
        );
      }

      const factsById = new Map<string, ExtractedFactEntity>();

      for (const fact of selectedFacts) {
        factsById.set(fact.id, fact);
      }

      const knownRelationIds = new Set(relationIds);
      const kept: LlmHypothesisItem[] = [];
      let skippedCount = 0;

      for (const item of parsed.data.hypotheses) {
        const verdict = evaluateHypothesisCandidate(
          item,
          factsById,
          knownRelationIds,
        );

        if (!verdict.keep) {
          skippedCount += 1;
          this.logger.warn(`Skipped hypothesis candidate: ${verdict.reason}`);
          continue;
        }

        kept.push(this.enrichArticleUrls(item, factsById, articlesById));
      }

      if (force) {
        const previousRuns = await this.runs.find({
          where: { inputHash, status: 'completed' },
        });
        const previousRunIds: string[] = [];

        for (const previous of previousRuns) {
          previousRunIds.push(previous.id);
        }

        if (previousRunIds.length > 0) {
          const toDelete = await this.hypotheses.find({
            where: { generationRunId: In(previousRunIds) },
          });
          const hypothesisIds: string[] = [];

          for (const item of toDelete) {
            hypothesisIds.push(item.id);
          }

          if (hypothesisIds.length > 0) {
            await this.statusHistories.delete({
              hypothesisId: In(hypothesisIds),
            });
            await this.hypotheses.delete({ id: In(hypothesisIds) });
          }
        }
      }

      const saved = await this.persistHypotheses(run.id, kept);

      run.status = 'completed';
      run.model = completion.model;
      run.hypothesisCount = saved.length;
      run.skippedCount = skippedCount;
      run.finishedAt = new Date();
      run.errorMessage = null;
      await this.runs.save(run);

      return {
        run,
        hypotheses: saved,
        reusedExisting: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Hypothesis generation failed';

      run.status = 'failed';
      run.errorMessage = message;
      run.finishedAt = new Date();
      await this.runs.save(run);

      this.logger.error(`Hypothesis generation failed: ${message}`);
      throw new BadRequestException(message);
    }
  }

  async list(limit: number): Promise<HypothesisEntity[]> {
    return this.hypotheses.find({
      order: { generatedAt: 'DESC' },
      take: limit,
    });
  }

  async listPaged(options: {
    limit: number;
    offset: number;
    status?: HypothesisStatus;
  }): Promise<{ rows: HypothesisEntity[]; total: number }> {
    const [rows, total] = await this.hypotheses.findAndCount({
      where: options.status === undefined ? {} : { status: options.status },
      order: { generatedAt: 'DESC' },
      take: options.limit,
      skip: options.offset,
    });

    return { rows, total };
  }

  async getDetail(id: string): Promise<HypothesisDetailResult> {
    const hypothesis = await this.hypotheses.findOne({ where: { id } });

    if (hypothesis === null) {
      throw new NotFoundException(`Hypothesis not found: ${id}`);
    }

    const relatedFacts =
      hypothesis.relatedFactIds.length === 0
        ? []
        : await this.facts.find({
            where: { id: In(hypothesis.relatedFactIds) },
          });

    const articleIds: string[] = [];

    for (const fact of relatedFacts) {
      if (!articleIds.includes(fact.articleId)) {
        articleIds.push(fact.articleId);
      }
    }

    const relatedArticles =
      articleIds.length === 0
        ? []
        : await this.articles.find({
            where: { id: In(articleIds) },
          });

    const statusHistory = await this.statusHistories.find({
      where: { hypothesisId: hypothesis.id },
      order: { changedAt: 'ASC' },
    });

    return {
      hypothesis,
      relatedFacts,
      relatedArticles,
      statusHistory,
    };
  }

  private async loadFacts(
    factIdsInput: string[] | undefined,
  ): Promise<ExtractedFactEntity[]> {
    let facts: ExtractedFactEntity[];

    if (factIdsInput !== undefined && factIdsInput.length > 0) {
      facts = await this.facts.find({
        where: {
          id: In(factIdsInput),
          reviewStatus: 'accepted',
        },
      });

      if (facts.length !== factIdsInput.length) {
        throw new BadRequestException(
          'One or more factIds are missing or not accepted',
        );
      }
    } else {
      facts = await this.loadUnusedAcceptedFacts(this.maxFacts);

      if (facts.length < 2) {
        throw new BadRequestException(
          'Need at least two unused accepted facts from different articles. Run analysis on new facts first.',
        );
      }
    }

    if (facts.length > this.maxFacts) {
      throw new BadRequestException(
        `Too many facts for one hypothesis run (max ${this.maxFacts})`,
      );
    }

    return facts;
  }

  private async loadUnusedAcceptedFacts(
    limit: number,
  ): Promise<ExtractedFactEntity[]> {
    // 완료된 가설 생성 실행의 factIds(jsonb)에 없는 승인 사실만 DB에서 바로 고른다.
    return this.facts
      .createQueryBuilder('fact')
      .where('fact.reviewStatus = :status', { status: 'accepted' })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM hypothesis_generation_runs run WHERE run.status = 'completed' AND run."factIds" @> jsonb_build_array(fact.id::text))`,
      )
      .orderBy('fact.extractedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  private async loadArticlesForFacts(
    facts: ExtractedFactEntity[],
  ): Promise<Map<string, NewsArticleEntity>> {
    const articleIds: string[] = [];

    for (const fact of facts) {
      if (!articleIds.includes(fact.articleId)) {
        articleIds.push(fact.articleId);
      }
    }

    const articles = await this.articles.find({
      where: { id: In(articleIds) },
    });
    const map = new Map<string, NewsArticleEntity>();

    for (const article of articles) {
      map.set(article.id, article);
    }

    return map;
  }

  private enrichArticleUrls(
    item: LlmHypothesisItem,
    factsById: Map<string, ExtractedFactEntity>,
    articlesById: Map<string, NewsArticleEntity>,
  ): LlmHypothesisItem {
    const urls: string[] = [];

    for (const existing of item.relatedArticleUrls) {
      if (!urls.includes(existing)) {
        urls.push(existing);
      }
    }

    for (const factId of item.relatedFactIds) {
      const fact = factsById.get(factId);

      if (fact === undefined) {
        continue;
      }

      const article = articlesById.get(fact.articleId);
      const url = article?.url ?? fact.sourceUrl;

      if (!urls.includes(url)) {
        urls.push(url);
      }
    }

    return {
      title: item.title,
      coreClaim: item.coreClaim,
      derivationProcess: item.derivationProcess,
      relatedFactIds: item.relatedFactIds,
      relatedRelationIds: item.relatedRelationIds,
      supportingEvidence: item.supportingEvidence,
      contradictingEvidence: item.contradictingEvidence,
      alternativeExplanations: item.alternativeExplanations,
      assumptions: item.assumptions,
      uncertaintyAndLimits: item.uncertaintyAndLimits,
      additionalVerificationItems: item.additionalVerificationItems,
      relatedArticleUrls: urls,
      factsVersusInference: item.factsVersusInference,
      status: item.status,
      statusReason: item.statusReason,
    };
  }

  private async persistHypotheses(
    generationRunId: string,
    items: LlmHypothesisItem[],
  ): Promise<HypothesisEntity[]> {
    const generatedAt = new Date();
    const saved: HypothesisEntity[] = [];

    for (const item of items) {
      const hypothesis = await this.hypotheses.save(
        this.hypotheses.create({
          generationRunId,
          title: item.title,
          coreClaim: item.coreClaim,
          derivationProcess: item.derivationProcess,
          relatedFactIds: item.relatedFactIds,
          relatedRelationIds: item.relatedRelationIds,
          supportingEvidence: item.supportingEvidence,
          contradictingEvidence: item.contradictingEvidence,
          alternativeExplanations: item.alternativeExplanations,
          assumptions: item.assumptions,
          uncertaintyAndLimits: item.uncertaintyAndLimits,
          additionalVerificationItems: item.additionalVerificationItems,
          relatedArticleUrls: item.relatedArticleUrls,
          factsVersusInference: item.factsVersusInference,
          status: item.status,
          generatedAt,
          lastReevaluatedAt: null,
        }),
      );

      await this.statusHistories.save(
        this.statusHistories.create({
          hypothesisId: hypothesis.id,
          fromStatus: null,
          toStatus: item.status,
          reason: item.statusReason,
          evidenceRefs: item.supportingEvidence,
          changedAt: generatedAt,
        }),
      );

      saved.push(hypothesis);
    }

    return saved;
  }

  private hashInputs(factIds: string[], relationIds: string[]): string {
    const factsSorted = [...factIds].sort();
    const relationsSorted = [...relationIds].sort();

    return createHash('sha256')
      .update(`${factsSorted.join('|')}#${relationsSorted.join('|')}`)
      .digest('hex');
  }
}
