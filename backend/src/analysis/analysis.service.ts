import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import { LLM_PROVIDER } from '../llm/llm-provider';
import type { LlmProvider } from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import {
  buildCandidatePairs,
  FactWithArticle,
  hashFactIds,
  looksLikeRepublishedRelease,
  orderedFactPair,
} from './candidates/fact-candidate.util';
import type { RelationType } from './constants/relation-types';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { FactRelationEntity } from './entities/fact-relation.entity';
import { FactVerificationEntity } from './entities/fact-verification.entity';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
} from './prompts/analysis.prompt';
import { shouldKeepRelation } from './relations/relation-filter';
import {
  LlmRelationItem,
  LlmVerificationItem,
} from './schema/llm-analysis-response';
import { parseLlmAnalysisResponseJson } from './schema/llm-analysis-response.validator';

export type AnalysisServiceResult = {
  run: AnalysisRunEntity;
  verifications: FactVerificationEntity[];
  relations: FactRelationEntity[];
  reusedExisting: boolean;
};

export type FactSummary = {
  id: string;
  statement: string;
  articleId: string;
  articleTitle: string | null;
  articleUrl: string | null;
  publisher: string | null;
};

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly temperature: number;
  private readonly maxFacts: number;

  constructor(
    @InjectRepository(ExtractedFactEntity)
    private readonly facts: Repository<ExtractedFactEntity>,
    @InjectRepository(NewsArticleEntity)
    private readonly articles: Repository<NewsArticleEntity>,
    @InjectRepository(AnalysisRunEntity)
    private readonly runs: Repository<AnalysisRunEntity>,
    @InjectRepository(FactVerificationEntity)
    private readonly verifications: Repository<FactVerificationEntity>,
    @InjectRepository(FactRelationEntity)
    private readonly relations: Repository<FactRelationEntity>,
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
    configService: ConfigService,
  ) {
    this.temperature = configService.get<number>('llm.temperature') ?? 0;
    this.maxFacts = configService.get<number>('analysis.maxFactsPerRun') ?? 40;
  }

  async runAnalysis(
    factIdsInput: string[] | undefined,
    force: boolean,
  ): Promise<AnalysisServiceResult> {
    const bundled = await this.loadFactsWithArticles(factIdsInput);

    if (bundled.length < 1) {
      throw new BadRequestException(
        'At least one accepted extracted fact is required for analysis',
      );
    }

    const factIds: string[] = [];

    for (const item of bundled) {
      factIds.push(item.fact.id);
    }

    const inputHash = hashFactIds(factIds);

    if (!force) {
      const existing = await this.runs.findOne({
        where: { inputHash, status: 'completed', runType: 'full' },
        order: { finishedAt: 'DESC' },
      });

      if (existing !== null) {
        const verifications = await this.verifications.find({
          where: { analysisRunId: existing.id },
          order: { analyzedAt: 'ASC' },
        });
        const relations = await this.relations.find({
          where: { analysisRunId: existing.id },
          order: { analyzedAt: 'ASC' },
        });

        return {
          run: existing,
          verifications,
          relations,
          reusedExisting: true,
        };
      }
    }

    const running = await this.runs.findOne({
      where: { inputHash, status: 'running' },
    });

    if (running !== null) {
      throw new BadRequestException(
        'Analysis is already running for this fact set',
      );
    }

    const run = await this.runs.save(
      this.runs.create({
        runType: 'full',
        status: 'running',
        inputHash,
        factIds,
        model: null,
        verificationCount: 0,
        relationCount: 0,
        skippedWeakRelationCount: 0,
        errorMessage: null,
        startedAt: new Date(),
        finishedAt: null,
      }),
    );

    try {
      const republishHints = this.buildRepublishHints(bundled);
      const completion = await this.llmProvider.complete({
        messages: [
          { role: 'system', content: buildAnalysisSystemPrompt() },
          {
            role: 'user',
            content: buildAnalysisUserPrompt(bundled, republishHints),
          },
        ],
        temperature: this.temperature,
        jsonMode: true,
        context: { stage: 'analysis' },
      });

      const parsed = parseLlmAnalysisResponseJson(completion.content);

      if (!parsed.ok) {
        throw new Error(
          `LLM analysis schema validation failed: ${parsed.message}`,
        );
      }

      const knownFactIds = new Set(factIds);
      const adjustedVerifications = this.applyRepublishOverrides(
        parsed.data.verifications,
        knownFactIds,
        republishHints,
      );

      const keptRelations: LlmRelationItem[] = [];
      let skippedWeakRelationCount = 0;

      for (const relation of parsed.data.relations) {
        if (
          !knownFactIds.has(relation.factIdA) ||
          !knownFactIds.has(relation.factIdB)
        ) {
          skippedWeakRelationCount += 1;
          continue;
        }

        if (!shouldKeepRelation(relation)) {
          skippedWeakRelationCount += 1;
          continue;
        }

        keptRelations.push(relation);
      }

      if (force) {
        await this.verifications.delete({ factId: In(factIds) });
        await this.relations
          .createQueryBuilder()
          .delete()
          .where('factIdA IN (:...factIds) OR factIdB IN (:...factIds)', {
            factIds,
          })
          .execute();
      }

      const savedVerifications = await this.persistVerifications(
        run.id,
        adjustedVerifications,
        knownFactIds,
      );
      const savedRelations = await this.persistRelations(run.id, keptRelations);

      run.status = 'completed';
      run.model = completion.model;
      run.verificationCount = savedVerifications.length;
      run.relationCount = savedRelations.length;
      run.skippedWeakRelationCount = skippedWeakRelationCount;
      run.finishedAt = new Date();
      run.errorMessage = null;
      await this.runs.save(run);

      return {
        run,
        verifications: savedVerifications,
        relations: savedRelations,
        reusedExisting: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Analysis failed';

      run.status = 'failed';
      run.errorMessage = message;
      run.finishedAt = new Date();
      await this.runs.save(run);

      this.logger.error(`Analysis failed: ${message}`);
      throw new BadRequestException(message);
    }
  }

  async listVerificationsByFact(
    factId: string,
  ): Promise<FactVerificationEntity[]> {
    await this.ensureFactExists(factId);

    return this.verifications.find({
      where: { factId },
      order: { analyzedAt: 'DESC' },
    });
  }

  async getVerification(id: string): Promise<FactVerificationEntity> {
    const item = await this.verifications.findOne({ where: { id } });

    if (item === null) {
      throw new NotFoundException(`Verification not found: ${id}`);
    }

    return item;
  }

  async listRelationsByFact(factId: string): Promise<FactRelationEntity[]> {
    await this.ensureFactExists(factId);

    return this.relations.find({
      where: [{ factIdA: factId }, { factIdB: factId }],
      order: { analyzedAt: 'DESC' },
    });
  }

  async getRelation(id: string): Promise<FactRelationEntity> {
    const item = await this.relations.findOne({ where: { id } });

    if (item === null) {
      throw new NotFoundException(`Relation not found: ${id}`);
    }

    return item;
  }

  listRecentRelations(limit: number): Promise<FactRelationEntity[]> {
    return this.relations.find({
      order: { analyzedAt: 'DESC' },
      take: limit,
    });
  }

  async listRelationsPaged(options: {
    limit: number;
    offset: number;
    relationType?: RelationType;
  }): Promise<{ rows: FactRelationEntity[]; total: number }> {
    const [rows, total] = await this.relations.findAndCount({
      where:
        options.relationType === undefined
          ? {}
          : { relationType: options.relationType },
      order: { analyzedAt: 'DESC' },
      take: options.limit,
      skip: options.offset,
    });

    return { rows, total };
  }

  /** 관계 카드에 사실 문장과 원문 기사를 함께 보여주기 위한 요약 */
  async loadFactSummaries(
    factIds: string[],
  ): Promise<Map<string, FactSummary>> {
    const summaries = new Map<string, FactSummary>();

    if (factIds.length === 0) {
      return summaries;
    }

    const facts = await this.facts.find({
      where: { id: In([...new Set(factIds)]) },
      select: ['id', 'articleId', 'normalizedStatement'],
    });
    const articleIds = [...new Set(facts.map((fact) => fact.articleId))];
    const articles =
      articleIds.length === 0
        ? []
        : await this.articles.find({
            where: { id: In(articleIds) },
            select: ['id', 'title', 'url', 'publisher'],
          });
    const articleById = new Map(articles.map((item) => [item.id, item]));

    for (const fact of facts) {
      const article = articleById.get(fact.articleId);
      summaries.set(fact.id, {
        id: fact.id,
        statement: fact.normalizedStatement,
        articleId: fact.articleId,
        articleTitle: article?.title ?? null,
        articleUrl: article?.url ?? null,
        publisher: article?.publisher ?? null,
      });
    }

    return summaries;
  }

  countRelations(): Promise<number> {
    return this.relations.count();
  }

  async getRun(id: string): Promise<AnalysisServiceResult> {
    const run = await this.runs.findOne({ where: { id } });

    if (run === null) {
      throw new NotFoundException(`Analysis run not found: ${id}`);
    }

    const verifications = await this.verifications.find({
      where: { analysisRunId: run.id },
      order: { analyzedAt: 'ASC' },
    });
    const relations = await this.relations.find({
      where: { analysisRunId: run.id },
      order: { analyzedAt: 'ASC' },
    });

    return {
      run,
      verifications,
      relations,
      reusedExisting: false,
    };
  }

  private async ensureFactExists(factId: string): Promise<void> {
    const fact = await this.facts.findOne({ where: { id: factId } });

    if (fact === null) {
      throw new NotFoundException(`Fact not found: ${factId}`);
    }
  }

  private async loadFactsWithArticles(
    factIdsInput: string[] | undefined,
  ): Promise<FactWithArticle[]> {
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

      if (facts.length === 0) {
        throw new BadRequestException(
          'No unused accepted facts left for analysis. Extract more facts first.',
        );
      }
    }

    if (facts.length > this.maxFacts) {
      throw new BadRequestException(
        `Too many facts for one analysis run (max ${this.maxFacts})`,
      );
    }

    const articleIds: string[] = [];

    for (const fact of facts) {
      if (!articleIds.includes(fact.articleId)) {
        articleIds.push(fact.articleId);
      }
    }

    const articles = await this.articles.find({
      where: { id: In(articleIds) },
    });
    const articleById = new Map<string, NewsArticleEntity>();

    for (const article of articles) {
      articleById.set(article.id, article);
    }

    const bundled: FactWithArticle[] = [];

    for (const fact of facts) {
      const article = articleById.get(fact.articleId);

      if (article === undefined) {
        throw new BadRequestException(`Article missing for fact ${fact.id}`);
      }

      bundled.push({ fact, article });
    }

    return bundled;
  }

  private async loadUnusedAcceptedFacts(
    limit: number,
  ): Promise<ExtractedFactEntity[]> {
    // 완료된 실행의 factIds(jsonb)에 포함되지 않은 승인 사실만 DB에서 바로 고른다.
    // 예전처럼 모든 실행을 메모리로 읽어 NOT IN 목록을 만들지 않는다.
    return this.facts
      .createQueryBuilder('fact')
      .where('fact.reviewStatus = :status', { status: 'accepted' })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM analysis_runs run WHERE run.status = 'completed' AND run."runType" = 'full' AND run."factIds" @> jsonb_build_array(fact.id::text))`,
      )
      .orderBy('fact.extractedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  private buildRepublishHints(
    items: FactWithArticle[],
  ): Array<{ factIdA: string; factIdB: string }> {
    const pairs = buildCandidatePairs(items);
    const hints: Array<{ factIdA: string; factIdB: string }> = [];

    for (const [left, right] of pairs) {
      if (!looksLikeRepublishedRelease(left, right)) {
        continue;
      }

      const ordered = orderedFactPair(left.fact.id, right.fact.id);
      hints.push(ordered);
    }

    return hints;
  }

  private applyRepublishOverrides(
    items: LlmVerificationItem[],
    knownFactIds: Set<string>,
    republishHints: Array<{ factIdA: string; factIdB: string }>,
  ): LlmVerificationItem[] {
    const republishFactIds = new Set<string>();

    for (const hint of republishHints) {
      republishFactIds.add(hint.factIdA);
      republishFactIds.add(hint.factIdB);
    }

    const adjusted: LlmVerificationItem[] = [];

    for (const item of items) {
      if (!knownFactIds.has(item.factId)) {
        continue;
      }

      if (
        republishFactIds.has(item.factId) &&
        item.sourceIndependence === 'independent'
      ) {
        adjusted.push({
          factId: item.factId,
          verificationStatus:
            item.verificationStatus === 'confirmed'
              ? 'partially_confirmed'
              : item.verificationStatus,
          sourceQuality: item.sourceQuality,
          sourceIndependence: 'republished_same_release',
          evidenceDirectness: item.evidenceDirectness,
          comparisonSummary: item.comparisonSummary,
          comparedFactIds: item.comparedFactIds,
          citedPrimarySources: item.citedPrimarySources,
          contentAgreement: item.contentAgreement,
          partialAgreement: item.partialAgreement,
          contradictionFound: item.contradictionFound,
          countsAsIndependentEvidence: false,
        });
        continue;
      }

      if (item.sourceIndependence === 'republished_same_release') {
        adjusted.push({
          factId: item.factId,
          verificationStatus: item.verificationStatus,
          sourceQuality: item.sourceQuality,
          sourceIndependence: item.sourceIndependence,
          evidenceDirectness: item.evidenceDirectness,
          comparisonSummary: item.comparisonSummary,
          comparedFactIds: item.comparedFactIds,
          citedPrimarySources: item.citedPrimarySources,
          contentAgreement: item.contentAgreement,
          partialAgreement: item.partialAgreement,
          contradictionFound: item.contradictionFound,
          countsAsIndependentEvidence: false,
        });
        continue;
      }

      adjusted.push(item);
    }

    return adjusted;
  }

  private async persistVerifications(
    analysisRunId: string,
    items: LlmVerificationItem[],
    knownFactIds: Set<string>,
  ): Promise<FactVerificationEntity[]> {
    const analyzedAt = new Date();
    const saved: FactVerificationEntity[] = [];

    for (const item of items) {
      if (!knownFactIds.has(item.factId)) {
        continue;
      }

      const entity = this.verifications.create({
        factId: item.factId,
        analysisRunId,
        verificationStatus: item.verificationStatus,
        sourceQuality: item.sourceQuality,
        sourceIndependence: item.sourceIndependence,
        evidenceDirectness: item.evidenceDirectness,
        comparisonSummary: item.comparisonSummary,
        comparedFactIds: item.comparedFactIds,
        citedPrimarySources: item.citedPrimarySources,
        contentAgreement: item.contentAgreement,
        partialAgreement: item.partialAgreement,
        contradictionFound: item.contradictionFound,
        countsAsIndependentEvidence: item.countsAsIndependentEvidence,
        analyzedAt,
      });

      saved.push(await this.verifications.save(entity));
    }

    return saved;
  }

  private async persistRelations(
    analysisRunId: string,
    items: LlmRelationItem[],
  ): Promise<FactRelationEntity[]> {
    const analyzedAt = new Date();
    const saved: FactRelationEntity[] = [];

    for (const item of items) {
      const ordered = orderedFactPair(item.factIdA, item.factIdB);
      const entity = this.relations.create({
        analysisRunId,
        relationType: item.relationType,
        factIdA: ordered.factIdA,
        factIdB: ordered.factIdB,
        description: item.description,
        rationale: item.rationale,
        sourceRefs: item.sourceRefs,
        isDirectlyConfirmed: item.isDirectlyConfirmed,
        isInferred: item.isInferred,
        uncertainty: item.uncertainty,
        alternativeExplanations: item.alternativeExplanations,
        analyzedAt,
      });

      saved.push(await this.relations.save(entity));
    }

    return saved;
  }
}
