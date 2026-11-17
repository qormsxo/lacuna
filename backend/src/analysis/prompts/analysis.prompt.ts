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
            comparisonSummary: 'string',
            comparedFactIds: ['uuid'],
            citedPrimarySources: ['string'],
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
            description: 'string',
            rationale: 'string',
            sourceRefs: ['url or quote'],
            isDirectlyConfirmed: false,
            isInferred: true,
            uncertainty: 'medium',
            alternativeExplanations: 'string|null',
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
