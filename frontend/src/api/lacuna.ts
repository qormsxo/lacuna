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

export async function fetchArticles(limit = 50): Promise<Article[]> {
  const response = await apiClient.get<{ articles: Article[] }>(
    '/news/articles',
    { params: { limit } },
  );
  return response.data.articles;
}

export async function fetchFacts(limit = 50): Promise<Fact[]> {
  const response = await apiClient.get<{ facts: Fact[] }>('/facts', {
    params: { limit },
  });
  return response.data.facts;
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
