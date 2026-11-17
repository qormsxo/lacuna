import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DaumBodyExtractor } from './daum-body.extractor';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('DaumBodyExtractor', () => {
  it('extracts title, publisher, author, publishedAt, and body', () => {
    const extractor = new DaumBodyExtractor();

    const result = extractor.extract(
      fixture('daum-article.html'),
      'https://v.daum.net/v/1',
    );

    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      return;
    }

    expect(result.data.title).toContain('백두산');
    expect(result.data.publisher).toBe('한국경제TV');
    expect(result.data.author).toBe('김현경');
    expect(result.data.publishedAt).toContain('2026');
    expect(result.data.body).toContain('관광지구');
    expect(result.data.body).not.toContain('관련 뉴스');
  });
});
