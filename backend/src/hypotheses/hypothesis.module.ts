import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactRelationEntity } from '../analysis/entities/fact-relation.entity';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import { FactsModule } from '../facts/facts.module';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { HypothesisGenerationRunEntity } from './entities/hypothesis-generation-run.entity';
import { HypothesisReevaluationEntity } from './entities/hypothesis-reevaluation.entity';
import { HypothesisStatusHistoryEntity } from './entities/hypothesis-status-history.entity';
import { HypothesisEntity } from './entities/hypothesis.entity';
import { HypothesisReevaluationService } from './hypothesis-reevaluation.service';
import { HypothesisController } from './hypothesis.controller';
import { HypothesisService } from './hypothesis.service';

@Module({
  imports: [
    FactsModule,
    TypeOrmModule.forFeature([
      ExtractedFactEntity,
      NewsArticleEntity,
      FactRelationEntity,
      HypothesisEntity,
      HypothesisStatusHistoryEntity,
      HypothesisGenerationRunEntity,
      HypothesisReevaluationEntity,
    ]),
  ],
  controllers: [HypothesisController],
  providers: [HypothesisService, HypothesisReevaluationService],
  exports: [HypothesisService, HypothesisReevaluationService],
})
export class HypothesisModule {}
