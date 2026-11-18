import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { isNewsCategory, NEWS_CATEGORIES } from '../news/constants/categories';
import {
  ExtractedFactDto,
  FactExtractionResultDto,
  FactListResponseDto,
} from './dto/fact.dto';
import {
  ExtractedFactEntity,
  FactReviewStatus,
} from './entities/extracted-fact.entity';
import { FactExtractionRunEntity } from './entities/fact-extraction-run.entity';
import { toExtractedFactDto, toFactExtractionRunDto } from './facts.mapper';
import type { BackgroundAccepted } from '../tasks/background';
import {
  isBackgroundRequested,
  runMaybeInBackground,
} from '../tasks/background';
import { TaskRunnerService } from '../tasks/task-runner.service';
import { parseOffset } from '../common/utils/pagination';
import { FactsService } from './facts.service';

@ApiTags('facts')
@Controller({ path: 'facts', version: '1' })
export class FactsController {
  constructor(
    private readonly factsService: FactsService,
    private readonly taskRunner: TaskRunnerService,
  ) {}

  @Post('extract/pending')
  @ApiOperation({
    summary:
      'Extract facts from crawled articles that do not yet have a completed extraction for the current body',
  })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({
    name: 'category',
    required: false,
    example: '경제',
    description: 'Only extract from articles in this category',
  })
  @ApiQuery({
    name: 'background',
    required: false,
    example: 'true',
    description: 'true면 즉시 taskId를 반환하고 /tasks/:id로 결과를 조회',
  })
  async extractPending(
    @Query('limit') limitRaw?: string,
    @Query('category') category?: string,
    @Query('background') backgroundRaw?: string,
  ): Promise<ExtractPendingResult | BackgroundAccepted> {
    const limit = this.parseLimit(limitRaw, 10);
    let scopedCategory: string | undefined;

    if (category !== undefined && category.trim().length > 0) {
      const trimmed = category.trim();
      if (!isNewsCategory(trimmed)) {
        throw new BadRequestException(
          `Unsupported category: ${trimmed}. Allowed: ${NEWS_CATEGORIES.join(', ')}`,
        );
      }
      scopedCategory = trimmed;
    }

    return runMaybeInBackground(
      this.taskRunner,
      isBackgroundRequested(backgroundRaw),
      'facts.extractPending',
      async (): Promise<ExtractPendingResult> => {
        const batch = await this.factsService.extractPendingBatch(
          limit,
          scopedCategory,
        );

        return {
          attempted: batch.attempted,
          articleIds: batch.articleIds,
          extracted: batch.extracted,
          failed: batch.failed,
          results: toExtractionResults(batch.results),
        };
      },
    );
  }

  @Post('extract/retry-failures')
  @ApiOperation({
    summary:
      'Retry recent retryable Gemini/fact-extraction failures from logs and failed runs',
  })
  @ApiQuery({ name: 'limit', required: false, example: '5' })
  @ApiQuery({
    name: 'background',
    required: false,
    example: 'true',
    description: 'true면 즉시 taskId를 반환하고 /tasks/:id로 결과를 조회',
  })
  async retryFailedExtractions(
    @Query('limit') limitRaw?: string,
    @Query('background') backgroundRaw?: string,
  ): Promise<RetryExtractionResult | BackgroundAccepted> {
    const limit = this.parseLimit(limitRaw, 5);

    return runMaybeInBackground(
      this.taskRunner,
      isBackgroundRequested(backgroundRaw),
      'facts.retryFailures',
      async (): Promise<RetryExtractionResult> => {
        const batch = await this.factsService.retryFailedExtractions(limit);

        return {
          attempted: batch.attempted,
          articleIds: batch.articleIds,
          results: toExtractionResults(batch.results),
        };
      },
    );
  }

