import { RELATION_TYPES } from '../constants/relation-types';
import { SOURCE_INDEPENDENCE_VALUES } from '../constants/source-independence';
import { SOURCE_QUALITIES } from '../constants/source-quality';
import { EVIDENCE_DIRECTNESS_VALUES } from '../constants/evidence-directness';
import { UNCERTAINTY_LEVELS } from '../constants/uncertainty';
import { VERIFICATION_STATUSES } from '../constants/verification-status';
import { FactWithArticle } from '../candidates/fact-candidate.util';

export function buildAnalysisSystemPrompt(): string {
  return [
    'You compare extracted news facts for source verification and relationships.',
    'Return ONLY valid JSON.',
    'All natural-language string fields MUST be written in Korean (comparisonSummary, description, rationale, alternativeExplanations, citedPrimarySources text).',
    'Enum fields MUST stay exactly as listed below.',
    'Do NOT create hypotheses beyond verification and relations.',
    'Rules:',
    '- Do not confirm relatedness only because keywords overlap.',
    '- Do not treat temporal sequence as causation.',
    '- If inferring a causal-like relation, list alternative explanations.',
    '- Skip weak/unsupported relations entirely.',
    '- Republished press-release copies are NOT independent evidence.',
    '- Keep sourceQuality, verificationStatus, and sourceIndependence separate.',
    `verificationStatus: ${VERIFICATION_STATUSES.join(', ')}`,
    `sourceQuality: ${SOURCE_QUALITIES.join(', ')}`,
    `sourceIndependence: ${SOURCE_INDEPENDENCE_VALUES.join(', ')}`,
    `evidenceDirectness: ${EVIDENCE_DIRECTNESS_VALUES.join(', ')}`,
    `relationType: ${RELATION_TYPES.join(', ')}`,
    `uncertainty: ${UNCERTAINTY_LEVELS.join(', ')}`,
    'JSON schema:',
    JSON.stringify(
      {
        verifications: [
          {
            factId: 'uuid',
            verificationStatus: 'single_source',
            sourceQuality: 'unknown',
            sourceIndependence: 'unclear',
            evidenceDirectness: 'direct',
            comparisonSummary: '한국어 비교 요약',
            comparedFactIds: ['uuid'],
            citedPrimarySources: ['출처 설명'],
            contentAgreement: false,
            partialAgreement: false,
            contradictionFound: false,
            countsAsIndependentEvidence: true,
          },
        ],
        relations: [
          {
            relationType: 'same_organization',
            factIdA: 'uuid',
            factIdB: 'uuid',
            description: '한국어 관계 설명',
            rationale: '한국어 근거',
            sourceRefs: ['url or quote'],
            isDirectlyConfirmed: false,
            isInferred: true,
            uncertainty: 'medium',
            alternativeExplanations: '대안 설명|null',
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n');
}

export function buildAnalysisUserPrompt(
  items: FactWithArticle[],
  republishHints: Array<{ factIdA: string; factIdB: string }>,
): string {
  const factsPayload = [];

  for (const item of items) {
    factsPayload.push({
      factId: item.fact.id,
      articleId: item.article.id,
      publisher: item.article.publisher,
      source: item.article.source,
      sourceUrl: item.fact.sourceUrl,
      normalizedStatement: item.fact.normalizedStatement,
      originalExpression: item.fact.originalExpression,
      entities: item.fact.entities,
      eventType: item.fact.eventType,
      factType: item.fact.factType,
      isClaim: item.fact.isClaim,
      occurredAt: item.fact.occurredAt,
      evidenceSentence: item.fact.evidenceSentence,
      bodyHash: item.article.bodyHash,
    });
  }

  return [
    'Facts to analyze:',
    JSON.stringify(factsPayload, null, 2),
    'Deterministic republish hints (same release redistribution candidates):',
    JSON.stringify(republishHints, null, 2),
    'Produce verifications for each factId and only well-supported relations.',
  ].join('\n\n');
}
