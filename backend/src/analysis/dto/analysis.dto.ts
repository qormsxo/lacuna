import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FactVerificationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  factId!: string;

  @ApiProperty()
  analysisRunId!: string;

  @ApiProperty()
  verificationStatus!: string;

  @ApiProperty()
  sourceQuality!: string;

  @ApiProperty()
  sourceIndependence!: string;

  @ApiProperty()
  evidenceDirectness!: string;

  @ApiProperty()
  comparisonSummary!: string;

  @ApiProperty({ type: [String] })
  comparedFactIds!: string[];

  @ApiProperty({ type: [String] })
  citedPrimarySources!: string[];

  @ApiProperty()
  contentAgreement!: boolean;

  @ApiProperty()
  partialAgreement!: boolean;

  @ApiProperty()
  contradictionFound!: boolean;

  @ApiProperty()
  countsAsIndependentEvidence!: boolean;

  @ApiProperty()
  analyzedAt!: string;
}

export class RelationFactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  statement!: string;

  @ApiProperty()
  articleId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  articleTitle!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  articleUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  publisher!: string | null;
}

export class FactRelationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  analysisRunId!: string;

  @ApiProperty()
  relationType!: string;

  @ApiProperty()
  factIdA!: string;

  @ApiProperty()
  factIdB!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  rationale!: string;

  @ApiProperty({ type: [String] })
  sourceRefs!: string[];

  @ApiProperty()
  isDirectlyConfirmed!: boolean;

  @ApiProperty()
  isInferred!: boolean;

  @ApiProperty()
  uncertainty!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  alternativeExplanations!: string | null;

  @ApiProperty()
  analyzedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: RelationFactSummaryDto })
  factA?: RelationFactSummaryDto | null;

  @ApiPropertyOptional({ nullable: true, type: RelationFactSummaryDto })
  factB?: RelationFactSummaryDto | null;
}

export class AnalysisRunDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  runType!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  inputHash!: string;

  @ApiProperty({ type: [String] })
  factIds!: string[];

  @ApiPropertyOptional({ nullable: true, type: String })
  model!: string | null;

  @ApiProperty()
  verificationCount!: number;

  @ApiProperty()
  relationCount!: number;

  @ApiProperty()
  skippedWeakRelationCount!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  errorMessage!: string | null;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty()
  reusedExisting!: boolean;
}

export class AnalysisResultDto {
  @ApiProperty({ type: AnalysisRunDto })
  run!: AnalysisRunDto;

  @ApiProperty({ type: [FactVerificationDto] })
  verifications!: FactVerificationDto[];

  @ApiProperty({ type: [FactRelationDto] })
  relations!: FactRelationDto[];
}

export class VerificationListDto {
  @ApiProperty({ type: [FactVerificationDto] })
  verifications!: FactVerificationDto[];
}

export class RelationListDto {
  @ApiProperty({ type: [FactRelationDto] })
  relations!: FactRelationDto[];

  @ApiPropertyOptional({ description: 'total rows matching the filter' })
  total?: number;
}
