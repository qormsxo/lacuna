import { EventType } from '../constants/event-types';
import { FactType } from '../constants/fact-types';

export type LlmFactQuantity = {
  value: number | null;
  unit: string | null;
};

export type LlmFactItem = {
  normalizedStatement: string;
  originalExpression: string;
  entities: string[];
  eventType: EventType;
  occurredAt: string | null;
  quantity: LlmFactQuantity | null;
  evidenceSentence: string;
  factType: FactType;
};

export type LlmFactResponse = {
  facts: LlmFactItem[];
};
