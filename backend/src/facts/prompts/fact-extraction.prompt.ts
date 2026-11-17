import { EVENT_TYPES } from '../constants/event-types';
import { FACT_TYPES } from '../constants/fact-types';

export function buildFactExtractionSystemPrompt(): string {
  return [
    'You extract structured facts and claims from Korean/English news article bodies.',
    'Return ONLY valid JSON matching the required schema.',
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
            normalizedStatement: 'string',
            originalExpression: 'string',
            entities: ['string'],
            eventType: 'string',
            occurredAt: 'string|null',
            quantity: { value: 'number|null', unit: 'string|null' },
            evidenceSentence: 'string',
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
