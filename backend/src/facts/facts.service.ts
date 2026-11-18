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
import { Repository } from 'typeorm';
import { FailureFileLogger } from '../common/logging/failure-file.logger';
import { classifyLlmError } from '../common/logging/llm-error.util';
import { LLM_PROVIDER } from '../llm/llm-provider';
import type { LlmProvider } from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { isClaimFactType } from './constants/fact-types';
import { matchEvidenceSentence } from './evidence/evidence-matcher';
import { ExtractedFactEntity } from './entities/extracted-fact.entity';
import { FactExtractionRunEntity } from './entities/fact-extraction-run.entity';
import {
  buildFactExtractionSystemPrompt,
  buildFactExtractionUserPrompt,
} from './prompts/fact-extraction.prompt';
import { LlmFactItem } from './schema/llm-fact-response';
import { parseLlmFactResponseJson } from './schema/llm-fact-response.validator';

export type FactExtractionServiceResult = {
  run: FactExtractionRunEntity;
  facts: ExtractedFactEntity[];
  reusedExisting: boolean;
};

@Injectable()
export class FactsService {
  private readonly logger = new Logger(FactsService.name);
  private readonly temperature: number;
  private readonly maxBodyChars: number;
  private readonly unmatchedEvidenceMode: 'review' | 'exclude';

  constructor(
    @InjectRepository(NewsArticleEntity)
    private readonly articles: Repository<NewsArticleEntity>,
    @InjectRepository(ExtractedFactEntity)
    private readonly facts: Repository<ExtractedFactEntity>,
    @InjectRepository(FactExtractionRunEntity)
    private readonly runs: Repository<FactExtractionRunEntity>,
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
    private readonly failureFileLogger: FailureFileLogger,
    configService: ConfigService,
  ) {
    this.temperature = configService.get<number>('llm.temperature') ?? 0;
    this.maxBodyChars =
      configService.get<number>('llm.maxBodyChars') ?? 12000;
    this.unmatchedEvidenceMode =
      configService.get<string>('llm.unmatchedEvidenceMode') === 'exclude'
        ? 'exclude'
        : 'review';
  }

