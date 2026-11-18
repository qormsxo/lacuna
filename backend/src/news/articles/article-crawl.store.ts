import { NewsArticleEntity } from '../entities/news-article.entity';
import { ExtractedArticleBody } from '../crawl/extractors/extraction-types';
import { CrawlStatus } from '../constants/crawl-status';

export type ArticleCrawlStore = {
  findCrawlCandidates(
    limit: number,
    source?: string,
    options?: { force?: boolean; category?: string },
  ): Promise<NewsArticleEntity[]>;
  findById(id: string): Promise<NewsArticleEntity | null>;
  markCrawling(ids: string[]): Promise<void>;
  markSuccess(
    article: NewsArticleEntity,
    extracted: ExtractedArticleBody,
  ): Promise<NewsArticleEntity>;
  markFailure(
    article: NewsArticleEntity,
    params: {
      errorCode: string;
      message: string;
      inaccessible: boolean;
      maxAttempts: number;
      retryDelayMs: number;
    },
  ): Promise<NewsArticleEntity>;
  findMany(params: {
    crawlStatus?: CrawlStatus;
    category?: string;
    source?: string;
    q?: string;
    from?: Date;
    to?: Date;
    limit: number;
    offset?: number;
  }): Promise<NewsArticleEntity[]>;
  countByCrawlStatus(): Promise<Record<CrawlStatus, number>>;
};

export const ARTICLE_CRAWL_STORE = Symbol('ARTICLE_CRAWL_STORE');
