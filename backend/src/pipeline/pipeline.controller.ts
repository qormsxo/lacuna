import { ConflictException, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskRunnerService } from '../tasks/task-runner.service';
import { PIPELINE_TASK_KIND, PipelineScheduler } from './pipeline.scheduler';
import { PipelineService } from './pipeline.service';

@ApiTags('pipeline')
@Controller({ path: 'pipeline', version: '1' })
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly taskRunner: TaskRunnerService,
    private readonly scheduler: PipelineScheduler,
  ) {}

  @Post('run')
  @ApiOperation({
    summary:
      'Run extract → analyze → generate → reevaluate in the background. Returns a task to poll.',
  })
  run() {
    if (this.taskRunner.hasRunning(PIPELINE_TASK_KIND)) {
      throw new ConflictException('Pipeline is already running');
    }

    const task = this.taskRunner.start(PIPELINE_TASK_KIND, () =>
      this.pipelineService.run(),
    );

    return { taskId: task.id, task };
  }

  @Get('status')
  @ApiOperation({ summary: 'Pipeline schedule and latest runs' })
  status() {
    const recent = this.taskRunner
      .list(200)
      .filter((task) => task.kind === PIPELINE_TASK_KIND)
      .slice(0, 5);

    return {
      autoEnabled: this.scheduler.isEnabled(),
      cron: this.scheduler.cron,
      running: this.taskRunner.hasRunning(PIPELINE_TASK_KIND),
      recent,
    };
  }
}
