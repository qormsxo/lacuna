import { Inject, Injectable } from '@nestjs/common';
import { ARTICLE_COLLECTION_STORE } from './articles/article-collection.store';
import type { ArticleCollectionStore } from './articles/article-collection.store';
import { NEWS_COLLECTORS, NewsCollector } from './collectors/news-collector';
import { NewsCategory } from './constants/categories';
import { NewsSource } from './constants/sources';
import { ArticleDto } from './dto/article.dto';
import {
  CollectResponseDto,
  CollectorFailureDto,
  CollectorSuccessDto,
} from './dto/collect-result.dto';

@Injectable()
export class NewsService {
  constructor(
    @Inject(NEWS_COLLECTORS)
    private readonly collectors: NewsCollector[],
    @Inject(ARTICLE_COLLECTION_STORE)
    private readonly articleStore: ArticleCollectionStore,
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

    for (const collector of selected) {
      const result = await collector.collect({ category });

      if (result.status === 'failure') {
        failures.push(result);
        continue;
      }

      successes.push(result);

      for (const article of result.articles) {
        if (seenUrls.has(article.url)) {
          continue;
        }

        seenUrls.add(article.url);
        articles.push(article);
      }
    }

    const upserted = await this.articleStore.upsertCollectedArticles(articles);

    return {
      category,
      collectedAt,
      successes,
      failures,
      articles,
      summary: {
        successCount: successes.length,
        failureCount: failures.length,
        articleCount: articles.length,
        createdCount: upserted.createdCount,
        updatedCount: upserted.updatedCount,
        duplicateCount: upserted.duplicateCount,
      },
    };
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
