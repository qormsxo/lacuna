import { apiClient } from './client';
import type {
  Article,
  DashboardSummary,
  Fact,
  Hypothesis,
  HypothesisDetail,
  Relation,
  Verification,
} from './types';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
  return response.data;
}

export type ArticlePage = {
  articles: Article[];
  total: number;
  limit: number;
  offset: number;
};

export async function fetchArticles(
  limit = 20,
  offset = 0,
  filters?: {
    source?: string;
    category?: string;
    crawlStatus?: string;
    q?: string;
  },
): Promise<ArticlePage> {
  const response = await apiClient.get<ArticlePage>('/news/articles', {
    params: {
      limit,
      offset,
      source: filters?.source,
      category: filters?.category,
      crawlStatus: filters?.crawlStatus,
      q: filters?.q,
    },
  });
  return response.data;
}

export async function fetchNewsCategories(): Promise<string[]> {
  const response = await apiClient.get<{ categories: string[] }>(
    '/news/categories',
  );
  return response.data.categories;
}

export type CollectSummary = {
  successCount: number;
  failureCount: number;
  articleCount: number;
  filteredOutCount: number;
  createdCount: number;
  updatedCount: number;
  duplicateCount: number;
};

export async function collectNews(
  category: string,
  sources: string[],
): Promise<{ summary: CollectSummary }> {
  const response = await apiClient.get<{ summary: CollectSummary }>(
    '/news/collect',
    {
      params: {
        category,
        sources: sources.join(','),
      },
      timeout: 120_000,
    },
  );
  return response.data;
}

export async function deleteArticles(ids: string[]): Promise<{
  deletedArticleCount: number;
  deletedFactCount: number;
  deletedHypothesisCount: number;
}> {
  const response = await apiClient.delete('/news/articles', {
    data: { ids },
  });
  return response.data;
}

export async function crawlPendingArticles(
  limit = 20,
  source?: string,
  category?: string,
): Promise<{
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  retryWaiting: number;
}> {
  const response = await apiClient.post('/news/crawl/run', undefined, {
    params: { limit, source, category, force: true },
    // Large batches are slow (concurrency + per-article delay).
    timeout: Math.min(1_800_000, 60_000 + limit * 20_000),
  });
  return response.data;
}

export async function retryCollectFailures(
  limit = 10,
): Promise<{ attempted: number }> {
  const response = await apiClient.post(
    '/news/collect/retry-failures',
    undefined,
    { params: { limit }, timeout: 180_000 },
  );
  return response.data;
}

export async function fetchFacts(limit = 50): Promise<Fact[]> {
  const response = await apiClient.get<{ facts: Fact[] }>('/facts', {
    params: { limit },
  });
  return response.data.facts;
}

export async function extractFactsForArticle(
  articleId: string,
  force = false,
): Promise<{ run: { status: string; acceptedCount: number; reviewCount: number }; facts: Fact[] }> {
  const response = await apiClient.post(
    `/facts/extract/${articleId}`,
    undefined,
    { params: { force }, timeout: 180_000 },
  );
  return response.data;
}

export async function extractFactsFromSuccessfulArticles(
  limit = 10,
  category?: string,
): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  articleIds: string[];
}> {
  const response = await apiClient.post(
    '/facts/extract/pending',
    undefined,
    {
      params: { limit, category },
      timeout: Math.min(1_800_000, 60_000 + limit * 60_000),
    },
  );

  return {
    attempted: response.data.attempted ?? 0,
    succeeded: response.data.extracted ?? 0,
    failed: response.data.failed ?? 0,
    articleIds: response.data.articleIds ?? [],
  };
}

export async function runAnalysis(force = false): Promise<{
  run: {
    status: string;
    verificationCount: number;
    relationCount: number;
    reusedExisting: boolean;
    factIds?: string[];
  };
  verifications: Verification[];
  relations: Relation[];
}> {
  const response = await apiClient.post('/analysis/run', undefined, {
    params: { force },
    timeout: 180_000,
  });
  return response.data;
}

export async function generateHypotheses(force = false): Promise<{
  run: {
    status: string;
    hypothesisCount: number;
    skippedCount: number;
    reusedExisting: boolean;
  };
  hypotheses: Hypothesis[];
}> {
  const response = await apiClient.post('/hypotheses/generate', undefined, {
    params: { force },
    timeout: 180_000,
  });
  return response.data;
}

export async function fetchVerifications(
  factId: string,
): Promise<Verification[]> {
  const response = await apiClient.get<{ verifications: Verification[] }>(
    '/analysis/verifications',
    { params: { factId } },
  );
  return response.data.verifications;
}

export async function fetchRelations(limit = 50): Promise<Relation[]> {
  const response = await apiClient.get<{ relations: Relation[] }>(
    '/analysis/relations',
    { params: { limit } },
  );
  return response.data.relations;
}

export async function fetchHypotheses(limit = 50): Promise<Hypothesis[]> {
  const response = await apiClient.get<{ hypotheses: Hypothesis[] }>(
    '/hypotheses',
    { params: { limit } },
  );
  return response.data.hypotheses;
}

export async function fetchHypothesisDetail(
  id: string,
): Promise<HypothesisDetail> {
  const response = await apiClient.get<HypothesisDetail>(`/hypotheses/${id}`);
  return response.data;
}
