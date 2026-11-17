export const NEWS_SOURCES = ['google', 'naver', 'daum'] as const;

export type NewsSource = (typeof NEWS_SOURCES)[number];

export function isNewsSource(value: string): value is NewsSource {
  for (const source of NEWS_SOURCES) {
    if (source === value) {
      return true;
    }
  }

  return false;
}
