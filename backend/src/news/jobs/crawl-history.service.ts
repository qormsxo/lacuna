import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrawlHistoryEntity,
  CrawlJobStatus,
  CrawlJobType,
} from '../entities/crawl-history.entity';

@Injectable()
export class CrawlHistoryService {
  constructor(
    @InjectRepository(CrawlHistoryEntity)
    private readonly histories: Repository<CrawlHistoryEntity>,
  ) {}

  findRunning(jobType: CrawlJobType): Promise<CrawlHistoryEntity | null> {
    return this.histories.findOne({
      where: { jobType, status: 'running' },
      order: { startedAt: 'DESC' },
    });
  }

  async startJob(
    jobType: CrawlJobType,
    category: string | null,
  ): Promise<CrawlHistoryEntity | null> {
    const running = await this.findRunning(jobType);

    if (running !== null) {
      return null;
    }

    const created = this.histories.create({
      jobType,
      status: 'running',
      category,
      startedAt: new Date(),
      finishedAt: null,
      requestedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      duplicateCount: 0,
      crawledSuccess: 0,
      crawledFailed: 0,
      message: null,
    });

    return this.histories.save(created);
  }

  async finishJob(
    history: CrawlHistoryEntity,
    status: Exclude<CrawlJobStatus, 'running'>,
    stats: {
      requestedCount?: number;
      createdCount?: number;
      updatedCount?: number;
      duplicateCount?: number;
      crawledSuccess?: number;
      crawledFailed?: number;
      message?: string | null;
    },
  ): Promise<CrawlHistoryEntity> {
    history.status = status;
    history.finishedAt = new Date();

    if (stats.requestedCount !== undefined) {
      history.requestedCount = stats.requestedCount;
    }

    if (stats.createdCount !== undefined) {
      history.createdCount = stats.createdCount;
    }

    if (stats.updatedCount !== undefined) {
      history.updatedCount = stats.updatedCount;
    }

    if (stats.duplicateCount !== undefined) {
      history.duplicateCount = stats.duplicateCount;
    }

    if (stats.crawledSuccess !== undefined) {
      history.crawledSuccess = stats.crawledSuccess;
    }

    if (stats.crawledFailed !== undefined) {
      history.crawledFailed = stats.crawledFailed;
    }

    if (stats.message !== undefined) {
      history.message = stats.message;
    }

    return this.histories.save(history);
  }

  async recordSkipped(
    jobType: CrawlJobType,
    message: string,
  ): Promise<CrawlHistoryEntity> {
    const created = this.histories.create({
      jobType,
      status: 'skipped',
      category: null,
      startedAt: new Date(),
      finishedAt: new Date(),
      requestedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      duplicateCount: 0,
      crawledSuccess: 0,
      crawledFailed: 0,
      message,
    });

    return this.histories.save(created);
  }

  findRecent(limit: number): Promise<CrawlHistoryEntity[]> {
    return this.histories.find({
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  findById(id: string): Promise<CrawlHistoryEntity | null> {
    return this.histories.findOne({ where: { id } });
  }

  async getJobStatusOverview(): Promise<{
    runningCollect: CrawlHistoryEntity | null;
    runningCrawl: CrawlHistoryEntity | null;
    latest: CrawlHistoryEntity[];
  }> {
    const runningCollect = await this.findRunning('collect');
    const runningCrawl = await this.findRunning('crawl_body');
    const latest = await this.findRecent(10);

    return {
      runningCollect,
      runningCrawl,
      latest,
    };
  }
}
