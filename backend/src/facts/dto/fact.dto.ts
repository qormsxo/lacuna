import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtractedFactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  extractionRunId!: string;

  @ApiProperty()
  normalizedStatement!: string;

  @ApiProperty()
  originalExpression!: string;

  @ApiProperty({ type: [String] })
  entities!: string[];

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  occurredAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  quantityValue!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  quantityUnit!: string | null;

  @ApiProperty()
  sourceUrl!: string;

  @ApiProperty()
  evidenceSentence!: string;

  @ApiProperty()
  evidenceMatched!: boolean;

  @ApiProperty()
  factType!: string;

  @ApiProperty()
  isClaim!: boolean;

  @ApiProperty()
  reviewStatus!: string;

  @ApiProperty()
  extractedAt!: string;
}

export class FactExtractionRunDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  bodyHash!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  model!: string | null;

  @ApiProperty()
  acceptedCount!: number;

  @ApiProperty()
  reviewCount!: number;

  @ApiProperty()
  excludedCount!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  errorMessage!: string | null;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty()
  reusedExisting!: boolean;
}

export class FactExtractionResultDto {
  @ApiProperty({ type: FactExtractionRunDto })
  run!: FactExtractionRunDto;

  @ApiProperty({ type: [ExtractedFactDto] })
  facts!: ExtractedFactDto[];
}

export class FactListResponseDto {
  @ApiProperty({ type: [ExtractedFactDto] })
  facts!: ExtractedFactDto[];
}
