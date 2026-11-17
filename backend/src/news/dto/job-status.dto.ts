import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrawlStatusSummaryDto {
  @ApiProperty()
  pending!: number;

  @ApiProperty()
  crawling!: number;

  @ApiProperty()
  success!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  retry_waiting!: number;

  @ApiProperty()
  inaccessible!: number;
}

export class CrawlHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  jobType!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  category!: string | null;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty()
  requestedCount!: number;

  @ApiProperty()
  createdCount!: number;

  @ApiProperty()
  updatedCount!: number;

  @ApiProperty()
  duplicateCount!: number;

  @ApiProperty()
  crawledSuccess!: number;

  @ApiProperty()
  crawledFailed!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  message!: string | null;
}

export class CollectionJobStatusDto {
  @ApiProperty()
  scheduleEnabled!: boolean;

  @ApiProperty({ type: [String] })
  cronJobs!: string[];

  @ApiPropertyOptional({ type: CrawlHistoryItemDto, nullable: true })
  runningCollect!: CrawlHistoryItemDto | null;

  @ApiPropertyOptional({ type: CrawlHistoryItemDto, nullable: true })
  runningCrawl!: CrawlHistoryItemDto | null;

  @ApiProperty({ type: [CrawlHistoryItemDto] })
  latest!: CrawlHistoryItemDto[];
}

export class CrawlHistoryListDto {
  @ApiProperty({ type: [CrawlHistoryItemDto] })
  jobs!: CrawlHistoryItemDto[];
}
