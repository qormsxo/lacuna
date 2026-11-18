import {
  decodeGoogleNewsArticleUrl,
  isGoogleNewsWrapperUrl,
  resolveStoredArticleUrl,
} from './google-news-url';

describe('google-news-url', () => {
  it('detects google wrapper urls', () => {
    expect(
      isGoogleNewsWrapperUrl(
        'https://news.google.com/rss/articles/CBMiABC?oc=5',
      ),
    ).toBe(true);
    expect(isGoogleNewsWrapperUrl('https://n.news.naver.com/mnews/article/1')).toBe(
      false,
    );
  });

  it('decodes publisher url embedded in base64 token', () => {
    const publisher = 'https://www.example.com/news/123';
    const token = Buffer.from(`xx${publisher}\u0000yy`, 'utf8')
      .toString('base64')
      .replace(/\+/gu, '-')
      .replace(/\//gu, '_')
      .replace(/=+$/u, '');

    const decoded = decodeGoogleNewsArticleUrl(
      `https://news.google.com/rss/articles/${token}?oc=5`,
    );

    expect(decoded).toBe(publisher);
  });

  it('leaves non-google urls unchanged', () => {
    const url = 'https://v.daum.net/v/1';
    expect(resolveStoredArticleUrl(url)).toBe(url);
  });
});
