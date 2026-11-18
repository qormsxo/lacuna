import { ExtractedFactEntity } from '../../facts/entities/extracted-fact.entity';
import { NewsArticleEntity } from '../../news/entities/news-article.entity';
import { HYPOTHESIS_STATUSES } from '../constants/hypothesis-status';
import { REEVALUATION_EVIDENCE_KINDS } from '../constants/reevaluation-outcome';
import { HypothesisEntity } from '../entities/hypothesis.entity';

export function buildReevaluationSystemPrompt(): string {
  return [
    'You re-evaluate existing hypotheses against NEW facts from a newly collected article.',
    'Return ONLY valid JSON.',
    'All natural-language string fields MUST be written in Korean (summary, evidenceText, statusReason).',
    'Enum fields such as evidenceKind and newStatus MUST stay exactly as listed below.',
    'For each hypothesis decide whether the new facts:',
    '- support the hypothesis',
    '- contradict the hypothesis',
    '- merely repeat already known information',
    '- are unrelated',
    'Also judge whether the new source is independent (not a press-release republish).',
    'Do not invent facts absent from the new article facts.',
    'If status should not change, set newStatus to null.',
    `evidenceKind: ${REEVALUATION_EVIDENCE_KINDS.join(', ')}`,
    `newStatus: null or one of ${HYPOTHESIS_STATUSES.join(', ')}`,
    'JSON schema:',
    JSON.stringify(
      {
        assessments: [
          {
            hypothesisId: 'uuid',
            evidenceKind: 'supporting',
            isIndependentSource: true,
            summary: '한국어 요약',
            evidenceText: '한국어 근거 텍스트',
            newStatus: 'supporting_evidence_increasing',
            statusReason: '상태 변경 이유',
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n');
}

export function buildReevaluationUserPrompt(
  article: NewsArticleEntity,
  newFacts: ExtractedFactEntity[],
  hypotheses: HypothesisEntity[],
): string {
  const factsPayload = [];

  for (const fact of newFacts) {
    factsPayload.push({
      factId: fact.id,
      normalizedStatement: fact.normalizedStatement,
      entities: fact.entities,
      evidenceSentence: fact.evidenceSentence,
      factType: fact.factType,
      isClaim: fact.isClaim,
    });
  }

  const hypothesisPayload = [];

  for (const hypothesis of hypotheses) {
    hypothesisPayload.push({
      hypothesisId: hypothesis.id,
      title: hypothesis.title,
      coreClaim: hypothesis.coreClaim,
      status: hypothesis.status,
      relatedFactIds: hypothesis.relatedFactIds,
      supportingEvidence: hypothesis.supportingEvidence,
      contradictingEvidence: hypothesis.contradictingEvidence,
      alternativeExplanations: hypothesis.alternativeExplanations,
      uncertaintyAndLimits: hypothesis.uncertaintyAndLimits,
    });
  }

  return [
    `New article id=${article.id}`,
    `url=${article.url}`,
    `publisher=${article.publisher ?? 'unknown'}`,
    `source=${article.source}`,
    'New extracted facts:',
    JSON.stringify(factsPayload, null, 2),
    'Existing hypotheses to assess:',
    JSON.stringify(hypothesisPayload, null, 2),
  ].join('\n\n');
}