  @Post('extract/:articleId')
  @ApiOperation({
    summary: 'Extract structured facts/claims from a crawled article body',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    example: 'false',
    description:
      'Re-run even if a completed extraction exists for the same body',
  })
  @ApiOkResponse({ type: FactExtractionResultDto })
  async extract(
    @Param('articleId') articleId: string,
    @Query('force') forceRaw?: string,
  ): Promise<FactExtractionResultDto> {
    const force = forceRaw === 'true' || forceRaw === '1';
    const result = await this.factsService.extractForArticle(articleId, force);
    const facts: ExtractedFactDto[] = [];

    for (const fact of result.facts) {
      facts.push(toExtractedFactDto(fact));
    }

    return {
      run: toFactExtractionRunDto(result.run, result.reusedExisting),
      facts,
    };
  }

  @Get('article/:articleId')
  @ApiOperation({ summary: 'List extracted facts for an article' })
  @ApiOkResponse({ type: FactListResponseDto })
  async listByArticle(
    @Param('articleId') articleId: string,
  ): Promise<FactListResponseDto> {
    const rows = await this.factsService.listByArticle(articleId);
    const facts: ExtractedFactDto[] = [];

    for (const row of rows) {
      facts.push(toExtractedFactDto(row));
    }

    return { facts };
  }

  @Get()
  @ApiOperation({ summary: 'List recent extracted facts' })
  @ApiQuery({ name: 'limit', required: false, example: '50' })
  @ApiQuery({ name: 'offset', required: false, example: '0' })
  @ApiQuery({
    name: 'reviewStatus',
    required: false,
    enum: ['accepted', 'needs_review'],
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: '정규화 문장 부분 검색',
  })
  @ApiOkResponse({ type: FactListResponseDto })
  async listRecent(
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
    @Query('reviewStatus') reviewStatusRaw?: string,
    @Query('q') query?: string,
  ): Promise<FactListResponseDto> {
    const limit = this.parseLimit(limitRaw, 50);
    const offset = parseOffset(offsetRaw);
    const reviewStatus = parseReviewStatus(reviewStatusRaw);
    const { rows, total } = await this.factsService.listPaged({
      limit,
      offset,
      reviewStatus,
      query: query?.trim(),
    });
    const facts: ExtractedFactDto[] = [];

    for (const row of rows) {
      facts.push(toExtractedFactDto(row));
    }

    return { facts, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one extracted fact with evidence and source' })
  @ApiOkResponse({ type: ExtractedFactDto })
  async getFact(@Param('id') id: string): Promise<ExtractedFactDto> {
    const fact = await this.factsService.getFact(id);

    return toExtractedFactDto(fact);
  }

  private parseLimit(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw.trim().length === 0) {
      return fallback;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value <= 0 || value > 100) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 100',
      );
    }

    return value;
  }
}

type ExtractPendingResult = {
  attempted: number;
  articleIds: string[];
  extracted: number;
  failed: number;
  results: FactExtractionResultDto[];
};

type RetryExtractionResult = {
  attempted: number;
  articleIds: string[];
  results: FactExtractionResultDto[];
};

function parseReviewStatus(
  raw: string | undefined,
): FactReviewStatus | undefined {
  if (raw === undefined || raw.trim().length === 0) {
    return undefined;
  }

  if (raw === 'accepted' || raw === 'needs_review') {
    return raw;
  }

  throw new BadRequestException(
    'reviewStatus must be accepted or needs_review',
  );
}

function toExtractionResults(
  items: Array<{
    run: FactExtractionRunEntity;
    facts: ExtractedFactEntity[];
    reusedExisting: boolean;
  }>,
): FactExtractionResultDto[] {
  const results: FactExtractionResultDto[] = [];

  for (const item of items) {
    const facts: ExtractedFactDto[] = [];
    for (const fact of item.facts) {
      facts.push(toExtractedFactDto(fact));
    }
    results.push({
      run: toFactExtractionRunDto(item.run, item.reusedExisting),
      facts,
    });
  }

  return results;
}
