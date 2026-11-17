import { ConfigService } from '@nestjs/config';
import { CrawlService } from '../crawl/crawl.service';
import { CrawlHistoryEntity } from '../entities/crawl-history.entity';
import { NewsService } from '../news.service';
import { CollectionJobService } from './collection-job.service';
import { CrawlHistoryService } from './crawl-history.service';

describe('CollectionJobService', () => {
  it('skips collect when another job is running', async () => {
    const skipped: string[] = [];

    const crawlHistoryService = {
      startJob: () => Promise.resolve(null),
      recordSkipped: (_jobType: string, message: string) => {
        skipped.push(message);
        return Promise.resolve({} as CrawlHistoryEntity);
      },
      finishJob: () => Promise.resolve({} as CrawlHistoryEntity),
    } as unknown as CrawlHistoryService;

    const newsService = {
      collect: () => {
        throw new Error('should not run');
      },
    } as unknown as NewsService;

    const crawlService = {
      runBatch: () => {
        throw new Error('should not run');
      },
    } as unknown as CrawlService;

    const service = new CollectionJobService(
      newsService,
      crawlService,
      crawlHistoryService,
      new ConfigService({
        news: { scheduleCrawlBatchLimit: 5 },
      }),
    );

    await service.runScheduledCollect();

    expect(skipped[0]).toContain('already running');
  });
});
