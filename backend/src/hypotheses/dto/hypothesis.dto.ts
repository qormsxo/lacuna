import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HypothesisDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  generationRunId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  coreClaim!: string;

  @ApiProperty()
  derivationProcess!: string;

  @ApiProperty({ type: [String] })
  relatedFactIds!: string[];

  @ApiProperty({ type: [String] })
  relatedRelationIds!: string[];

  @ApiProperty({ type: [String] })
  supportingEvidence!: string[];

  @ApiProperty({ type: [String] })
  contradictingEvidence!: string[];

  @ApiProperty({ type: [String] })
  alternativeExplanations!: string[];

  @ApiProperty({ type: [String] })
  assumptions!: string[];

  @ApiProperty()
  uncertaintyAndLimits!: string;

  @ApiProperty({ type: [String] })
  additionalVerificationItems!: string[];

  @ApiProperty({ type: [String] })
  relatedArticleUrls!: string[];

  @ApiProperty()
  factsVersusInference!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  lastReevaluatedAt!: string | null;
}

export class HypothesisReevaluationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  hypothesisId!: string;

  @ApiProperty()
  sourceArticleId!: string;

  @ApiProperty()
  evidenceKind!: string;

  @ApiProperty()
  isIndependentSource!: boolean;

  @ApiProperty()
  summary!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  evidenceText!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  previousStatus!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  nextStatus!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  statusReason!: string | null;

  @ApiProperty()
  applied!: boolean;

  @ApiProperty()
  evaluatedAt!: string;
}

export class HypothesisReevaluationBatchDto {
  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  extractedFactCount!: number;

  @ApiProperty()
  candidateHypothesisCount!: number;

  @ApiProperty()
  skippedDuplicates!: number;

  @ApiProperty({ type: [HypothesisReevaluationDto] })
  assessments!: HypothesisReevaluationDto[];
}

export class HypothesisReevaluationListDto {
  @ApiProperty({ type: [HypothesisReevaluationDto] })
  reevaluations!: HypothesisReevaluationDto[];
}

export class HypothesisStatusHistoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  hypothesisId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  fromStatus!: string | null;

  @ApiProperty()
  toStatus!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ type: [String] })
  evidenceRefs!: string[];

  @ApiProperty()
  changedAt!: string;
}

export class HypothesisRelatedFactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  normalizedStatement!: string;

  @ApiProperty()
  evidenceSentence!: string;

  @ApiProperty()
  sourceUrl!: string;

  @ApiProperty()
  factType!: string;

  @ApiProperty()
  isClaim!: boolean;

  @ApiProperty({ type: [String] })
  entities!: string[];
}

export class HypothesisRelatedArticleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  publisher!: string | null;

  @ApiProperty()
  source!: string;
}

export class HypothesisGenerationRunDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  inputHash!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  factIds!: string[];

  @ApiProperty({ type: [String] })
  relationIds!: string[];

  @ApiPropertyOptional({ nullable: true, type: String })
  model!: string | null;

  @ApiProperty()
  hypothesisCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  errorMessage!: string | null;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty()
  reusedExisting!: boolean;
}

export class HypothesisListResponseDto {
  @ApiProperty({ type: [HypothesisDto] })
  hypotheses!: HypothesisDto[];

  @ApiPropertyOptional({ description: 'total rows matching the filter' })
  total?: number;
}

export class HypothesisGenerationResultDto {
  @ApiProperty({ type: HypothesisGenerationRunDto })
  run!: HypothesisGenerationRunDto;

  @ApiProperty({ type: [HypothesisDto] })
  hypotheses!: HypothesisDto[];
}

export class HypothesisDetailDto {
  @ApiProperty({ type: HypothesisDto })
  hypothesis!: HypothesisDto;

  @ApiProperty({ type: [HypothesisRelatedFactDto] })
  relatedFacts!: HypothesisRelatedFactDto[];

  @ApiProperty({ type: [HypothesisRelatedArticleDto] })
  relatedArticles!: HypothesisRelatedArticleDto[];

  @ApiProperty({ type: [HypothesisStatusHistoryDto] })
  statusHistory!: HypothesisStatusHistoryDto[];
}
