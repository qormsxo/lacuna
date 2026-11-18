import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityFileLogger } from '../../common/logging/activity-file.logger';
import { FailureFileLogger } from '../../common/logging/failure-file.logger';
import { ARTICLE_CRAWL_STORE } from '../articles/article-crawl.store';
import type { ArticleCrawlStore } from '../articles/article-crawl.store';
import { NewsArticleEntity } from '../entities/news-article.entity';
import { HtmlFetcher } from '../http/html-fetcher';
import { isGoogleNewsWrapperUrl } from '../utils/google-news-url';
import { GoogleNewsUrlResolver } from '../utils/google-news-url-resolver';
import { BODY_EXTRACTOR_RUNNER } from './extractors/body-extractor.runner';
import type { BodyExtractorRunner } from './extractors/body-extractor.runner';

export type CrawlRunResult = {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  inaccessible: number;
  retryWaiting: number;
  articles: NewsArticleEntity[];
};

@Injectable()
export class CrawlService {
  private readonly logger = new Logger(CrawlService.name);
  private readonly concurrency: number;
  private readonly intervalMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private running = false;

  constructor(
    @Inject(ARTICLE_CRAWL_STORE)
    private readonly articleStore: ArticleCrawlStore,
    private readonly htmlFetcher: HtmlFetcher,
    @Inject(BODY_EXTRACTOR_RUNNER)
    private readonly bodyExtractorRunner: BodyExtractorRunner,
    private readonly activityFileLogger: ActivityFileLogger,
    private readonly failureFileLogger: FailureFileLogger,
    private readonly googleNewsUrlResolver: GoogleNewsUrlResolver,
    configService: ConfigService,
  ) {
    this.concurrency = configService.get<number>('news.crawlConcurrency') ?? 2;
    this.intervalMs = configService.get<number>('news.crawlIntervalMs') ?? 1000;
    this.maxAttempts = configService.get<number>('news.crawlMaxAttempts') ?? 3;
    this.retryDelayMs =
      configService.get<number>('news.crawlRetryDelayMs') ?? 60000;
  }

  async runBatch(
    limit: number,
    source?: string,
    options?: { force?: boolean; category?: string },
  ): Promise<CrawlRunResult> {
    if (this.running) {
      this.logger.warn('Crawl batch skipped because another run is active');
      await this.activityFileLogger.warn('crawl', 'Crawl batch skipped: already running', {
        limit,
        source: source ?? null,
        category: options?.category ?? null,
      });

      return {
        requested: limit,
        processed: 0,
        succeeded: 0,
        failed: 0,
        inaccessible: 0,
        retryWaiting: 0,
        articles: [],
      };
    }

    this.running = true;

    try {
      const force = options?.force === true;
      const category = options?.category;
      this.logger.log(
        `Crawl batch start limit=${limit} source=${source ?? 'all'} category=${category ?? 'all'} force=${force}`,
      );
      await this.activityFileLogger.info('crawl', 'Crawl batch start', {
        limit,
        source: source ?? null,
        category: category ?? null,
        force,
      });

      const candidates = await this.articleStore.findCrawlCandidates(
        limit,
        source,
        { force, category },
      );
      const ids: string[] = [];

      for (const candidate of candidates) {
        ids.push(candidate.id);
      }

      await this.articleStore.markCrawling(ids);

      const refreshed: NewsArticleEntity[] = [];

      for (const candidate of candidates) {
        const current = await this.articleStore.findById(candidate.id);

        if (current !== null && current.crawlStatus === 'crawling') {
          refreshed.push(current);
        }
      }

      const processed = await this.processWithLimits(refreshed);
      const summary = this.summarize(limit, processed);

      this.logger.log(
        `Crawl batch done processed=${summary.processed} succeeded=${summary.succeeded} failed=${summary.failed} inaccessible=${summary.inaccessible} retryWaiting=${summary.retryWaiting}`,
      );
      await this.activityFileLogger.info('crawl', 'Crawl batch done', {
        source: source ?? null,
        requested: summary.requested,
        processed: summary.processed,
        succeeded: summary.succeeded,
        failed: summary.failed,
        inaccessible: summary.inaccessible,
        retryWaiting: summary.retryWaiting,
      });

      return summary;
    } finally {
      this.running = false;
    }
  }

