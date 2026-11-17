import { ArticleDto } from '../dto/article.dto';
import { NewsArticleEntity } from '../entities/news-article.entity';

export type UpsertCollectedResult = {
  articles: NewsArticleEntity[];
  createdCount: number;
  updatedCount: number;
  duplicateCount: number;
};

export type ArticleCollectionStore = {
  upsertCollectedArticles(articles: ArticleDto[]): Promise<UpsertCollectedResult>;
};

export const ARTICLE_COLLECTION_STORE = Symbol('ARTICLE_COLLECTION_STORE');
