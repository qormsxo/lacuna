import { Global, Module } from '@nestjs/common';
import { TaskRunnerService } from './task-runner.service';
import { TasksController } from './tasks.controller';

@Global()
@Module({
  controllers: [TasksController],
  providers: [TaskRunnerService],
  exports: [TaskRunnerService],
})
export class TasksModule {}
