import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { HtmlFetcher, HtmlFetchResult } from '../http/html-fetcher';
import { DaumNewsCollector } from './daum-news.collector';

class FakeHtmlFetcher extends HtmlFetcher {
  constructor(private readonly bodies: Map<string, string>) {
    super(
      new ConfigService({
        news: { httpTimeoutMs: 1000, userAgent: 'test' },
      }),
    );
  }

  fetchHtml(url: string): Promise<HtmlFetchResult> {
    const body = this.bodies.get(url);

    if (body === undefined) {
      return Promise.resolve({
        status: 'failure',
        url,
        errorCode: 'NETWORK_ERROR',
        message: `missing fixture for ${url}`,
      });
    }

    return Promise.resolve({
      status: 'success',
      url,
      finalUrl: url,
      statusCode: 200,
      body,
    });
  }
}

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('DaumNewsCollector', () => {
  it('parses section page markup', async () => {
    const fetcher = new FakeHtmlFetcher(
      new Map([
        ['https://news.daum.net/politics', fixture('daum-section.html')],
      ]),
    );

    const collector = new DaumNewsCollector(fetcher);
    const result = await collector.collect({ category: '정치' });

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.articles.length).toBeGreaterThanOrEqual(2);
    expect(result.articles[0]?.source).toBe('daum');
    expect(
      result.articles.some((article) => article.publisher === '뉴스1'),
    ).toBe(true);
  });

  it('parses sports search markup', async () => {
    const fetcher = new FakeHtmlFetcher(
      new Map([
        [
          'https://search.daum.net/search?w=news&q=%EC%8A%A4%ED%8F%AC%EC%B8%A0',
          fixture('daum-search.html'),
        ],
      ]),
    );

    const collector = new DaumNewsCollector(fetcher);
    const result = await collector.collect({ category: '스포츠' });

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.title).toBe('스포츠산업의 미래');
    expect(result.articles[0]?.publisher).toBe('스포티비뉴스');
  });

  it('continues when one of multiple category URLs fails', async () => {
    const fetcher = new FakeHtmlFetcher(
      new Map([
        ['https://news.daum.net/culture', fixture('daum-section.html')],
      ]),
    );

    const collector = new DaumNewsCollector(fetcher);
    const result = await collector.collect({ category: '생활/문화' });

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.articles.length).toBeGreaterThan(0);
  });
});
