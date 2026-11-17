import { parseLlmAnalysisResponseJson } from './llm-analysis-response.validator';

describe('parseLlmAnalysisResponseJson', () => {
  it('accepts a valid analysis payload', () => {
    const result = parseLlmAnalysisResponseJson(
      JSON.stringify({
        verifications: [
          {
            factId: 'f1',
            verificationStatus: 'single_source',
            sourceQuality: 'medium',
            sourceIndependence: 'independent',
            evidenceDirectness: 'direct',
            comparisonSummary: '다른 기사와 교차확인되지 않음',
            comparedFactIds: [],
            citedPrimarySources: ['보도자료'],
            contentAgreement: false,
            partialAgreement: false,
            contradictionFound: false,
            countsAsIndependentEvidence: true,
          },
        ],
        relations: [
          {
            relationType: 'same_organization',
            factIdA: 'f1',
            factIdB: 'f2',
            description: '동일 기업',
            rationale: '두 사실의 주체가 동일 기업이다',
            sourceRefs: ['https://example.com/a'],
            isDirectlyConfirmed: true,
            isInferred: false,
            uncertainty: 'low',
            alternativeExplanations: null,
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
  });

  it('rejects invalid verification status', () => {
    const result = parseLlmAnalysisResponseJson(
      JSON.stringify({
        verifications: [
          {
            factId: 'f1',
            verificationStatus: 'done',
            sourceQuality: 'medium',
            sourceIndependence: 'independent',
            evidenceDirectness: 'direct',
            comparisonSummary: 'x',
            comparedFactIds: [],
            citedPrimarySources: [],
            contentAgreement: false,
            partialAgreement: false,
            contradictionFound: false,
            countsAsIndependentEvidence: true,
          },
        ],
        relations: [],
      }),
    );

    expect(result.ok).toBe(false);
  });
});
