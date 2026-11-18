import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not configured');
}

// 백엔드에 API_KEY를 설정했다면 같은 값을 VITE_API_KEY로 넣어 준다.
const apiKey = import.meta.env.VITE_API_KEY;

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (apiKey) {
  headers['x-api-key'] = apiKey;
}

export const apiClient = axios.create({
  baseURL,
  headers,
  timeout: 60_000,
});
