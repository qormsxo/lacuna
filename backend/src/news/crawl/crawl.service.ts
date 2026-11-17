import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ARTICLE_CRAWL_STORE } from '../articles/article-crawl.store';
import type { ArticleCrawlStore } from '../articles/article-crawl.store';
import { NewsArticleEntity } from '../entities/news-article.entity';
import { HtmlFetcher } from '../http/html-fetcher';
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
    configService: ConfigService,
  ) {
    this.concurrency = configService.get<number>('news.crawlConcurrency') ?? 2;
    this.intervalMs = configService.get<number>('news.crawlIntervalMs') ?? 1000;
    this.maxAttempts = configService.get<number>('news.crawlMaxAttempts') ?? 3;
    this.retryDelayMs =
      configService.get<number>('news.crawlRetryDelayMs') ?? 60000;
  }

  async runBatch(limit: number): Promise<CrawlRunResult> {
    if (this.running) {
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
      const candidates = await this.articleStore.findCrawlCandidates(limit);
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

      return this.summarize(limit, processed);
    } finally {
      this.running = false;
    }
  }

  async crawlOne(article: NewsArticleEntity): Promise<NewsArticleEntity> {
    const fetched = await this.htmlFetcher.fetchHtml(article.url);

    if (fetched.status === 'failure') {
      const inaccessible = fetched.errorCode === 'ACCESS_DENIED';

      this.logger.warn(
        `Crawl fetch failed for ${article.url}: ${fetched.errorCode} ${fetched.message}`,
      );

      return this.articleStore.markFailure(article, {
        errorCode: fetched.errorCode,
        message: fetched.message,
        inaccessible,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs,
      });
    }

    const pageUrl = fetched.finalUrl;

    const extracted = this.bodyExtractorRunner.extract(fetched.body, pageUrl);

    if (extracted.status === 'failure') {
      const inaccessible = extracted.errorCode === 'ACCESS_DENIED';

      this.logger.warn(
        `Crawl extract failed for ${article.url}: ${extracted.errorCode} ${extracted.message}`,
      );

      return this.articleStore.markFailure(article, {
        errorCode: extracted.errorCode,
        message: extracted.message,
        inaccessible,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs,
      });
    }

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