  async crawlOne(article: NewsArticleEntity): Promise<NewsArticleEntity> {
    let resolvedUrl = article.url;

    if (isGoogleNewsWrapperUrl(article.url)) {
      const resolved = await this.googleNewsUrlResolver.resolve(article.url);

      if (resolved === null || isGoogleNewsWrapperUrl(resolved)) {
        const message =
          'Google News wrapper URL could not be resolved to a publisher page';
        this.logger.warn(
          `Crawl skipped unresolved Google wrapper for ${article.url}`,
        );
        await this.activityFileLogger.warn('crawl', message, {
          articleId: article.id,
          source: article.source,
          url: article.url,
          errorCode: 'ACCESS_DENIED',
        });
        await this.failureFileLogger.append({
          kind: 'crawl',
          retryable: true,
          errorCode: 'ACCESS_DENIED',
          message,
          source: article.source,
          stage: 'crawl',
          articleId: article.id,
          details: { url: article.url },
        });

        return this.articleStore.markFailure(article, {
          errorCode: 'ACCESS_DENIED',
          message,
          inaccessible: false,
          maxAttempts: this.maxAttempts,
          retryDelayMs: Math.max(this.retryDelayMs, 5 * 60_000),
        });
      }

      resolvedUrl = resolved;
      article.url = resolved;
      this.logger.log(
        `Resolved Google wrapper to publisher URL for article ${article.id}`,
      );
      await this.activityFileLogger.info('crawl', 'Resolved Google wrapper URL', {
        articleId: article.id,
        source: article.source,
        url: resolvedUrl,
      });
    }

    const fetched = await this.htmlFetcher.fetchHtml(resolvedUrl);

    if (fetched.status === 'failure') {
      const rateLimited = fetched.message.includes('429');
      const inaccessible =
        fetched.errorCode === 'ACCESS_DENIED' && !rateLimited;

      this.logger.warn(
        `Crawl fetch failed for ${resolvedUrl}: ${fetched.errorCode} ${fetched.message}`,
      );
      await this.activityFileLogger.warn('crawl', 'Crawl fetch failed', {
        articleId: article.id,
        source: article.source,
        url: resolvedUrl,
        errorCode: fetched.errorCode,
        message: fetched.message,
        rateLimited,
      });
      await this.failureFileLogger.append({
        kind: 'crawl',
        retryable: !inaccessible,
        errorCode: fetched.errorCode,
        message: fetched.message,
        source: article.source,
        stage: 'crawl_fetch',
        articleId: article.id,
        details: { url: resolvedUrl, rateLimited },
      });

      return this.articleStore.markFailure(article, {
        errorCode: fetched.errorCode,
        message: fetched.message,
        inaccessible,
        maxAttempts: this.maxAttempts,
        retryDelayMs: rateLimited
          ? Math.max(this.retryDelayMs, 5 * 60_000)
          : this.retryDelayMs,
      });
    }

    const pageUrl = fetched.finalUrl;

    const extracted = this.bodyExtractorRunner.extract(
      fetched.body,
      pageUrl,
      article.source,
    );

    if (extracted.status === 'failure') {
      const inaccessible = extracted.errorCode === 'ACCESS_DENIED';

      this.logger.warn(
        `Crawl extract failed for ${article.url}: ${extracted.errorCode} ${extracted.message}`,
      );
      await this.activityFileLogger.warn('crawl', 'Crawl extract failed', {
        articleId: article.id,
        source: article.source,
        url: article.url,
        pageUrl,
        errorCode: extracted.errorCode,
        message: extracted.message,
      });
      await this.failureFileLogger.append({
        kind: 'crawl',
        retryable: !inaccessible,
        errorCode: extracted.errorCode,
        message: extracted.message,
        source: article.source,
        stage: 'crawl_extract',
        articleId: article.id,
        details: { url: article.url, pageUrl },
      });

      return this.articleStore.markFailure(article, {
        errorCode: extracted.errorCode,
        message: extracted.message,
        inaccessible,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs,
      });
    }

    this.logger.log(
      `Crawl success article=${article.id} source=${article.source} url=${pageUrl}`,
    );
    await this.activityFileLogger.info('crawl', 'Crawl success', {
      articleId: article.id,
      source: article.source,
      url: pageUrl,
      title: extracted.data.title,
      bodyLength: extracted.data.body.length,
    });

    return this.articleStore.markSuccess(article, extracted.data);
  }

  private async processWithLimits(
    articles: NewsArticleEntity[],
  ): Promise<NewsArticleEntity[]> {
    if (articles.length === 0) {
      return [];
    }

    const results: Array<NewsArticleEntity | undefined> = Array.from({
      length: articles.length,
    });

    let nextIndex = 0;
    const workerCount = Math.min(this.concurrency, articles.length);
    const workers: Array<Promise<void>> = [];

    for (let workerId = 0; workerId < workerCount; workerId += 1) {
      workers.push(
        (async () => {
          while (nextIndex < articles.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;

            const article = articles[currentIndex];

            if (article === undefined) {
              continue;
            }

            if (currentIndex > 0) {
              await this.delay(this.intervalMs);
            }

            results[currentIndex] = await this.crawlOne(article);
          }
        })(),
      );
    }

    await Promise.all(workers);

    const completed: NewsArticleEntity[] = [];

    for (const item of results) {
      if (item !== undefined) {
        completed.push(item);
      }
    }

    return completed;
  }

  private summarize(
    requested: number,
    articles: NewsArticleEntity[],
  ): CrawlRunResult {
    let succeeded = 0;
    let failed = 0;
    let inaccessible = 0;
    let retryWaiting = 0;

    for (const article of articles) {
      if (article.crawlStatus === 'success') {
        succeeded += 1;
      } else if (article.crawlStatus === 'failed') {
        failed += 1;
      } else if (article.crawlStatus === 'inaccessible') {
        inaccessible += 1;
      } else if (article.crawlStatus === 'retry_waiting') {
        retryWaiting += 1;
      }
    }

    return {
      requested,
      processed: articles.length,
      succeeded,
      failed,
      inaccessible,
      retryWaiting,
      articles,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
