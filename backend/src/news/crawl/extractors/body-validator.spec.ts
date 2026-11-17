import { validateArticleBody } from './body-validator';

describe('validateArticleBody', () => {
  it('accepts a plausible article body', () => {
    const result = validateArticleBody(
      '울산 동구는 예산안을 편성했다고 밝혔다. 올해보다 증가한 규모이며 구민 생활 안정과 지역사회 안전에 중점을 뒀다고 설명했다.',
      '울산 동구 예산안',
    );

    expect(result.status).toBe('valid');
  });

  it('rejects empty or title-only bodies', () => {
    expect(validateArticleBody('', '제목').status).toBe('invalid');
    expect(validateArticleBody('같은 제목', '같은 제목').status).toBe(
      'invalid',
    );
  });
});
