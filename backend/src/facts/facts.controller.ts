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
