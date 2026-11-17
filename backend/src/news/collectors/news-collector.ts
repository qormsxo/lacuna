import { NewsCategory } from '../constants/categories';
import { NewsSource } from '../constants/sources';
import { CollectorResult } from '../dto/collect-result.dto';

export type CollectRequest = {
  category: NewsCategory;
};

export interface NewsCollector {
  readonly source: NewsSource;
  collect(request: CollectRequest): Promise<CollectorResult>;
}

export const NEWS_COLLECTORS = Symbol('NEWS_COLLECTORS');
