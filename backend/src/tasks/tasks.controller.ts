import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { TaskRecord } from './task-runner.service';
import { TaskRunnerService } from './task-runner.service';

@ApiTags('tasks')
@Controller({ path: 'tasks', version: '1' })
export class TasksController {
  constructor(private readonly taskRunner: TaskRunnerService) {}

  @Get()
  @ApiOperation({ summary: 'List recent background tasks (in-memory)' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  list(@Query('limit') limitRaw?: string) {
    const parsed = Number(limitRaw ?? '20');

    const limit =
      Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 200) : 20;

    return { tasks: this.taskRunner.list(limit) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one background task status and result' })
  get(@Param('id') id: string): TaskRecord {
    return this.taskRunner.get(id);
  }
}
