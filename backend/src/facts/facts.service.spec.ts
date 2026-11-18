import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { FailureFileLogger } from '../common/logging/failure-file.logger';
import {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { ExtractedFactEntity } from './entities/extracted-fact.entity';
import { FactExtractionRunEntity } from './entities/fact-extraction-run.entity';
import { FactsService } from './facts.service';

class FakeLlmProvider implements LlmProvider {
  constructor(private readonly content: string) {}

  complete(_request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    return Promise.resolve({
      content: this.content,
      model: 'fake-model',
    });
  }
}

function createArticle(): NewsArticleEntity {
  const article = new NewsArticleEntity();
  article.id = 'article-1';
  article.url = 'https://example.com/news/1';
  article.normalizedUrl = 'https://example.com/news/1';
  article.articleKey = null;
  article.title = '삼성전자 투자 계획 발표';
  article.titleHash = 't';
  article.publisher = '테스트언론';
  article.identityHash = null;
  article.category = '경제';
  article.source = 'naver';
  article.summary = null;
  article.listPublishedAt = null;
  article.collectedAt = new Date();
  article.crawlStatus = 'success';
  article.crawlAttempts = 1;
  article.nextRetryAt = null;
  article.crawledAt = new Date();
  article.body =
    '삼성전자는 투자 계획을 발표했다. 업계에서는 투자가 이뤄질 전망이라고 분석했다.';
  article.bodyLength = article.body.length;
  article.bodyHash = 'body-hash-1';
  article.bodyStorageMode = 'full';
  article.bodyExtracted = true;
  article.isDuplicate = false;
  article.duplicateOfId = null;
  article.author = null;
  article.publishedAt = null;
  article.modifiedAt = null;
  article.lastError = null;
  article.lastErrorCode = null;
  article.createdAt = new Date();
  article.updatedAt = new Date();

  return article;
}

function createRepos(
  article: NewsArticleEntity,
  llmContent: string,
): FactsService {
  const articles = {
    findOne: () => Promise.resolve(article),
  } as unknown as Repository<NewsArticleEntity>;

  const savedFacts: ExtractedFactEntity[] = [];
  const savedRuns: FactExtractionRunEntity[] = [];

  const facts = {
    find: (options: { where: { extractionRunId?: string; articleId?: string } }) => {
      const filtered: ExtractedFactEntity[] = [];

      for (const fact of savedFacts) {
        if (
          options.where.extractionRunId !== undefined &&
          fact.extractionRunId === options.where.extractionRunId
        ) {
          filtered.push(fact);
        } else if (
          options.where.articleId !== undefined &&
          fact.articleId === options.where.articleId
        ) {
          filtered.push(fact);
        }
      }

      return Promise.resolve(filtered);
    },
    create: (input: Partial<ExtractedFactEntity>) => {
      const entity = new ExtractedFactEntity();
      Object.assign(entity, input);
      entity.id = `fact-${savedFacts.length + 1}`;
      return entity;
    },
    save: (entity: ExtractedFactEntity) => {
      savedFacts.push(entity);
      return Promise.resolve(entity);
    },
    delete: () => {
      savedFacts.length = 0;
      return Promise.resolve({ affected: 0, raw: [] });
    },
    findOne: () => Promise.resolve(null),
  } as unknown as Repository<ExtractedFactEntity>;

  const runs = {
    findOne: (options: {
      where: { status?: string; articleId?: string; bodyHash?: string };
    }) => {
      for (const run of savedRuns) {
        if (
          options.where.status === 'completed' &&
          run.status === 'completed' &&
          run.articleId === options.where.articleId &&
          run.bodyHash === options.where.bodyHash
        ) {
          return Promise.resolve(run);
        }

        if (
          options.where.status === 'running' &&
          run.status === 'running' &&
          run.articleId === options.where.articleId
        ) {
          return Promise.resolve(run);
        }
      }

      return Promise.resolve(null);
    },
    create: (input: Partial<FactExtractionRunEntity>) => {
      const entity = new FactExtractionRunEntity();
      Object.assign(entity, input);
      entity.id = `run-${savedRuns.length + 1}`;
      return entity;
    },
    save: (entity: FactExtractionRunEntity) => {
      const existingIndex = savedRuns.findIndex((item) => item.id === entity.id);

      if (existingIndex >= 0) {
        savedRuns[existingIndex] = entity;
      } else {
        savedRuns.push(entity);
      }

      return Promise.resolve(entity);
    },
  } as unknown as Repository<FactExtractionRunEntity>;

  const failureLogger = {
    append: () => Promise.resolve(),
    readRecent: () => Promise.resolve([]),
  } as unknown as FailureFileLogger;

  return new FactsService(
    articles,
    facts,
    runs,
    new FakeLlmProvider(llmContent),
    failureLogger,
    new ConfigService({
      llm: {
        temperature: 0,
        maxBodyChars: 12000,
        unmatchedEvidenceMode: 'review',
      },
    }),
  );
}

describe('FactsService', () => {
  const llmPayload = JSON.stringify({
    facts: [
      {
        normalizedStatement: '삼성전자가 투자 계획을 발표했다',
        originalExpression: '삼성전자는 투자 계획을 발표했다',
        entities: ['삼성전자'],
        eventType: 'investment_contract',
        occurredAt: '2026-11-17',
        quantity: null,
        evidenceSentence: '삼성전자는 투자 계획을 발표했다.',
        factType: 'official_announcement',
      },
      {
        normalizedStatement: '투자가 실행될 것이라는 전망이 있다',
        originalExpression: '투자가 이뤄질 전망이다',
        entities: ['삼성전자'],
        eventType: 'investment_contract',
        occurredAt: null,
        quantity: null,
        evidenceSentence: '업계에서는 투자가 이뤄질 전망이라고 분석했다.',
        factType: 'forecast_prediction',
      },
      {
        normalizedStatement: '원문에 없는 내용',
        originalExpression: '없는 문장',
        entities: ['유령'],
        eventType: 'other_verifiable_claim',
        occurredAt: null,
        quantity: null,
        evidenceSentence: '이 문장은 기사에 없다.',
        factType: 'verifiable_event',
      },
    ],
  });

  it('stores announcement and forecast separately with evidence links', async () => {
    const service = createRepos(createArticle(), llmPayload);
    const result = await service.extractForArticle('article-1', false);

    expect(result.reusedExisting).toBe(false);
    expect(result.run.status).toBe('completed');
    expect(result.facts).toHaveLength(3);
    expect(result.run.acceptedCount).toBe(2);
    expect(result.run.reviewCount).toBe(1);

    const announcement = result.facts[0];
    const forecast = result.facts[1];
    const review = result.facts[2];

    expect(announcement?.factType).toBe('official_announcement');
    expect(announcement?.isClaim).toBe(false);
    expect(announcement?.evidenceMatched).toBe(true);
    expect(announcement?.sourceUrl).toBe('https://example.com/news/1');

    expect(forecast?.factType).toBe('forecast_prediction');
    expect(forecast?.isClaim).toBe(true);
    expect(forecast?.evidenceMatched).toBe(true);

    expect(review?.reviewStatus).toBe('needs_review');
    expect(review?.evidenceMatched).toBe(false);
  });

  it('does not duplicate extraction for the same article body', async () => {
    const service = createRepos(createArticle(), llmPayload);
    const first = await service.extractForArticle('article-1', false);
    const second = await service.extractForArticle('article-1', false);

    expect(first.reusedExisting).toBe(false);
    expect(second.reusedExisting).toBe(true);
    expect(second.run.id).toBe(first.run.id);
  });
});
