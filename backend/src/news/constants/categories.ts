export const NEWS_CATEGORIES = [
  '정치',
  '경제',
  '사회',
  '생활/문화',
  '세계',
  'IT/과학',
  '연예',
  '스포츠',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export function isNewsCategory(value: string): value is NewsCategory {
  for (const category of NEWS_CATEGORIES) {
    if (category === value) {
      return true;
    }
  }

  return false;
}
