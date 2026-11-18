import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  normalizedUrl!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  publisher!: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty()
  crawlStatus!: string;

  @ApiProperty()
  crawlAttempts!: number;

  @ApiProperty()
  bodyExtracted!: boolean;

  @ApiProperty()
  bodyStorageMode!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  body!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bodyLength!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  bodyHash!: string | null;

  @ApiProperty()
  isDuplicate!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  duplicateOfId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  author!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  publishedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  modifiedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  lastError!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  lastErrorCode!: string | null;

  @ApiProperty()
  collectedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  crawledAt!: string | null;
}

export class CrawlRunResponseDto {
  @ApiProperty()
  requested!: number;

  @ApiProperty()
  processed!: number;

  @ApiProperty()
  succeeded!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  inaccessible!: number;

  @ApiProperty()
  retryWaiting!: number;

  @ApiProperty({ type: [ArticleResponseDto] })
  articles!: ArticleResponseDto[];
}

export class ArticleListResponseDto {
  @ApiProperty({ type: [ArticleResponseDto] })
  articles!: ArticleResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
