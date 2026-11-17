import { matchEvidenceSentence } from './evidence-matcher';

describe('matchEvidenceSentence', () => {
  const body =
    '삼성전자는 투자 계획을 발표했다. 업계에서는 투자가 이뤄질 전망이라고 분석했다.';

  it('matches exact evidence from the body', () => {
    const result = matchEvidenceSentence(
      body,
      '삼성전자는 투자 계획을 발표했다.',
    );

    expect(result.matched).toBe(true);
  });

  it('rejects evidence that is not in the body', () => {
    const result = matchEvidenceSentence(
      body,
      '정부는 세금을 인상했다고 밝혔다.',
    );

    expect(result.matched).toBe(false);
  });
});
