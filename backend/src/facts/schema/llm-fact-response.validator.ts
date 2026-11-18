import { isEventType } from '../constants/event-types';
import { isFactType } from '../constants/fact-types';
import { LlmFactItem, LlmFactQuantity, LlmFactResponse } from './llm-fact-response';

export type SchemaValidationResult =
  | { ok: true; data: LlmFactResponse }
  | { ok: false; message: string };

type RawQuantity = {
  value?: number | null;
  unit?: string | null;
};

type RawFactItem = {
  normalizedStatement?: string;
  originalExpression?: string;
  entities?: string[];
  eventType?: string;
  occurredAt?: string | null;
  quantity?: RawQuantity | null;
  evidenceSentence?: string;
  factType?: string;
};

type RawFactResponse = {
  facts?: RawFactItem[];
};

function parseQuantity(
  value: RawQuantity | null | undefined,
): LlmFactQuantity | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  const rawValue = value.value;
  const rawUnit = value.unit;

  let parsedValue: number | null = null;
  let parsedUnit: string | null = null;

  if (rawValue !== undefined && rawValue !== null) {
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      return undefined;
    }

    parsedValue = rawValue;
  }

  if (rawUnit !== undefined && rawUnit !== null) {
    if (typeof rawUnit !== 'string') {
      return undefined;
    }

    parsedUnit = rawUnit;
  }

  return {
    value: parsedValue,
    unit: parsedUnit,
  };
}

function parseEntities(value: string[] | undefined): string[] | null {
  if (value === undefined || !Array.isArray(value)) {
    return null;
  }

  const entities: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      return null;
    }

    entities.push(item.trim());
  }

  return entities;
}

function parseFactItem(
  value: RawFactItem,
  index: number,
): { ok: true; data: LlmFactItem } | { ok: false; message: string } {
  const normalizedStatement = value.normalizedStatement;
  const originalExpression = value.originalExpression;
  const evidenceSentence = value.evidenceSentence;
  const eventTypeRaw = value.eventType;
  const factTypeRaw = value.factType;
  const entities = parseEntities(value.entities);
  const quantity = parseQuantity(value.quantity);

  let occurredAt: string | null = null;

  if (value.occurredAt !== undefined && value.occurredAt !== null) {
    if (typeof value.occurredAt !== 'string') {
      return {
        ok: false,
        message: `facts[${index}].occurredAt must be string or null`,
      };
    }

    occurredAt = value.occurredAt;
  }

  if (
    typeof normalizedStatement !== 'string' ||
    normalizedStatement.trim().length === 0
  ) {
    return {
      ok: false,
      message: `facts[${index}].normalizedStatement is required`,
    };
  }

  if (
    typeof originalExpression !== 'string' ||
    originalExpression.trim().length === 0
  ) {
    return {
      ok: false,
      message: `facts[${index}].originalExpression is required`,
    };
  }

  if (
    typeof evidenceSentence !== 'string' ||
    evidenceSentence.trim().length === 0
  ) {
    return {
      ok: false,
      message: `facts[${index}].evidenceSentence is required`,
    };
  }

  if (typeof eventTypeRaw !== 'string' || eventTypeRaw.trim().length === 0) {
    return {
      ok: false,
      message: `facts[${index}].eventType is required`,
    };
  }

  if (typeof factTypeRaw !== 'string' || factTypeRaw.trim().length === 0) {
    return {
      ok: false,
      message: `facts[${index}].factType is required`,
    };
  }

  // LLMs often invent close-but-invalid enum labels; coerce instead of failing the whole article.
  const eventType = isEventType(eventTypeRaw)
    ? eventTypeRaw
    : 'other_verifiable_claim';
  const factType = isFactType(factTypeRaw)
    ? factTypeRaw
    : 'reported_content';

  if (entities === null) {
    return {
      ok: false,
      message: `facts[${index}].entities must be a string array`,
    };
  }

  if (quantity === undefined) {
    return {
      ok: false,
      message: `facts[${index}].quantity must be object or null`,
    };
  }

  return {
    ok: true,
    data: {
      normalizedStatement: normalizedStatement.trim(),
      originalExpression: originalExpression.trim(),
      entities,
      eventType,
      occurredAt,
      quantity,
      evidenceSentence: evidenceSentence.trim(),
      factType,
    },
  };
}

export function parseLlmFactResponseJson(raw: string): SchemaValidationResult {
  let parsed: RawFactResponse;

  try {
    // Safety: JSON.parse is untyped; we validate every field below.
    parsed = JSON.parse(raw) as RawFactResponse;
  } catch {
    return { ok: false, message: 'LLM response is not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: 'LLM response must be a JSON object' };
  }

  if (!Array.isArray(parsed.facts)) {
    return { ok: false, message: 'LLM response.facts must be an array' };
  }

  const facts: LlmFactItem[] = [];

  for (let index = 0; index < parsed.facts.length; index += 1) {
    const item = parsed.facts[index];

    if (item === undefined || typeof item !== 'object' || item === null) {
      return { ok: false, message: `facts[${index}] must be an object` };
    }

    const parsedItem = parseFactItem(item, index);

    if (!parsedItem.ok) {
      return parsedItem;
    }

    facts.push(parsedItem.data);
  }

  return {
    ok: true,
    data: { facts },
  };
}
