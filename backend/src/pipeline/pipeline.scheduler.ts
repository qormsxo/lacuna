import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { TaskRunnerService } from '../tasks/task-runner.service';
import { PipelineService } from './pipeline.service';

export const PIPELINE_TASK_KIND = 'pipeline.run';

@Injectable()
export class PipelineScheduler {
  private readonly logger = new Logger(PipelineScheduler.name);
  private readonly enabled: boolean;
  readonly cron: string;

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly taskRunner: TaskRunnerService,
    configService: ConfigService,
  ) {
    this.enabled = configService.get<boolean>('pipeline.autoEnabled') === true;
    this.cron = configService.get<string>('pipeline.cron') ?? '*/30 * * * *';
  }

  @Cron(process.env.PIPELINE_CRON ?? '*/30 * * * *', { name: 'pipeline-auto' })
  handleCron(): void {
    if (!this.enabled) {
      return;
    }

    if (this.taskRunner.hasRunning(PIPELINE_TASK_KIND)) {
      this.logger.log('Pipeline still running; skipping this tick');

      return;
    }

    this.logger.log('Starting scheduled pipeline run');
    this.taskRunner.start(PIPELINE_TASK_KIND, () => this.pipelineService.run());
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
