import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleDto } from './article.dto';

export type CollectorErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_URL'
  | 'ACCESS_DENIED'
  | 'PARSE_ERROR'
  | 'EMPTY_LIST'
  | 'STRUCTURE_CHANGED';

export class CollectorSuccessDto {
  @ApiProperty({ enum: ['success'] })
  status!: 'success';

  @ApiProperty({ enum: ['google', 'naver', 'daum'] })
  source!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ type: [ArticleDto] })
  articles!: ArticleDto[];
}

export class CollectorFailureDto {
  @ApiProperty({ enum: ['failure'] })
  status!: 'failure';

  @ApiProperty({ enum: ['google', 'naver', 'daum'] })
  source!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({
    enum: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'INVALID_URL',
      'ACCESS_DENIED',
      'PARSE_ERROR',
      'EMPTY_LIST',
      'STRUCTURE_CHANGED',
    ],
  })
  errorCode!: CollectorErrorCode;

  @ApiProperty()
  message!: string;
}

export class CollectSummaryDto {
  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failureCount!: number;

  @ApiProperty()
  articleCount!: number;

  @ApiProperty()
  createdCount!: number;

  @ApiProperty()
  updatedCount!: number;

  @ApiProperty()
  duplicateCount!: number;
}

export class CollectResponseDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  collectedAt!: string;

  @ApiProperty({ type: [CollectorSuccessDto] })
  successes!: CollectorSuccessDto[];

  @ApiProperty({ type: [CollectorFailureDto] })
  failures!: CollectorFailureDto[];

  @ApiProperty({ type: [ArticleDto] })
  articles!: ArticleDto[];

  @ApiProperty({ type: CollectSummaryDto })
  summary!: CollectSummaryDto;
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [String], example: ['정치', '경제'] })
  categories!: string[];
}

export type CollectorResult = CollectorSuccessDto | CollectorFailureDto;

export class CollectQueryDto {
  @ApiProperty({ example: '정치' })
  category!: string;

  @ApiPropertyOptional({
    description: 'Comma-separated sources: google,naver,daum',
    example: 'google,naver,daum',
  })
  sources?: string;
}
