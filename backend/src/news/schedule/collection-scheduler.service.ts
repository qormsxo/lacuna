import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CollectionJobService } from '../jobs/collection-job.service';

@Injectable()
export class CollectionSchedulerService {
  private readonly logger = new Logger(CollectionSchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly collectionJobService: CollectionJobService,
    private readonly schedulerRegistry: SchedulerRegistry,
    configService: ConfigService,
  ) {
    this.enabled = configService.get<boolean>('news.scheduleEnabled') === true;
  }

  @Cron(process.env.NEWS_COLLECT_CRON ?? '*/15 * * * *', {
    name: 'news-collect',
  })
  async handleCollectCron(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting scheduled news collect');
    await this.collectionJobService.runScheduledCollect();
  }

  @Cron(process.env.NEWS_CRAWL_CRON ?? '*/5 * * * *', {
    name: 'news-crawl',
  })
  async handleCrawlCron(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting scheduled body crawl');
    await this.collectionJobService.runScheduledCrawl();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  listCronNames(): string[] {
    const jobs = this.schedulerRegistry.getCronJobs();
    const names: string[] = [];

    for (const name of jobs.keys()) {
      names.push(name);
    }

    return names;
  }
}
