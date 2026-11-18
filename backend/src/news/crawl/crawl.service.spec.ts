import { ConfigService } from '@nestjs/config';
import { ActivityFileLogger } from '../../common/logging/activity-file.logger';
import { FailureFileLogger } from '../../common/logging/failure-file.logger';
import { ArticleCrawlStore } from '../articles/article-crawl.store';
import { CrawlStatus } from '../constants/crawl-status';
import { NewsArticleEntity } from '../entities/news-article.entity';
import { HtmlFetcher, HtmlFetchResult } from '../http/html-fetcher';
import { CrawlService } from './crawl.service';
import { BodyExtractorRunner } from './extractors/body-extractor.runner';
import {
  BodyExtractionResult,
  ExtractedArticleBody,
} from './extractors/extraction-types';

const fakeActivityLogger = {
  info: () => Promise.resolve(),
  warn: () => Promise.resolve(),
  error: () => Promise.resolve(),
} as unknown as ActivityFileLogger;

const fakeFailureLogger = {
  append: () => Promise.resolve(),
  readRecent: () => Promise.resolve([]),
} as unknown as FailureFileLogger;

class FakeHtmlFetcher extends HtmlFetcher {
  constructor(private readonly result: HtmlFetchResult) {
    super(
      new ConfigService({
        news: { httpTimeoutMs: 1000, userAgent: 'test' },
      }),
    );
  }

  fetchHtml(): Promise<HtmlFetchResult> {
    return Promise.resolve(this.result);
  }
}

class FakeBodyExtractorRunner implements BodyExtractorRunner {
  constructor(private readonly result: BodyExtractionResult) {}

  extract(): BodyExtractionResult {
    return this.result;
  }
}

class FakeArticleCrawlStore implements ArticleCrawlStore {
  constructor(private article: NewsArticleEntity) {}

  findCrawlCandidates(): Promise<NewsArticleEntity[]> {
    return Promise.resolve([this.article]);
  }

  findById(): Promise<NewsArticleEntity> {
    return Promise.resolve(this.article);
  }

  markCrawling(): Promise<void> {
    this.article.crawlStatus = 'crawling';

    return Promise.resolve();
  }

  markSuccess(article: NewsArticleEntity): Promise<NewsArticleEntity> {
    article.crawlStatus = 'success';
    article.bodyExtracted = true;

    return Promise.resolve(article);
  }

  markFailure(article: NewsArticleEntity): Promise<NewsArticleEntity> {
    article.crawlStatus = 'retry_waiting';
    article.crawlAttempts += 1;

    return Promise.resolve(article);
  }

  findMany(): Promise<NewsArticleEntity[]> {
    return Promise.resolve([this.article]);
  }

  countByCrawlStatus(): Promise<Record<CrawlStatus, number>> {
    return Promise.resolve({
      pending: 0,
      crawling: 0,
      success: 1,
      failed: 0,
      retry_waiting: 0,
      inaccessible: 0,
    });
  }
}

function createArticle(): NewsArticleEntity {
  const article = new NewsArticleEntity();
  article.id = 'a1';
  article.url = 'https://n.news.naver.com/mnews/article/001/1';
  article.normalizedUrl = 'https://n.news.naver.com/mnews/article/001/1';
  article.articleKey = 'naver:001:1';
  article.title = '제목';
  article.titleHash = 'hash';
  article.publisher = '연합뉴스';
  article.identityHash = null;
  article.category = '정치';
  article.source = 'naver';
  article.summary = null;
  article.listPublishedAt = null;
  article.collectedAt = new Date();
  article.crawlStatus = 'pending';
  article.crawlAttempts = 0;
  article.nextRetryAt = null;
  article.crawledAt = null;
  article.body = null;
  article.bodyLength = null;
  article.bodyHash = null;
  article.bodyStorageMode = 'full';
  article.bodyExtracted = false;
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

describe('CrawlService', () => {
  it('marks articles success after extraction', async () => {
    const article = createArticle();
    const extracted: ExtractedArticleBody = {
      title: '본문 제목',
      body: '본문 내용입니다. '.repeat(20),
      author: null,
      publisher: '연합뉴스',
      publishedAt: null,
      modifiedAt: null,
      canonicalUrl: article.url,
    };

    const service = new CrawlService(
      new FakeArticleCrawlStore(article),
      new FakeHtmlFetcher({
        status: 'success',
        url: article.url,
        body: '<html></html>',
        finalUrl: article.url,
        statusCode: 200,
      }),
      new FakeBodyExtractorRunner({
        status: 'success',
        data: extracted,
      }),
      fakeActivityLogger,
      fakeFailureLogger,
      {
        resolve: async (url: string) => url,
      } as never,
      new ConfigService({
        news: {
          crawlConcurrency: 1,
          crawlIntervalMs: 0,
          crawlMaxAttempts: 3,
          crawlRetryDelayMs: 1000,
        },
      }),
    );

    const result = await service.runBatch(1);

    expect(result.succeeded).toBe(1);
    expect(result.articles[0]?.crawlStatus).toBe('success');
  });

  it('marks retry waiting when extraction fails', async () => {
    const article = createArticle();

    const service = new CrawlService(
      new FakeArticleCrawlStore(article),
      new FakeHtmlFetcher({
        status: 'success',
        url: article.url,
        body: '<html></html>',
        finalUrl: article.url,
        statusCode: 200,
      }),
      new FakeBodyExtractorRunner({
        status: 'failure',
        errorCode: 'INVALID_BODY',
        message: 'too short',
      }),
      fakeActivityLogger,
      fakeFailureLogger,
      {
        resolve: async (url: string) => url,
      } as never,
      new ConfigService({
        news: {
          crawlConcurrency: 1,
          crawlIntervalMs: 0,
          crawlMaxAttempts: 3,
          crawlRetryDelayMs: 1000,
        },
      }),
    );

    const result = await service.runBatch(1);

    expect(result.retryWaiting).toBe(1);
    expect(result.articles[0]?.crawlAttempts).toBe(1);
  });
});
