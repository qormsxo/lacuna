import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
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
  toArticleResponse,
  toCrawlHistoryItem,
} from './articles/article.mapper';
import { ArticleService } from './articles/article.service';
import { NEWS_CATEGORIES, isNewsCategory } from './constants/categories';
import { isCrawlStatus } from './constants/crawl-status';
import { NEWS_SOURCES, isNewsSource, NewsSource } from './constants/sources';
import { CrawlService } from './crawl/crawl.service';
import {
  ArticleListResponseDto,
  ArticleResponseDto,
  CrawlRunResponseDto,
} from './dto/crawl-result.dto';
import {
  CategoryListResponseDto,
  CollectResponseDto,
} from './dto/collect-result.dto';
import {
  CollectionJobStatusDto,
  CrawlHistoryListDto,
  CrawlStatusSummaryDto,
} from './dto/job-status.dto';
import { CrawlHistoryService } from './jobs/crawl-history.service';
import { NewsService } from './news.service';
import { CollectionSchedulerService } from './schedule/collection-scheduler.service';

@ApiTags('news')
@Controller({ path: 'news', version: '1' })
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly articleService: ArticleService,
    private readonly crawlService: CrawlService,
    private readonly crawlHistoryService: CrawlHistoryService,
    private readonly collectionSchedulerService: CollectionSchedulerService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'List supported news categories' })
  @ApiOkResponse({ type: CategoryListResponseDto })
  listCategories(): CategoryListResponseDto {
    return {
      categories: [...NEWS_CATEGORIES],
    };
  }

  @Get('collect')
  @ApiOperation({
    summary: 'Collect news list items for a category from configured sources',
  })
  @ApiQuery({ name: 'category', required: true, example: '정치' })
  @ApiQuery({
    name: 'sources',
    required: false,
    example: 'google,naver,daum',
    description: 'Comma-separated source ids',
  })
  @ApiOkResponse({ type: CollectResponseDto })
  collect(
    @Query('category') category: string,
    @Query('sources') sources?: string,
  ): Promise<CollectResponseDto> {
    if (!isNewsCategory(category)) {
      throw new BadRequestException(
        `Unsupported category: ${category}. Allowed: ${NEWS_CATEGORIES.join(', ')}`,
      );
    }

    const selectedSources = this.parseSources(sources);

    return this.newsService.collect(category, selectedSources);
  }

  @Post('crawl/run')
  @ApiOperation({
    summary: 'Crawl pending collected article bodies in a limited batch',
  })
  @ApiQuery({ name: 'limit', required: false, example: '5' })
  @ApiOkResponse({ type: CrawlRunResponseDto })
  async runCrawl(
    @Query('limit') limitRaw?: string,
  ): Promise<CrawlRunResponseDto> {
    const limit = this.parseLimit(limitRaw, 5);
    const result = await this.crawlService.runBatch(limit);
    const articles: ArticleResponseDto[] = [];

    for (const article of result.articles) {
      articles.push(toArticleResponse(article));
    }

    return {
      requested: result.requested,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      inaccessible: result.inaccessible,
      retryWaiting: result.retryWaiting,
      articles,
    };
  }

  @Get('crawl/status')
  @ApiOperation({ summary: 'Get crawl status counts for stored articles' })
  @ApiOkResponse({ type: CrawlStatusSummaryDto })
  getCrawlStatus(): Promise<CrawlStatusSummaryDto> {
    return this.articleService.countByCrawlStatus();
  }

  @Get('jobs/status')
  @ApiOperation({ summary: 'Get collection job scheduler and run status' })
  @ApiOkResponse({ type: CollectionJobStatusDto })
  async getJobStatus(): Promise<CollectionJobStatusDto> {
    const overview = await this.crawlHistoryService.getJobStatusOverview();
    const latest = [];

    for (const item of overview.latest) {
      latest.push(toCrawlHistoryItem(item));
    }

    return {
      scheduleEnabled: this.collectionSchedulerService.isEnabled(),
      cronJobs: this.collectionSchedulerService.listCronNames(),
      runningCollect:
        overview.runningCollect === null
          ? null
          : toCrawlHistoryItem(overview.runningCollect),
      runningCrawl:
        overview.runningCrawl === null
          ? null
          : toCrawlHistoryItem(overview.runningCrawl),
      latest,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List recent collection and crawl jobs' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiOkResponse({ type: CrawlHistoryListDto })
  async listJobs(
    @Query('limit') limitRaw?: string,
  ): Promise<CrawlHistoryListDto> {
    const limit = this.parseLimit(limitRaw, 20);
    const rows = await this.crawlHistoryService.findRecent(limit);
    const jobs = [];

    for (const row of rows) {
      jobs.push(toCrawlHistoryItem(row));
    }

    return { jobs };
  }


  @Get('articles')
  @ApiOperation({
    summary: 'List stored articles with optional category and date filters',
  })
  @ApiQuery({ name: 'crawlStatus', required: false, example: 'pending' })
  @ApiQuery({ name: 'category', required: false, example: '정치' })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-11-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-11-17T23:59:59.000Z',
  })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'offset', required: false, example: '0' })
  @ApiOkResponse({ type: ArticleListResponseDto })
  async listArticles(
    @Query('crawlStatus') crawlStatus?: string,
    @Query('category') category?: string,
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ): Promise<ArticleListResponseDto> {
    if (crawlStatus !== undefined && !isCrawlStatus(crawlStatus)) {
      throw new BadRequestException(`Unsupported crawlStatus: ${crawlStatus}`);
    }

    if (category !== undefined && !isNewsCategory(category)) {
      throw new BadRequestException(
        `Unsupported category: ${category}. Allowed: ${NEWS_CATEGORIES.join(', ')}`,
      );
    }

    const from = this.parseOptionalDate(fromRaw, 'from');
    const to = this.parseOptionalDate(toRaw, 'to');
    const limit = this.parseLimit(limitRaw, 20);
    const offset = this.parseOffset(offsetRaw);

    const rows = await this.articleService.findMany({
      crawlStatus,
      category,
      from,
      to,
      limit,
      offset,
    });

    const articles: ArticleResponseDto[] = [];

    for (const row of rows) {
      articles.push(toArticleResponse(row));
    }

    return { articles };
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Get one stored article including crawl result' })
  @ApiOkResponse({ type: ArticleResponseDto })
  async getArticle(@Param('id') id: string): Promise<ArticleResponseDto> {
    const article = await this.articleService.findById(id);

    if (article === null) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    return toArticleResponse(article);
  }

  private parseSources(rawSources: string | undefined): NewsSource[] {
    if (rawSources === undefined || rawSources.trim().length === 0) {
      return [...NEWS_SOURCES];
    }

    const parts = rawSources.split(',');
    const selected: NewsSource[] = [];

    for (const part of parts) {
      const value = part.trim();

      if (value.length === 0) {
        continue;
      }

      if (!isNewsSource(value)) {
        throw new BadRequestException(
          `Unsupported source: ${value}. Allowed: ${NEWS_SOURCES.join(', ')}`,
        );
      }

      if (!selected.includes(value)) {
        selected.push(value);
      }
    }

    if (selected.length === 0) {
      throw new BadRequestException('At least one valid source is required');
    }

    return selected;
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

  private parseOffset(raw: string | undefined): number {
    if (raw === undefined || raw.trim().length === 0) {
      return 0;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('offset must be an integer >= 0');
    }

    return value;
  }

  private parseOptionalDate(
    raw: string | undefined,
    fieldName: string,
  ): Date | undefined {
    if (raw === undefined || raw.trim().length === 0) {
      return undefined;
    }

    const value = new Date(raw);

    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return value;
  }
}
