import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NEWS_CATEGORIES, NewsCategory } from '../constants/categories';
import { NEWS_SOURCES, NewsSource } from '../constants/sources';
import { CrawlService } from '../crawl/crawl.service';
import { NewsService } from '../news.service';
import { CrawlHistoryService } from './crawl-history.service';

@Injectable()
export class CollectionJobService {
  private readonly logger = new Logger(CollectionJobService.name);
  private readonly sources: NewsSource[];
  private readonly crawlBatchLimit: number;

  constructor(
    private readonly newsService: NewsService,
    private readonly crawlService: CrawlService,
    private readonly crawlHistoryService: CrawlHistoryService,
    configService: ConfigService,
  ) {
    this.sources = [...NEWS_SOURCES];
    this.crawlBatchLimit =
      configService.get<number>('news.scheduleCrawlBatchLimit') ?? 20;
  }

  async runScheduledCollect(): Promise<void> {
    const history = await this.crawlHistoryService.startJob('collect', null);

    if (history === null) {
      await this.crawlHistoryService.recordSkipped(
        'collect',
        'Another collect job is already running',
      );
      this.logger.warn('Skipped collect job because another run is active');
      return;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    let requestedCount = 0;

    try {
      for (const category of NEWS_CATEGORIES) {
        const result = await this.newsService.collect(
          category as NewsCategory,
          this.sources,
        );

        requestedCount += result.summary.articleCount;
        createdCount += result.summary.createdCount;
        updatedCount += result.summary.updatedCount;
        duplicateCount += result.summary.duplicateCount;
      }

      await this.crawlHistoryService.finishJob(history, 'completed', {
        requestedCount,
        createdCount,
        updatedCount,
        duplicateCount,
        message: `Collected categories=${NEWS_CATEGORIES.length}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Collect failed';

      await this.crawlHistoryService.finishJob(history, 'failed', {
        requestedCount,
        createdCount,
        updatedCount,
        duplicateCount,
        message,
      });

      this.logger.error(`Scheduled collect failed: ${message}`);
    }
  }

  async runScheduledCrawl(): Promise<void> {
    const history = await this.crawlHistoryService.startJob(
      'crawl_body',
      null,
    );

    if (history === null) {
      await this.crawlHistoryService.recordSkipped(
        'crawl_body',
        'Another crawl job is already running',
      );
      this.logger.warn('Skipped crawl job because another run is active');
      return;
    }

    try {
      const result = await this.crawlService.runBatch(this.crawlBatchLimit);

      await this.crawlHistoryService.finishJob(history, 'completed', {
        requestedCount: result.requested,
        crawledSuccess: result.succeeded,
        crawledFailed:
          result.failed + result.inaccessible + result.retryWaiting,
        message: `processed=${result.processed}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Crawl failed';

      await this.crawlHistoryService.finishJob(history, 'failed', {
        message,
      });

      this.logger.error(`Scheduled crawl failed: ${message}`);
    }
  }
}
