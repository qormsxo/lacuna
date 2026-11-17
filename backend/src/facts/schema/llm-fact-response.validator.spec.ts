import { parseLlmFactResponseJson } from './llm-fact-response.validator';

describe('parseLlmFactResponseJson', () => {
  it('accepts a valid fact payload', () => {
    const result = parseLlmFactResponseJson(
      JSON.stringify({
        facts: [
          {
            normalizedStatement: '삼성전자가 투자 계획을 발표했다',
            originalExpression: '삼성전자는 투자 계획을 발표했다',
            entities: ['삼성전자'],
            eventType: 'investment_contract',
            occurredAt: '2026-11-17',
            quantity: { value: 1, unit: '조원' },
            evidenceSentence: '삼성전자는 투자 계획을 발표했다.',
            factType: 'official_announcement',
          },
          {
            normalizedStatement: '해당 투자가 실행될 것이다',
            originalExpression: '투자가 이뤄질 전망이다',
            entities: ['삼성전자'],
            eventType: 'investment_contract',
            occurredAt: null,
            quantity: null,
            evidenceSentence: '투자가 이뤄질 전망이다',
            factType: 'forecast_prediction',
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.facts).toHaveLength(2);
      expect(result.data.facts[0]?.factType).toBe('official_announcement');
      expect(result.data.facts[1]?.factType).toBe('forecast_prediction');
    }
  });

  it('rejects invalid eventType', () => {
    const result = parseLlmFactResponseJson(
      JSON.stringify({
        facts: [
          {
            normalizedStatement: 'x',
            originalExpression: 'x',
            entities: ['a'],
            eventType: 'not_a_type',
            occurredAt: null,
            quantity: null,
            evidenceSentence: 'evidence',
            factType: 'verifiable_event',
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });
});
