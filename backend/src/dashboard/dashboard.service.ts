import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
    const [
      articleCount,
      articlesByCategory,
      factCounts,
      relationCount,
      hypothesisCount,
      recentArticles,
      recentHypotheses,
      recentReevaluations,
    ] = await Promise.all([
      this.articleService.countAll(),
      this.articleService.countByCategory(),
      this.factsService.countFacts(),
      this.analysisService.countRelations(),
      this.hypotheses.count(),
      this.articleService.findMany({ limit: 8 }),
      this.hypotheses.find({ order: { generatedAt: 'DESC' }, take: 8 }),
      this.reevaluationService.listRecent(8),
    ]);

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

    const reevaluatedIds = [
      ...new Set(recentReevaluations.map((item) => item.hypothesisId)),
    ];
    const reevaluatedHypotheses =
      reevaluatedIds.length === 0
        ? []
        : await this.hypotheses.find({
            where: { id: In(reevaluatedIds) },
            select: ['id', 'title'],
          });
    const titleById = new Map(
      reevaluatedHypotheses.map((item) => [item.id, item.title]),
    );

    const recentReevaluationDtos = [];

    for (const item of recentReevaluations) {
      recentReevaluationDtos.push({
        id: item.id,
        hypothesisId: item.hypothesisId,
        hypothesisTitle: titleById.get(item.hypothesisId) ?? null,
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
