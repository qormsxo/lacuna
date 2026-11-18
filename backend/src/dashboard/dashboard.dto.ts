import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryCountDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  count!: number;
}

export class DashboardArticleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  publisher!: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  crawlStatus!: string;

  @ApiProperty()
  collectedAt!: string;

  @ApiProperty()
  url!: string;
}

export class DashboardHypothesisDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  lastReevaluatedAt!: string | null;
}

export class DashboardReevaluationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  hypothesisId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  hypothesisTitle!: string | null;

  @ApiProperty()
  evidenceKind!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  evaluatedAt!: string;
}

export class DashboardSummaryDto {
  @ApiProperty()
  articleCount!: number;

  @ApiProperty({ type: [CategoryCountDto] })
  articlesByCategory!: CategoryCountDto[];

  @ApiProperty()
  factTotal!: number;

  @ApiProperty()
  factAccepted!: number;

  @ApiProperty()
  factNeedsReview!: number;

  @ApiProperty()
  relationCount!: number;

  @ApiProperty()
  hypothesisCount!: number;

  @ApiProperty({ type: [DashboardArticleDto] })
  recentArticles!: DashboardArticleDto[];

  @ApiProperty({ type: [DashboardHypothesisDto] })
  recentHypotheses!: DashboardHypothesisDto[];

  @ApiProperty({ type: [DashboardReevaluationDto] })
  recentReevaluations!: DashboardReevaluationDto[];
}
