import { extractArticleKey, normalizeArticleUrl } from './url';

describe('normalizeArticleUrl', () => {
  it('strips tracking params and hash', () => {
    const normalized = normalizeArticleUrl(
      'https://Example.com/news/1/?utm_source=x&id=2#section',
    );

    expect(normalized).toBe('https://example.com/news/1?id=2');
  });

  it('extracts naver and daum article keys', () => {
    expect(
      extractArticleKey('https://n.news.naver.com/mnews/article/001/000123'),
    ).toBe('naver:001:000123');
    expect(extractArticleKey('https://v.daum.net/v/20261117123456')).toBe(
      'daum:20261117123456',
    );
  });
});
