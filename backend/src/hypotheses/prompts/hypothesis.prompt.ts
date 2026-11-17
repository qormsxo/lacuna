import { FactRelationEntity } from '../../analysis/entities/fact-relation.entity';
import { ExtractedFactEntity } from '../../facts/entities/extracted-fact.entity';
import { NewsArticleEntity } from '../../news/entities/news-article.entity';
import { HYPOTHESIS_STATUSES } from '../constants/hypothesis-status';

export function buildHypothesisSystemPrompt(): string {
  return [
    'You generate NEW hypotheses by connecting facts extracted from different news articles.',
    'This is NOT article summarization and NOT a list of news items.',
    'Return ONLY valid JSON.',
    'Rules:',
    '- Do not repackage a claim that is already explicit in a single article.',
    '- Propose a new possibility that emerges only from connecting multiple facts.',
    '- Always attach supporting evidence linked to the facts/relations.',
    '- Separate observed facts from inferences.',
    '- Actively search for contradicting evidence.',
    '- Include at least one alternative explanation.',
    '- If evidence is too weak, return an empty hypotheses array instead of forcing one.',
    '- Do not express possibility as a probability percentage.',
    '- Include additional observations that could falsify the hypothesis.',
    `status must be one of: ${HYPOTHESIS_STATUSES.join(', ')}`,
    'JSON schema:',
    JSON.stringify(
      {
        hypotheses: [
          {
            title: 'string',
            coreClaim: 'string',
            derivationProcess: 'string',
            relatedFactIds: ['uuid'],
            relatedRelationIds: ['uuid'],
            supportingEvidence: ['string'],
            contradictingEvidence: ['string'],
            alternativeExplanations: ['string'],
            assumptions: ['string'],
            uncertaintyAndLimits: 'string',
            additionalVerificationItems: ['string'],
            relatedArticleUrls: ['url'],
            factsVersusInference: 'string',
            status: 'exploring',
            statusReason: 'string',
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n');
}

export function buildHypothesisUserPrompt(
  facts: ExtractedFactEntity[],
  relations: FactRelationEntity[],
  articlesById: Map<string, NewsArticleEntity>,
): string {
  const factPayload = [];

  for (const fact of facts) {
    const article = articlesById.get(fact.articleId);

    factPayload.push({
      factId: fact.id,
      articleId: fact.articleId,
      articleUrl: article?.url ?? fact.sourceUrl,
      publisher: article?.publisher ?? null,
      normalizedStatement: fact.normalizedStatement,
      entities: fact.entities,
      eventType: fact.eventType,
      factType: fact.factType,
      isClaim: fact.isClaim,
      evidenceSentence: fact.evidenceSentence,
      occurredAt: fact.occurredAt,
    });
  }

  const relationPayload = [];

  for (const relation of relations) {
    relationPayload.push({
      relationId: relation.id,
      relationType: relation.relationType,
      factIdA: relation.factIdA,
      factIdB: relation.factIdB,
      description: relation.description,
      rationale: relation.rationale,
      isDirectlyConfirmed: relation.isDirectlyConfirmed,
      isInferred: relation.isInferred,
      uncertainty: relation.uncertainty,
      alternativeExplanations: relation.alternativeExplanations,
      sourceRefs: relation.sourceRefs,
    });
  }

  return [
    'Extracted facts:',
    JSON.stringify(factPayload, null, 2),
    'Known relations between facts:',
    JSON.stringify(relationPayload, null, 2),
    'Generate zero or more NEW hypotheses that are not already stated in any single article.',
  ].join('\n\n');
}
