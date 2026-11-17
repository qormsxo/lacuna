import { ExtractedFactEntity } from '../../facts/entities/extracted-fact.entity';
import { evaluateHypothesisCandidate } from './hypothesis-filter';

function makeFact(
  id: string,
  articleId: string,
  statement: string,
): ExtractedFactEntity {
  const fact = new ExtractedFactEntity();
  fact.id = id;
  fact.articleId = articleId;
  fact.normalizedStatement = statement;
  return fact;
}

describe('evaluateHypothesisCandidate', () => {
  const factsById = new Map<string, ExtractedFactEntity>([
    ['f1', makeFact('f1', 'a1', '삼성전자가 투자를 발표했다')],
    ['f2', makeFact('f2', 'a2', '장비 주문이 증가했다')],
  ]);

  it('keeps a multi-article hypothesis with alternatives and falsifiers', () => {
    const result = evaluateHypothesisCandidate(
      {
        title: '투자와 장비 주문 연결',
        coreClaim: '투자가 장비 수요 증가로 이어졌을 가능성이 있다',
        derivationProcess: '두 사실을 시간·산업적으로 연결',
        relatedFactIds: ['f1', 'f2'],
        relatedRelationIds: ['r1'],
        supportingEvidence: ['투자 발표', '장비 주문 증가'],
        contradictingEvidence: ['장비 주문은 다른 고객사 때문일 수 있음'],
        alternativeExplanations: ['별개 시장 요인'],
        assumptions: ['동일 공급망'],
        uncertaintyAndLimits: '인과는 미확인',
        additionalVerificationItems: ['발주처 공시 확인'],
        relatedArticleUrls: ['https://a', 'https://b'],
        factsVersusInference: '발표와 주문은 사실, 연결은 추론',
        status: 'exploring',
        statusReason: '초기 탐색',
      },
      factsById,
      new Set(['r1']),
    );

    expect(result.keep).toBe(true);
  });

  it('rejects single-article or probability-styled claims', () => {
    const single = evaluateHypothesisCandidate(
      {
        title: 'x',
        coreClaim: '삼성전자가 투자를 발표했다',
        derivationProcess: '기사 내용',
        relatedFactIds: ['f1'],
        relatedRelationIds: [],
        supportingEvidence: ['투자 발표'],
        contradictingEvidence: [],
        alternativeExplanations: ['없음'],
        assumptions: [],
        uncertaintyAndLimits: '한계',
        additionalVerificationItems: ['추가'],
        relatedArticleUrls: ['https://a'],
        factsVersusInference: '사실',
        status: 'exploring',
        statusReason: '초기',
      },
      factsById,
      new Set(),
    );

    expect(single.keep).toBe(false);

    const probability = evaluateHypothesisCandidate(
      {
        title: 'x',
        coreClaim: '70% 확률로 공급 부족이 온다',
        derivationProcess: '추정',
        relatedFactIds: ['f1', 'f2'],
        relatedRelationIds: [],
        supportingEvidence: ['투자 발표'],
        contradictingEvidence: [],
        alternativeExplanations: ['다른 원인'],
        assumptions: [],
        uncertaintyAndLimits: '한계',
        additionalVerificationItems: ['추가 관측'],
        relatedArticleUrls: ['https://a', 'https://b'],
        factsVersusInference: '추론',
        status: 'exploring',
        statusReason: '초기',
      },
      factsById,
      new Set(),
    );

    expect(probability.keep).toBe(false);
  });
});
