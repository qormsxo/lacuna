import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AnalysisRunEntity } from '../analysis/entities/analysis-run.entity';
import { FactExtractionRunEntity } from '../facts/entities/fact-extraction-run.entity';
import { HypothesisGenerationRunEntity } from '../hypotheses/entities/hypothesis-generation-run.entity';
import { HypothesisReevaluationEntity } from '../hypotheses/entities/hypothesis-reevaluation.entity';
import { CrawlHistoryEntity } from '../news/entities/crawl-history.entity';
import { NewsArticleEntity } from '../news/entities/news-article.entity';

export const INTERRUPTED_MESSAGE = 'Interrupted by server restart';

export type StaleRecoveryReport = {
  factExtractionRuns: number;
  analysisRuns: number;
  hypothesisRuns: number;
  reevaluations: number;
  crawlHistories: number;
  crawlingArticles: number;
};

/**
 * 서버가 작업 도중 종료되면 `running` 상태가 영구히 남아 같은 입력의 재실행을 막는다.
 * 프로세스 시작 시점에는 이 프로세스가 시작한 작업이 하나도 없으므로,
 * 남아 있는 `running` 레코드는 모두 중단된 작업으로 보고 정리한다.
 */
@Injectable()
export class StaleRunRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaleRunRecoveryService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (
      this.configService.get<boolean>('maintenance.recoverOnBoot') === false
    ) {
      return;
    }

    try {
      const report = await this.recover();
      const total = Object.values(report).reduce((sum, n) => sum + n, 0);

      if (total > 0) {
        this.logger.warn(
          `Recovered interrupted work: ${JSON.stringify(report)}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Stale run recovery failed: ${message}`);
    }
  }

  async recover(): Promise<StaleRecoveryReport> {
    const now = new Date();

    const factExtractionRuns = await this.dataSource
      .getRepository(FactExtractionRunEntity)
      .update(
        { status: 'running' },
        {
          status: 'failed',
          errorMessage: INTERRUPTED_MESSAGE,
          finishedAt: now,
        },
      );

    const analysisRuns = await this.dataSource
      .getRepository(AnalysisRunEntity)
      .update(
        { status: 'running' },
        {
          status: 'failed',
          errorMessage: INTERRUPTED_MESSAGE,
          finishedAt: now,
        },
      );

    const hypothesisRuns = await this.dataSource
      .getRepository(HypothesisGenerationRunEntity)
      .update(
        { status: 'running' },
        {
          status: 'failed',
          errorMessage: INTERRUPTED_MESSAGE,
          finishedAt: now,
        },
      );

    const reevaluations = await this.dataSource
      .getRepository(HypothesisReevaluationEntity)
      .update({ status: 'running' }, { status: 'failed' });

    const crawlHistories = await this.dataSource
      .getRepository(CrawlHistoryEntity)
      .update(
        { status: 'running' },
        { status: 'failed', message: INTERRUPTED_MESSAGE, finishedAt: now },
      );

    const crawlingArticles = await this.dataSource
      .getRepository(NewsArticleEntity)
      .update(
        { crawlStatus: 'crawling' },
        {
          crawlStatus: 'retry_waiting',
          nextRetryAt: now,
          lastError: INTERRUPTED_MESSAGE,
        },
      );

    return {
      factExtractionRuns: factExtractionRuns.affected ?? 0,
      analysisRuns: analysisRuns.affected ?? 0,
      hypothesisRuns: hypothesisRuns.affected ?? 0,
      reevaluations: reevaluations.affected ?? 0,
      crawlHistories: crawlHistories.affected ?? 0,
      crawlingArticles: crawlingArticles.affected ?? 0,
    };
  }
}
