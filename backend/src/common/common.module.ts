import { Global, Module } from '@nestjs/common';
import { ActivityFileLogger } from './logging/activity-file.logger';
import { FailureFileLogger } from './logging/failure-file.logger';

@Global()
@Module({
  providers: [ActivityFileLogger, FailureFileLogger],
  exports: [ActivityFileLogger, FailureFileLogger],
})
export class CommonModule {}
