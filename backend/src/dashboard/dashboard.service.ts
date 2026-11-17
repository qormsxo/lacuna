import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisService } from '../analysis/analysis.service';
import { FactsService } from '../facts/facts.service';
import { HypothesisReevaluationService } from '../hypotheses/hypothesis-reevaluation.service';
import { HypothesisEntity } from '../hypotheses/entities/hypothesis.entity';
import { ArticleService } from '../news/articles/article.service';
import { DashboardSummaryDto } from './dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly articleService: ArticleService,
    private readonly factsService: FactsService,
    private readonly analysisService: AnalysisService,
    private readonly reevaluationService: HypothesisReevaluationService,
    @InjectRepository(HypothesisEntity)
    private readonly hypotheses: Repository<HypothesisEntity>,
  ) {}

  async getSummary(): Promise<DashboardSummaryDto> {
    const articleCount = await this.articleService.countAll();
    const articlesByCategory = await this.articleService.countByCategory();
    const factCounts = await this.factsService.countFacts();
    const relationCount = await this.analysisService.countRelations();
    const hypothesisCount = await this.hypotheses.count();

    const recentArticles = await this.articleService.findMany({ limit: 8 });
    const recentHypotheses = await this.hypotheses.find({
      order: { generatedAt: 'DESC' },
      take: 8,
    });
    const recentReevaluations = await this.reevaluationService.listRecent(8);

    const recentArticleDtos = [];

    for (const article of recentArticles) {
      recentArticleDtos.push({
        id: article.id,
        title: article.title,
        publisher: article.publisher,
        category: article.category,
        crawlStatus: article.crawlStatus,
        collectedAt: article.collectedAt.toISOString(),
        url: article.url,
      });
    }

    const recentHypothesisDtos = [];

    for (const hypothesis of recentHypotheses) {
      recentHypothesisDtos.push({
        id: hypothesis.id,
        title: hypothesis.title,
        status: hypothesis.status,
        generatedAt: hypothesis.generatedAt.toISOString(),
        lastReevaluatedAt: hypothesis.lastReevaluatedAt
          ? hypothesis.lastReevaluatedAt.toISOString()
          : null,
      });
    }

    const recentReevaluationDtos = [];

    for (const item of recentReevaluations) {
      recentReevaluationDtos.push({
        id: item.id,
        hypothesisId: item.hypothesisId,
        evidenceKind: item.evidenceKind,
        summary: item.summary,
        evaluatedAt: item.evaluatedAt.toISOString(),
      });
    }

    return {
      articleCount,
      articlesByCategory,
      factTotal: factCounts.total,
      factAccepted: factCounts.accepted,
      factNeedsReview: factCounts.needsReview,
      relationCount,
      hypothesisCount,
      recentArticles: recentArticleDtos,
      recentHypotheses: recentHypothesisDtos,
      recentReevaluations: recentReevaluationDtos,
    };
  }
}
