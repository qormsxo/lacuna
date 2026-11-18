import { Inject, Injectable, Logger } from '@nestjs/common';
import { ActivityFileLogger } from '../common/logging/activity-file.logger';
import { FailureFileLogger } from '../common/logging/failure-file.logger';
import { isRetryableCollectError } from '../common/logging/llm-error.util';
import { ARTICLE_COLLECTION_STORE } from './articles/article-collection.store';
import type { ArticleCollectionStore } from './articles/article-collection.store';
import { NEWS_COLLECTORS, NewsCollector } from './collectors/news-collector';
import { NEWS_CATEGORIES, NewsCategory, isNewsCategory } from './constants/categories';
import { NEWS_SOURCES, NewsSource, isNewsSource } from './constants/sources';
import { ArticleDto } from './dto/article.dto';
import {
  CollectResponseDto,
  CollectorFailureDto,
  CollectorSuccessDto,
} from './dto/collect-result.dto';
import { CategoryTitleFilterService } from './filters/category-title-filter.service';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    @Inject(NEWS_COLLECTORS)
    private readonly collectors: NewsCollector[],
    @Inject(ARTICLE_COLLECTION_STORE)
    private readonly articleStore: ArticleCollectionStore,
    private readonly activityFileLogger: ActivityFileLogger,
    private readonly failureFileLogger: FailureFileLogger,
    private readonly categoryTitleFilter: CategoryTitleFilterService,
  ) {}

  async collect(
    category: NewsCategory,
    sources: NewsSource[],
  ): Promise<CollectResponseDto> {
    const collectedAt = new Date().toISOString();
    const selected = this.selectCollectors(sources);
    const successes: CollectorSuccessDto[] = [];
    const failures: CollectorFailureDto[] = [];
    const articles: ArticleDto[] = [];
    const seenUrls = new Set<string>();

    this.logger.log(
      `Collect start category=${category} sources=${sources.join(',')}`,
    );
    await this.activityFileLogger.info('collect', 'Collect start', {
      category,
      sources,
    });

    for (const collector of selected) {
      const result = await collector.collect({ category });

      if (result.status === 'failure') {
        failures.push(result);
        this.logger.warn(
          `Collect failed source=${result.source} category=${result.category} code=${result.errorCode}: ${result.message}`,
        );
        await this.activityFileLogger.warn('collect', 'Collect source failed', {
          category: result.category,
          source: result.source,
          errorCode: result.errorCode,
          message: result.message,
        });
        await this.failureFileLogger.append({
          kind: 'collect',
          retryable: isRetryableCollectError(result.errorCode),
          errorCode: result.errorCode,
          message: result.message,
          category: result.category,
          source: result.source,
          stage: 'collect',
        });
        continue;
      }

      successes.push(result);
      this.logger.log(
        `Collect ok source=${result.source} category=${result.category} articles=${result.articles.length}`,
      );
      await this.activityFileLogger.info('collect', 'Collect source ok', {
        category: result.category,
        source: result.source,
        articleCount: result.articles.length,
      });

      for (const article of result.articles) {
        if (seenUrls.has(article.url)) {
          continue;
        }

        seenUrls.add(article.url);
        articles.push(article);
      }
    }

    const filtered = await this.categoryTitleFilter.filterByTitle(
      category,
      articles,
    );

    if (filtered.dropped > 0) {
      this.logger.log(
        `Collect title filter category=${category} dropped=${filtered.dropped} kept=${filtered.kept.length}`,
      );
      await this.activityFileLogger.info('collect', 'Collect title filter', {
        category,
        dropped: filtered.dropped,
        kept: filtered.kept.length,
      });
    }

    const upserted = await this.articleStore.upsertCollectedArticles(
      filtered.kept,
    );
    const summary = {
      successCount: successes.length,
      failureCount: failures.length,
      articleCount: filtered.kept.length,
      filteredOutCount: filtered.dropped,
      createdCount: upserted.createdCount,
      updatedCount: upserted.updatedCount,
      duplicateCount: upserted.duplicateCount,
    };

    this.logger.log(
      `Collect done category=${category} created=${summary.createdCount} updated=${summary.updatedCount} filteredOut=${summary.filteredOutCount} failures=${summary.failureCount}`,
    );
    await this.activityFileLogger.info('collect', 'Collect done', {
      category,
      ...summary,
    });

    return {
      category,
      collectedAt,
      successes,
      failures,
      articles: filtered.kept,
      summary,
    };
  }

  async retryCollectFailures(limit = 20): Promise<{
    attempted: number;
    results: CollectResponseDto[];
  }> {
    const entries = await this.failureFileLogger.readRecent('collect', limit * 3);
    const seen = new Set<string>();
    const results: CollectResponseDto[] = [];

    this.logger.log(`Collect retry-failures start limit=${limit}`);
    await this.activityFileLogger.info('collect', 'Collect retry-failures start', {
      limit,
    });

    for (const entry of entries) {
      if (!entry.retryable) {
        continue;
      }

      if (
        entry.category === undefined ||
        entry.source === undefined ||
        !isNewsCategory(entry.category) ||
        !isNewsSource(entry.source)
      ) {
        continue;
      }

      const key = `${entry.category}::${entry.source}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      results.push(await this.collect(entry.category, [entry.source]));

      if (results.length >= limit) {
        break;
      }
    }

    await this.activityFileLogger.info('collect', 'Collect retry-failures done', {
      attempted: results.length,
    });

    return {
      attempted: results.length,
      results,
    };
  }

  listCategories(): string[] {
    return [...NEWS_CATEGORIES];
  }

  listSources(): string[] {
    return [...NEWS_SOURCES];
  }

  private selectCollectors(sources: NewsSource[]): NewsCollector[] {
    const selected: NewsCollector[] = [];

    for (const collector of this.collectors) {
      if (sources.includes(collector.source)) {
        selected.push(collector);
      }
    }

    return selected;
  }
}
