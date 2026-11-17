import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NaverBodyExtractor } from './naver-body.extractor';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('NaverBodyExtractor', () => {
  it('extracts title, publisher, author, dates, and body', () => {
    const extractor = new NaverBodyExtractor();

    const result = extractor.extract(
      fixture('naver-article.html'),
      'https://n.news.naver.com/mnews/article/001/1',
    );

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.data.title).toContain('울산 동구');
    expect(result.data.publisher).toBe('연합뉴스');
    expect(result.data.author).toContain('장지현');
    expect(result.data.publishedAt).toBe('2026-11-17 11:28:57');
    expect(result.data.modifiedAt).toBe('2026-11-17 11:29:15');
    expect(result.data.body).toContain('4천404억원');
    expect(result.data.body).not.toContain('추천 기사 영역');
    expect(result.data.body).not.toContain('console.log');
  });

  it('fails when body container is missing', () => {
    const extractor = new NaverBodyExtractor();

    const result = extractor.extract(
      '<html><body><p>no article</p></body></html>',
      'https://n.news.naver.com/mnews/article/001/1',
    );

    expect(result.status).toBe('failure');

    if (result.status !== 'failure') {
      return;
    }

    expect(result.errorCode).toBe('STRUCTURE_CHANGED');
  });
});
