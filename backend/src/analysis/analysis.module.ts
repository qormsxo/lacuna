import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { FactRelationEntity } from './entities/fact-relation.entity';
import { FactVerificationEntity } from './entities/fact-verification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExtractedFactEntity,
      NewsArticleEntity,
      AnalysisRunEntity,
      FactVerificationEntity,
      FactRelationEntity,
    ]),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