  async extractForArticle(
    articleId: string,
    force: boolean,
  ): Promise<FactExtractionServiceResult> {
    const article = await this.articles.findOne({ where: { id: articleId } });

    if (article === null) {
      throw new NotFoundException(`Article not found: ${articleId}`);
    }

    if (article.crawlStatus !== 'success' || article.body === null) {
      throw new BadRequestException(
        'Article body is not available. Crawl the article successfully first.',
      );
    }

    const bodyHash =
      article.bodyHash ??
      createHash('sha256').update(article.body).digest('hex');

    if (!force) {
      const existing = await this.findCompletedRun(articleId, bodyHash);

      if (existing !== null) {
        const facts = await this.facts.find({
          where: { extractionRunId: existing.id },
          order: { extractedAt: 'ASC' },
        });

        return {
          run: existing,
          facts,
          reusedExisting: true,
        };
      }
    }

    const running = await this.runs.findOne({
      where: { articleId, status: 'running' },
    });

    if (running !== null) {
      throw new BadRequestException(
        'Fact extraction is already running for this article',
      );
    }

    const run = await this.runs.save(
      this.runs.create({
        articleId,
        bodyHash,
        status: 'running',
        model: null,
        acceptedCount: 0,
        reviewCount: 0,
        excludedCount: 0,
        errorMessage: null,
        startedAt: new Date(),
        finishedAt: null,
      }),
    );

    try {
      const bodyForPrompt = article.body.slice(0, this.maxBodyChars);
      const completion = await this.llmProvider.complete({
        messages: [
          {
            role: 'system',
            content: buildFactExtractionSystemPrompt(),
          },
          {
            role: 'user',
            content: buildFactExtractionUserPrompt(
              article.title,
              article.url,
              bodyForPrompt,
            ),
          },
        ],
        temperature: this.temperature,
        jsonMode: true,
        context: {
          stage: 'fact_extraction',
          articleId,
        },
      });

      const parsed = parseLlmFactResponseJson(completion.content);

      if (!parsed.ok) {
        throw new Error(`LLM schema validation failed: ${parsed.message}`);
      }

      if (force) {
        await this.facts.delete({ articleId });
      }

      const persisted = await this.persistFacts(
        article,
        run.id,
        parsed.data.facts,
        bodyForPrompt,
      );

      run.status = 'completed';
      run.model = completion.model;
      run.acceptedCount = persisted.acceptedCount;
      run.reviewCount = persisted.reviewCount;
      run.excludedCount = persisted.excludedCount;
      run.finishedAt = new Date();
      run.errorMessage = null;
      await this.runs.save(run);

      return {
        run,
        facts: persisted.facts,
        reusedExisting: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Fact extraction failed';
      const classified = classifyLlmError(message);

      run.status = 'failed';
      run.errorMessage = message;
      run.finishedAt = new Date();
      await this.runs.save(run);

      if (classified.errorCode === 'SCHEMA') {
        await this.failureFileLogger.append({
          kind: 'llm',
          retryable: false,
          errorCode: classified.errorCode,
          message,
          stage: 'fact_extraction',
          articleId,
        });
      }

      this.logger.error(`Fact extraction failed for ${articleId}: ${message}`);
      throw new BadRequestException(message);
    }
  }

  async findArticlesPendingExtraction(
    limit: number,
    category?: string,
  ): Promise<NewsArticleEntity[]> {
    const query = this.articles
      .createQueryBuilder('article')
      .where('article.crawlStatus = :status', { status: 'success' })
      .andWhere('article.body IS NOT NULL')
      .andWhere('article.bodyHash IS NOT NULL')
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM fact_extraction_runs run
          WHERE run."articleId" = article.id
            AND run."bodyHash" = article."bodyHash"
            AND run.status = 'completed'
        )`,
      );

    if (category !== undefined) {
      query.andWhere('article.category = :category', { category });
    }

    return query.orderBy('article.crawledAt', 'DESC').take(limit).getMany();
  }

  async extractPendingBatch(
    limit: number,
    category?: string,
  ): Promise<{
    attempted: number;
    articleIds: string[];
    extracted: number;
    failed: number;
    results: FactExtractionServiceResult[];
  }> {
    const candidates = await this.findArticlesPendingExtraction(limit, category);
    const results: FactExtractionServiceResult[] = [];
    const articleIds: string[] = [];
    let extracted = 0;
    let failed = 0;

    this.logger.log(
      `Fact extract pending batch start limit=${limit} category=${category ?? 'all'} candidates=${candidates.length}`,
    );

    for (const article of candidates) {
      articleIds.push(article.id);

      try {
        const result = await this.extractForArticle(article.id, false);
        extracted += 1;
        results.push(result);
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `Pending extraction failed for ${article.id}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    this.logger.log(
      `Fact extract pending batch done attempted=${articleIds.length} extracted=${extracted} failed=${failed}`,
    );

    return {
      attempted: articleIds.length,
      articleIds,
      extracted,
      failed,
      results,
    };
  }

