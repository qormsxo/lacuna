import { apiClient } from './client';
import type {
  Article,
  ArticleDetail,
  BackgroundAccepted,
  DashboardSummary,
  Fact,
  Hypothesis,
  HypothesisDetail,
  Paged,
  PipelineStatus,
  Relation,
  TaskRecord,
  Verification,
} from './types';

// 오래 걸리는 작업은 모두 `background=true`로 시작하고 /tasks/:id를 폴링한다.
// 그래서 HTTP 타임아웃은 기본값(60초)이면 충분하다.
const BACKGROUND = { background: true } as const;

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
  return response.data;
}

// ---------- tasks / pipeline ----------

export async function fetchTask(id: string): Promise<TaskRecord> {
  const response = await apiClient.get<TaskRecord>(`/tasks/${id}`);
  return response.data;
}

export async function fetchTasks(limit = 20): Promise<TaskRecord[]> {
  const response = await apiClient.get<{ tasks: TaskRecord[] }>('/tasks', {
    params: { limit },
  });
  return response.data.tasks;
}

/** 백그라운드 작업이 끝날 때까지 폴링하고 결과를 돌려준다. 실패하면 throw. */
export async function waitForTask<T>(
  taskId: string,
  intervalMs = 2000,
): Promise<T> {
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const task = await fetchTask(taskId);

    if (task.status === 'completed') {
      return task.result as T;
    }

    if (task.status === 'failed') {
      throw new Error(task.error ?? '작업 실패');
    }
  }
}

export async function runPipeline(): Promise<BackgroundAccepted> {
  const response = await apiClient.post<BackgroundAccepted>('/pipeline/run');
  return response.data;
}

export async function fetchPipelineStatus(): Promise<PipelineStatus> {
  const response = await apiClient.get<PipelineStatus>('/pipeline/status');
  return response.data;
}

// ---------- news ----------

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

export async function fetchArticle(id: string): Promise<ArticleDetail> {
  const response = await apiClient.get<ArticleDetail>(`/news/articles/${id}`);
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
  const response = await apiClient.post<{ summary: CollectSummary }>(
    '/news/collect',
    undefined,
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

export type CrawlRunResult = {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  retryWaiting: number;
};

export async function startCrawl(
  limit = 20,
  source?: string,
  category?: string,
): Promise<BackgroundAccepted> {
  const response = await apiClient.post<BackgroundAccepted>(
    '/news/crawl/run',
    undefined,
    { params: { limit, source, category, force: true, ...BACKGROUND } },
  );
  return response.data;
}

/** 크롤을 백그라운드로 시작하고 끝날 때까지 기다린다. */
export async function crawlPendingArticles(
  limit = 20,
  source?: string,
  category?: string,
): Promise<CrawlRunResult> {
  const { taskId } = await startCrawl(limit, source, category);
  return waitForTask<CrawlRunResult>(taskId);
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

// ---------- facts ----------

export async function fetchFactsPage(options: {
  limit: number;
  offset: number;
  reviewStatus?: string;
  q?: string;
}): Promise<Paged<Fact>> {
  const response = await apiClient.get<{ facts: Fact[]; total?: number }>(
    '/facts',
    {
      params: {
        limit: options.limit,
        offset: options.offset,
        reviewStatus: options.reviewStatus || undefined,
        q: options.q || undefined,
      },
    },
  );
  return {
    items: response.data.facts,
    total: response.data.total ?? response.data.facts.length,
  };
}

export async function fetchFactsByArticle(articleId: string): Promise<Fact[]> {
  const response = await apiClient.get<{ facts: Fact[] }>(
    `/facts/article/${articleId}`,
  );
  return response.data.facts;
}

export async function extractFactsForArticle(
  articleId: string,
  force = false,
): Promise<{
  run: { status: string; acceptedCount: number; reviewCount: number };
  facts: Fact[];
}> {
  const response = await apiClient.post(
    `/facts/extract/${articleId}`,
    undefined,
    { params: { force }, timeout: 180_000 },
  );
  return response.data;
}

export type ExtractPendingResult = {
  attempted: number;
  extracted: number;
  failed: number;
  articleIds: string[];
};

export async function startExtractPending(
  limit = 10,
  category?: string,
): Promise<BackgroundAccepted> {
  const response = await apiClient.post<BackgroundAccepted>(
    '/facts/extract/pending',
    undefined,
    { params: { limit, category, ...BACKGROUND } },
  );
  return response.data;
}

// ---------- analysis ----------

export type AnalysisRunResult = {
  run: {
    status: string;
    verificationCount: number;
    relationCount: number;
    reusedExisting: boolean;
    factIds?: string[];
  };
  verifications: Verification[];
  relations: Relation[];
};

export async function startAnalysis(force = false): Promise<BackgroundAccepted> {
  const response = await apiClient.post<BackgroundAccepted>(
    '/analysis/run',
    undefined,
    { params: { force, ...BACKGROUND } },
  );
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

export async function fetchRelationsPage(options: {
  limit: number;
  offset: number;
  relationType?: string;
}): Promise<Paged<Relation>> {
  const response = await apiClient.get<{
    relations: Relation[];
    total?: number;
  }>('/analysis/relations', {
    params: {
      limit: options.limit,
      offset: options.offset,
      relationType: options.relationType || undefined,
    },
  });
  return {
    items: response.data.relations,
    total: response.data.total ?? response.data.relations.length,
  };
}

export async function fetchRelationsByFact(factId: string): Promise<Relation[]> {
  const response = await apiClient.get<{ relations: Relation[] }>(
    '/analysis/relations',
    { params: { factId } },
  );
  return response.data.relations;
}

// ---------- hypotheses ----------

export type HypothesisGenerationResult = {
  run: {
    status: string;
    hypothesisCount: number;
    skippedCount: number;
    reusedExisting: boolean;
  };
  hypotheses: Hypothesis[];
};

export async function startHypothesisGeneration(
  force = false,
): Promise<BackgroundAccepted> {
  const response = await apiClient.post<BackgroundAccepted>(
    '/hypotheses/generate',
    undefined,
    { params: { force, ...BACKGROUND } },
  );
  return response.data;
}

export async function fetchHypothesesPage(options: {
  limit: number;
  offset: number;
  status?: string;
}): Promise<Paged<Hypothesis>> {
  const response = await apiClient.get<{
    hypotheses: Hypothesis[];
    total?: number;
  }>('/hypotheses', {
    params: {
      limit: options.limit,
      offset: options.offset,
      status: options.status || undefined,
    },
  });
  return {
    items: response.data.hypotheses,
    total: response.data.total ?? response.data.hypotheses.length,
  };
}

export async function fetchHypothesisDetail(
  id: string,
): Promise<HypothesisDetail> {
  const response = await apiClient.get<HypothesisDetail>(`/hypotheses/${id}`);
  return response.data;
}

export async function reevaluateForArticle(articleId: string): Promise<{
  extractedFactCount: number;
  candidateHypothesisCount: number;
  skippedDuplicates: number;
  assessments: unknown[];
}> {
  const response = await apiClient.post(
    `/hypotheses/reevaluate/${articleId}`,
    undefined,
    { timeout: 300_000 },
  );
  return response.data;
}
