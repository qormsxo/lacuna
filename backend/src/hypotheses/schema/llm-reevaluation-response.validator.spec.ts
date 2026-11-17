import { parseLlmReevaluationResponseJson } from './llm-reevaluation-response.validator';

describe('parseLlmReevaluationResponseJson', () => {
  it('accepts a valid reevaluation payload', () => {
    const result = parseLlmReevaluationResponseJson(
      JSON.stringify({
        assessments: [
          {
            hypothesisId: 'h1',
            evidenceKind: 'supporting',
            isIndependentSource: true,
            summary: '새 사실이 가설을 지지',
            evidenceText: '장비 주문이 추가로 늘었다',
            newStatus: 'supporting_evidence_increasing',
            statusReason: '독립 출처의 지지 증거',
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
  });

  it('rejects invalid evidence kind', () => {
    const result = parseLlmReevaluationResponseJson(
      JSON.stringify({
        assessments: [
          {
            hypothesisId: 'h1',
            evidenceKind: 'maybe',
            isIndependentSource: true,
            summary: 'x',
            evidenceText: 'y',
            newStatus: null,
            statusReason: 'r',
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });
});
