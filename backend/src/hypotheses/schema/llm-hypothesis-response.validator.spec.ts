import { parseLlmHypothesisResponseJson } from './llm-hypothesis-response.validator';

describe('parseLlmHypothesisResponseJson', () => {
  it('accepts a valid hypothesis payload', () => {
    const result = parseLlmHypothesisResponseJson(
      JSON.stringify({
        hypotheses: [
          {
            title: '투자-생산능력 연결 가설',
            coreClaim: '신규 투자가 생산능력 확대로 이어질 수 있다',
            derivationProcess: '투자 발표와 장비 주문 증가를 연결',
            relatedFactIds: ['f1', 'f2'],
            relatedRelationIds: ['r1'],
            supportingEvidence: ['투자 발표', '장비 주문'],
            contradictingEvidence: ['장비는 유지보수일 수 있음'],
            alternativeExplanations: ['수요 회복이 원인'],
            assumptions: ['동일 사업 라인'],
            uncertaintyAndLimits: '인과 미확인',
            additionalVerificationItems: ['설비 반입 공시'],
            relatedArticleUrls: ['https://a', 'https://b'],
            factsVersusInference: '발표/주문은 사실, 연결은 추론',
            status: 'exploring',
            statusReason: '초기 탐색',
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = parseLlmHypothesisResponseJson(
      JSON.stringify({
        hypotheses: [
          {
            title: 't',
            coreClaim: 'c',
            derivationProcess: 'd',
            relatedFactIds: [],
            relatedRelationIds: [],
            supportingEvidence: [],
            contradictingEvidence: [],
            alternativeExplanations: [],
            assumptions: [],
            uncertaintyAndLimits: 'u',
            additionalVerificationItems: [],
            relatedArticleUrls: [],
            factsVersusInference: 'f',
            status: 'unknown',
            statusReason: 'r',
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });
});
