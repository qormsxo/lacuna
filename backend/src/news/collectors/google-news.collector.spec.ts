import { GoogleNewsCollector } from './google-news.collector';
import { RssFeedLoader } from '../http/rss-feed-loader';

class FakeRssFeedLoader extends RssFeedLoader {
  constructor(
    private readonly feedFactory: () => Promise<{
      items?: Array<{
        title?: string;
        link?: string;
        pubDate?: string;
        contentSnippet?: string;
      }>;
    }>,
  ) {
    super();
  }

  parseUrl(): Promise<{
    items?: Array<{
      title?: string;
      link?: string;
      pubDate?: string;
      contentSnippet?: string;
    }>;
  }> {
    return this.feedFactory();
  }
}

describe('GoogleNewsCollector', () => {
  it('parses RSS items into ArticleDto values', async () => {
    const loader = new FakeRssFeedLoader(() =>
      Promise.resolve({
        items: [
          {
            title: '정치 뉴스 제목 - 조선일보',
            link: 'https://news.google.com/rss/articles/abc',
            pubDate: 'Mon, 16 Nov 2026 15:10:00 GMT',
            contentSnippet: '정치 뉴스 제목 조선일보',
          },
          {
            title: '중복 기사 - 한겨레',
            link: 'https://news.google.com/rss/articles/abc',
          },
        ],
      }),
    );

    const collector = new GoogleNewsCollector(loader);
    const result = await collector.collect({ category: '정치' });

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.title).toBe('정치 뉴스 제목');
    expect(result.articles[0]?.publisher).toBe('조선일보');
    expect(result.articles[0]?.source).toBe('google');
  });

  it('returns failure when RSS loading fails', async () => {
    const loader = new FakeRssFeedLoader(() =>
      Promise.reject(new Error('timeout while fetching feed')),
    );

    const collector = new GoogleNewsCollector(loader);
    const result = await collector.collect({ category: '경제' });

    expect(result.status).toBe('failure');

    if (result.status !== 'failure') {
      return;
    }

    expect(result.errorCode).toBe('TIMEOUT');
  });

  it('ignores items without title or link', () => {
    const collector = new GoogleNewsCollector(new RssFeedLoader());

    const articles = collector.parseFeed(
      {
        items: [
          { title: '만 제목' },
          { link: 'https://news.google.com/rss/articles/xyz' },
          {
            title: '정상 기사 - 연합뉴스',
            link: 'https://news.google.com/rss/articles/xyz',
          },
        ],
      },
      '사회',
      '2026-11-17T00:00:00.000Z',
    );

    expect(articles).toHaveLength(1);
    expect(articles[0]?.publisher).toBe('연합뉴스');
  });
});
