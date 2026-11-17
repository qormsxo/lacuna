import { apiClient } from './client';

export type HealthStatus = {
  status: string;
  database: string;
  timestamp: string;
};

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await apiClient.get<HealthStatus>('/health');

  return response.data;
}
