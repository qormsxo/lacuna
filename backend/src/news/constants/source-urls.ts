import { NewsCategory } from './categories';

export type NaverSourceConfig =
  { kind: 'list'; url: string } | { kind: 'search'; url: string };

export const GOOGLE_NEWS_QUERIES: Record<NewsCategory, string> = {
  정치: '정치',
  경제: '경제',
  사회: '사회',
  '생활/문화': '생활 문화',
  세계: '국제',
  'IT/과학': 'IT 과학',
  연예: '연예',
  스포츠: '스포츠',
};

export const NAVER_SOURCE_URLS: Record<NewsCategory, NaverSourceConfig> = {
  정치: {
    kind: 'list',
    url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=100',
  },
  경제: {
    kind: 'list',
    url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=101',
  },
  사회: {
    kind: 'list',
    url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=102',
  },
  '생활/문화': {
    kind: 'list',
    url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=103',
  },
  세계: {
    kind: 'list',
    url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=104',
  },
  'IT/과학': {
    kind: 'list',
    url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=105',
  },
  연예: {
    kind: 'search',
    url: 'https://search.naver.com/search.naver?where=news&query=%EC%97%B0%EC%98%88',
  },
  스포츠: {
    kind: 'search',
    url: 'https://search.naver.com/search.naver?where=news&query=%EC%8A%A4%ED%8F%AC%EC%B8%A0',
  },
};

export const DAUM_SOURCE_URLS: Record<NewsCategory, readonly string[]> = {
  정치: ['https://news.daum.net/politics'],
  경제: ['https://news.daum.net/economy'],
  사회: ['https://news.daum.net/society'],
  '생활/문화': ['https://news.daum.net/culture', 'https://news.daum.net/life'],
  세계: ['https://news.daum.net/world'],
  'IT/과학': ['https://news.daum.net/tech'],
  연예: ['https://entertain.daum.net/'],
  // sports.daum.net pages are SPA shells without article markup in raw HTML.
  스포츠: [
    'https://search.daum.net/search?w=news&q=%EC%8A%A4%ED%8F%AC%EC%B8%A0',
  ],
};

export function googleNewsRssUrl(query: string): string {
  const encoded = encodeURIComponent(query);

  return `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
}
