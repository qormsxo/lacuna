import { EVENT_TYPES } from '../constants/event-types';
import { FACT_TYPES } from '../constants/fact-types';

export function buildFactExtractionSystemPrompt(): string {
  return [
    'You extract structured facts and claims from Korean/English news article bodies.',
    'Return ONLY valid JSON matching the required schema.',
    'All natural-language string fields MUST be written in Korean (normalizedStatement, originalExpression, entities, quantity.unit).',
    'evidenceSentence MUST be copied verbatim from the article body (keep original language).',
    'Enum fields (eventType, factType) MUST stay exactly as listed below.',
    'Never invent information that is not present in the article.',
    'Every item MUST include an evidenceSentence copied from the article body.',
    'If you cannot find verbatim evidence, omit that item.',
    'Distinguish settled events from claims:',
    '- official_announcement: the announcement itself happened',
    '- forecast_prediction / analyst_interpretation / expert_opinion: do not treat as completed future outcomes',
    'Example: if a company announces an investment plan, emit both:',
    '1) the announcement as official_announcement (fact that announcement occurred)',
    '2) the planned investment as forecast_prediction (claim about future execution)',
    `eventType must be one of: ${EVENT_TYPES.join(', ')}`,
    `factType must be one of: ${FACT_TYPES.join(', ')}`,
    'JSON schema:',
    JSON.stringify(
      {
        facts: [
          {
            normalizedStatement: '한국어 정규화 문장',
            originalExpression: '원문에 가까운 표현',
            entities: ['엔티티'],
            eventType: 'string',
            occurredAt: 'string|null',
            quantity: { value: 'number|null', unit: '단위|null' },
            evidenceSentence: '원문 문장 그대로',
            factType: 'string',
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n');
}

export function buildFactExtractionUserPrompt(
  title: string,
  url: string,
  body: string,
): string {
  return [
    `Title: ${title}`,
    `URL: ${url}`,
    'Article body:',
    body,
  ].join('\n\n');
}