  async retryFailedExtractions(limit = 10): Promise<{
    attempted: number;
    articleIds: string[];
    results: FactExtractionServiceResult[];
  }> {
    const fromLog = await this.failureFileLogger.readRecent('llm', limit * 4);
    const articleIds: string[] = [];
    const seen = new Set<string>();

    for (const entry of fromLog) {
      if (
        !entry.retryable ||
        entry.stage !== 'fact_extraction' ||
        entry.articleId === undefined
      ) {
        continue;
      }

      if (seen.has(entry.articleId)) {
        continue;
      }

      seen.add(entry.articleId);
      articleIds.push(entry.articleId);

      if (articleIds.length >= limit) {
        break;
      }
    }

    if (articleIds.length < limit) {
      const failedRuns = await this.runs.find({
        where: { status: 'failed' },
        order: { finishedAt: 'DESC' },
        take: limit * 2,
      });

      for (const run of failedRuns) {
        if (articleIds.length >= limit) {
          break;
        }

        if (seen.has(run.articleId)) {
          continue;
        }

        const classified = classifyLlmError(run.errorMessage ?? '');
        if (!classified.retryable) {
          continue;
        }

        seen.add(run.articleId);
        articleIds.push(run.articleId);
      }
    }

    const results: FactExtractionServiceResult[] = [];

    for (const articleId of articleIds) {
      try {
        results.push(await this.extractForArticle(articleId, true));
      } catch (error) {
        this.logger.warn(
          `Retry extraction skipped/failed for ${articleId}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    return {
      attempted: articleIds.length,
      articleIds,
      results,
    };
  }

  async listByArticle(articleId: string): Promise<ExtractedFactEntity[]> {
    const article = await this.articles.findOne({ where: { id: articleId } });

    if (article === null) {
      throw new NotFoundException(`Article not found: ${articleId}`);
    }

    return this.facts.find({
      where: { articleId },
      order: { extractedAt: 'ASC' },
    });
  }

  async getFact(id: string): Promise<ExtractedFactEntity> {
    const fact = await this.facts.findOne({ where: { id } });

    if (fact === null) {
      throw new NotFoundException(`Fact not found: ${id}`);
    }

    return fact;
  }

  listRecent(limit: number): Promise<ExtractedFactEntity[]> {
    return this.facts.find({
      order: { extractedAt: 'DESC' },
      take: limit,
    });
  }

  async countFacts(): Promise<{ total: number; accepted: number; needsReview: number }> {
    const total = await this.facts.count();
    const accepted = await this.facts.count({
      where: { reviewStatus: 'accepted' },
    });
    const needsReview = await this.facts.count({
      where: { reviewStatus: 'needs_review' },
    });

    return { total, accepted, needsReview };
  }


  private findCompletedRun(
    articleId: string,
    bodyHash: string,
  ): Promise<FactExtractionRunEntity | null> {
    return this.runs.findOne({
      where: {
        articleId,
        bodyHash,
        status: 'completed',
      },
      order: { finishedAt: 'DESC' },
    });
  }

  private async persistFacts(
    article: NewsArticleEntity,
    extractionRunId: string,
    items: LlmFactItem[],
    articleBody: string,
  ): Promise<{
    facts: ExtractedFactEntity[];
    acceptedCount: number;
    reviewCount: number;
    excludedCount: number;
  }> {
    const extractedAt = new Date();
    const saved: ExtractedFactEntity[] = [];
    let acceptedCount = 0;
    let reviewCount = 0;
    let excludedCount = 0;

    for (const item of items) {
      const evidence = matchEvidenceSentence(
        articleBody,
        item.evidenceSentence,
      );

      if (!evidence.matched) {
        if (
          evidence.reason === 'empty' ||
          this.unmatchedEvidenceMode === 'exclude'
        ) {
          excludedCount += 1;
          continue;
        }

        const reviewFact = this.facts.create({
          articleId: article.id,
          extractionRunId,
          normalizedStatement: item.normalizedStatement,
          originalExpression: item.originalExpression,
          entities: item.entities,
          eventType: item.eventType,
          occurredAt: item.occurredAt,
          quantityValue: item.quantity?.value ?? null,
          quantityUnit: item.quantity?.unit ?? null,
          sourceUrl: article.url,
          evidenceSentence: item.evidenceSentence,
          evidenceMatched: false,
          factType: item.factType,
          isClaim: isClaimFactType(item.factType),
          reviewStatus: 'needs_review',
          extractedAt,
        });

        saved.push(await this.facts.save(reviewFact));
        reviewCount += 1;
        continue;
      }

      const accepted = this.facts.create({
        articleId: article.id,
        extractionRunId,
        normalizedStatement: item.normalizedStatement,
        originalExpression: item.originalExpression,
        entities: item.entities,
        eventType: item.eventType,
        occurredAt: item.occurredAt,
        quantityValue: item.quantity?.value ?? null,
        quantityUnit: item.quantity?.unit ?? null,
        sourceUrl: article.url,
        evidenceSentence: evidence.normalizedEvidence,
        evidenceMatched: true,
        factType: item.factType,
        isClaim: isClaimFactType(item.factType),
        reviewStatus: 'accepted',
        extractedAt,
      });

      saved.push(await this.facts.save(accepted));
      acceptedCount += 1;
    }

    return {
      facts: saved,
      acceptedCount,
      reviewCount,
      excludedCount,
    };
  }
}
