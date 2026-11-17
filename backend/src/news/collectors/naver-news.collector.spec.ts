import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { HtmlFetcher, HtmlFetchResult } from '../http/html-fetcher';
import { NaverNewsCollector } from './naver-news.collector';

class FakeHtmlFetcher extends HtmlFetcher {
  constructor(private readonly resultFactory: () => Promise<HtmlFetchResult>) {
    super(
      new ConfigService({
        news: { httpTimeoutMs: 1000, userAgent: 'test' },
      }),
    );
  }

  fetchHtml(): Promise<HtmlFetchResult> {
    return this.resultFactory();
  }
}

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('NaverNewsCollector', () => {
  it('parses list page markup', async () => {
    const fetcher = new FakeHtmlFetcher(() =>
      Promise.resolve({
        status: 'success',
        url: 'https://news.naver.com/example',
        finalUrl: 'https://news.naver.com/example',
        statusCode: 200,
        body: fixture('naver-list.html'),
      }),
    );

    const collector = new NaverNewsCollector(fetcher);
    const result = await collector.collect({ category: '정치' });

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.articles).toHaveLength(2);
    expect(result.articles[0]?.title).toBe('첫 번째 기사 제목');
    expect(result.articles[0]?.publisher).toBe('연합뉴스');
    expect(result.articles[0]?.summary).toContain('첫 번째 기사 요약');
  });

  it('parses search page markup for entertainment', async () => {
    const fetcher = new FakeHtmlFetcher(() =>
      Promise.resolve({
        status: 'success',
        url: 'https://search.naver.com/example',
        finalUrl: 'https://search.naver.com/example',
        statusCode: 200,
        body: fixture('naver-search.html'),
      }),
    );

    const collector = new NaverNewsCollector(fetcher);
    const result = await collector.collect({ category: '연예' });

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.articles.length).toBeGreaterThan(0);
    expect(
      result.articles.some((article) =>
        article.title.includes('연예 기사 제목'),
      ),
    ).toBe(true);
  });

  it('returns network failure from fetcher', async () => {
    const fetcher = new FakeHtmlFetcher(() =>
      Promise.resolve({
        status: 'failure',
        url: 'https://news.naver.com/example',
        errorCode: 'TIMEOUT',
        message: 'timed out',
      }),
    );

    const collector = new NaverNewsCollector(fetcher);
    const result = await collector.collect({ category: '경제' });

    expect(result.status).toBe('failure');

    if (result.status !== 'failure') {
      return;
    }

    expect(result.errorCode).toBe('TIMEOUT');
  });

  it('throws structure error when list markup is empty', () => {
    const collector = new NaverNewsCollector(
      new FakeHtmlFetcher(() =>
        Promise.resolve({
          status: 'success',
          url: 'x',
          finalUrl: 'x',
          statusCode: 200,
          body: '<html></html>',
        }),
      ),
    );

    expect(() => collector.parseListPage('<html></html>')).toThrow(
      /selectors matched no items/u,
    );
  });
});
