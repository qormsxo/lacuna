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
  HypothesisDetailDto,
  HypothesisDto,
  HypothesisGenerationResultDto,
  HypothesisListResponseDto,
  HypothesisReevaluationBatchDto,
  HypothesisReevaluationDto,
  HypothesisReevaluationListDto,
  HypothesisRelatedArticleDto,
  HypothesisRelatedFactDto,
  HypothesisStatusHistoryDto,
} from './dto/hypothesis.dto';
import { HypothesisReevaluationService } from './hypothesis-reevaluation.service';
import {
  toHypothesisDto,
  toHypothesisGenerationRunDto,
  toHypothesisReevaluationDto,
  toHypothesisRelatedArticleDto,
  toHypothesisRelatedFactDto,
  toHypothesisStatusHistoryDto,
} from './hypothesis.mapper';
import { HypothesisService } from './hypothesis.service';

@ApiTags('hypotheses')
@Controller({ path: 'hypotheses', version: '1' })
export class HypothesisController {
  constructor(
    private readonly hypothesisService: HypothesisService,
    private readonly reevaluationService: HypothesisReevaluationService,
  ) {}

  @Post('generate')
  @ApiOperation({
    summary:
      'Generate new hypotheses by connecting facts across different articles',
  })
  @ApiQuery({
    name: 'factIds',
    required: false,
    description: 'Comma-separated fact IDs. Defaults to recent accepted facts.',
  })
  @ApiQuery({ name: 'force', required: false, example: 'false' })
  @ApiOkResponse({ type: HypothesisGenerationResultDto })
  async generate(
    @Query('factIds') factIdsRaw?: string,
    @Query('force') forceRaw?: string,
  ): Promise<HypothesisGenerationResultDto> {
    const factIds = this.parseFactIds(factIdsRaw);
    const force = forceRaw === 'true' || forceRaw === '1';
    const result = await this.hypothesisService.generate(factIds, force);
    const hypotheses: HypothesisDto[] = [];

    for (const item of result.hypotheses) {
      hypotheses.push(toHypothesisDto(item));
    }

    return {
      run: toHypothesisGenerationRunDto(result.run, result.reusedExisting),
      hypotheses,
    };
  }

  @Post('reevaluate/:articleId')
  @ApiOperation({
    summary:
      'Extract facts from a new article if needed, then reevaluate related hypotheses',
  })
  @ApiQuery({ name: 'force', required: false, example: 'false' })
  @ApiOkResponse({ type: HypothesisReevaluationBatchDto })
  async reevaluate(
    @Param('articleId') articleId: string,
    @Query('force') forceRaw?: string,
  ): Promise<HypothesisReevaluationBatchDto> {
    const force = forceRaw === 'true' || forceRaw === '1';
    const result = await this.reevaluationService.reevaluateForArticle(
      articleId,
      force,
    );
    const assessments: HypothesisReevaluationDto[] = [];

    for (const item of result.assessments) {
      assessments.push(toHypothesisReevaluationDto(item));
    }

    return {
      articleId: result.articleId,
      extractedFactCount: result.extractedFactCount,
      candidateHypothesisCount: result.candidateHypothesisCount,
      skippedDuplicates: result.skippedDuplicates,
      assessments,
    };
  }

  @Get('reevaluations')
  @ApiOperation({ summary: 'List recent hypothesis reevaluations' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'hypothesisId', required: false })
  @ApiOkResponse({ type: HypothesisReevaluationListDto })
  async listReevaluations(
    @Query('limit') limitRaw?: string,
    @Query('hypothesisId') hypothesisId?: string,
  ): Promise<HypothesisReevaluationListDto> {
    const limit = this.parseLimit(limitRaw, 20);
    const rows =
      hypothesisId !== undefined && hypothesisId.trim().length > 0
        ? await this.reevaluationService.listByHypothesis(hypothesisId)
        : await this.reevaluationService.listRecent(limit);
    const reevaluations: HypothesisReevaluationDto[] = [];

    for (const row of rows) {
      reevaluations.push(toHypothesisReevaluationDto(row));
    }

    return { reevaluations };
  }

  @Get()
  @ApiOperation({ summary: 'List generated hypotheses' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiOkResponse({ type: HypothesisListResponseDto })
  async list(
    @Query('limit') limitRaw?: string,
  ): Promise<HypothesisListResponseDto> {
    const limit = this.parseLimit(limitRaw, 20);
    const rows = await this.hypothesisService.list(limit);
    const hypotheses: HypothesisDto[] = [];

    for (const row of rows) {
      hypotheses.push(toHypothesisDto(row));
    }

    return { hypotheses };
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get one hypothesis with related facts, source articles, status history, and uncertainty',
  })
  @ApiOkResponse({ type: HypothesisDetailDto })
  async getDetail(@Param('id') id: string): Promise<HypothesisDetailDto> {
    const detail = await this.hypothesisService.getDetail(id);
    const relatedFacts: HypothesisRelatedFactDto[] = [];
    const relatedArticles: HypothesisRelatedArticleDto[] = [];
    const statusHistory: HypothesisStatusHistoryDto[] = [];

    for (const fact of detail.relatedFacts) {
      relatedFacts.push(toHypothesisRelatedFactDto(fact));
    }

    for (const article of detail.relatedArticles) {
      relatedArticles.push(toHypothesisRelatedArticleDto(article));
    }

    for (const history of detail.statusHistory) {
      statusHistory.push(toHypothesisStatusHistoryDto(history));
    }

    return {
      hypothesis: toHypothesisDto(detail.hypothesis),
      relatedFacts,
      relatedArticles,
      statusHistory,
    };
  }

  private parseFactIds(raw: string | undefined): string[] | undefined {
    if (raw === undefined || raw.trim().length === 0) {
      return undefined;
    }

    const parts = raw.split(',');
    const ids: string[] = [];

    for (const part of parts) {
      const value = part.trim();

      if (value.length === 0) {
        continue;
      }

      if (!ids.includes(value)) {
        ids.push(value);
      }
    }

    if (ids.length === 0) {
      throw new BadRequestException('factIds must include at least one id');
    }

    return ids;
  }

  private parseLimit(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw.trim().length === 0) {
      return fallback;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value <= 0 || value > 50) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 50',
      );
    }

    return value;
  }
}
