import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisModule } from '../analysis/analysis.module';
import { FactsModule } from '../facts/facts.module';
import { HypothesisModule } from '../hypotheses/hypothesis.module';
import { HypothesisEntity } from '../hypotheses/entities/hypothesis.entity';
import { NewsModule } from '../news/news.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    NewsModule,
    FactsModule,
    AnalysisModule,
    HypothesisModule,
    TypeOrmModule.forFeature([HypothesisEntity]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
