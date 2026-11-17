import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { ExtractedFactEntity } from './entities/extracted-fact.entity';
import { FactExtractionRunEntity } from './entities/fact-extraction-run.entity';
import { FactsController } from './facts.controller';
import { FactsService } from './facts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NewsArticleEntity,
      ExtractedFactEntity,
      FactExtractionRunEntity,
    ]),
  ],
  controllers: [FactsController],
  providers: [FactsService],
  exports: [FactsService],
})
export class FactsModule {}
