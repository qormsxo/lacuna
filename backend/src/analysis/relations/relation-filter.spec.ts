import { shouldKeepRelation } from './relation-filter';

describe('shouldKeepRelation', () => {
  it('keeps a well-supported relation', () => {
    expect(
      shouldKeepRelation({
        relationType: 'same_organization',
        factIdA: 'a',
        factIdB: 'b',
        description: '동일 기업 관련 사실',
        rationale: '두 사실 모두 삼성전자를 행위 주체로 명시한다',
        sourceRefs: ['https://example.com/1'],
        isDirectlyConfirmed: true,
        isInferred: false,
        uncertainty: 'low',
        alternativeExplanations: null,
      }),
    ).toBe(true);
  });

  it('drops inferred high-uncertainty relations without alternatives', () => {
    expect(
      shouldKeepRelation({
        relationType: 'investment_capacity_change',
        factIdA: 'a',
        factIdB: 'b',
        description: '투자로 생산능력 증가 추정',
        rationale: '시간적으로 뒤에 발생했다',
        sourceRefs: ['https://example.com/1'],
        isDirectlyConfirmed: false,
        isInferred: true,
        uncertainty: 'high',
        alternativeExplanations: null,
      }),
    ).toBe(false);
  });
});
