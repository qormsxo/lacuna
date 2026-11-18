import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module';
import { FactsModule } from '../facts/facts.module';
import { HypothesisModule } from '../hypotheses/hypothesis.module';
import { PipelineController } from './pipeline.controller';
import { PipelineScheduler } from './pipeline.scheduler';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [FactsModule, AnalysisModule, HypothesisModule],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineScheduler],
})
export class PipelineModule {}
