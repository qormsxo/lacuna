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
import {
  isNewsCategory,
  NEWS_CATEGORIES,
} from '../news/constants/categories';
import {
  ExtractedFactDto,
  FactExtractionResultDto,
  FactListResponseDto,
} from './dto/fact.dto';
import { toExtractedFactDto, toFactExtractionRunDto } from './facts.mapper';
import { FactsService } from './facts.service';

@ApiTags('facts')
@Controller({ path: 'facts', version: '1' })
export class FactsController {
  constructor(private readonly factsService: FactsService) {}

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
  async extractPending(
    @Query('limit') limitRaw?: string,
    @Query('category') category?: string,
  ): Promise<{
    attempted: number;
    articleIds: string[];
    extracted: number;
    failed: number;
    results: FactExtractionResultDto[];
  }> {
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

    const batch = await this.factsService.extractPendingBatch(
      limit,
      scopedCategory,
    );
    const results: FactExtractionResultDto[] = [];

    for (const item of batch.results) {
      const facts: ExtractedFactDto[] = [];
      for (const fact of item.facts) {
        facts.push(toExtractedFactDto(fact));
      }
      results.push({
        run: toFactExtractionRunDto(item.run, item.reusedExisting),
        facts,
      });
    }

    return {
      attempted: batch.attempted,
      articleIds: batch.articleIds,
      extracted: batch.extracted,
      failed: batch.failed,
      results,
    };
  }

  @Post('extract/retry-failures')
  @ApiOperation({
    summary:
      'Retry recent retryable Gemini/fact-extraction failures from logs and failed runs',
  })
  @ApiQuery({ name: 'limit', required: false, example: '5' })
  async retryFailedExtractions(@Query('limit') limitRaw?: string): Promise<{
    attempted: number;
    articleIds: string[];
    results: FactExtractionResultDto[];
  }> {
    const limit = this.parseLimit(limitRaw, 5);
    const batch = await this.factsService.retryFailedExtractions(limit);
    const results: FactExtractionResultDto[] = [];

    for (const item of batch.results) {
      const facts: ExtractedFactDto[] = [];
      for (const fact of item.facts) {
        facts.push(toExtractedFactDto(fact));
      }
      results.push({
        run: toFactExtractionRunDto(item.run, item.reusedExisting),
        facts,
      });
    }

    return {
      attempted: batch.attempted,
      articleIds: batch.articleIds,
      results,
    };
  }

  @Post('extract/:articleId')
  @ApiOperation({
    summary: 'Extract structured facts/claims from a crawled article body',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    example: 'false',
    description: 'Re-run even if a completed extraction exists for the same body',
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
  @ApiOkResponse({ type: FactListResponseDto })
  async listRecent(
    @Query('limit') limitRaw?: string,
  ): Promise<FactListResponseDto> {
    const limit = this.parseLimit(limitRaw, 50);
    const rows = await this.factsService.listRecent(limit);
    const facts: ExtractedFactDto[] = [];

    for (const row of rows) {
      facts.push(toExtractedFactDto(row));
    }

    return { facts };
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
