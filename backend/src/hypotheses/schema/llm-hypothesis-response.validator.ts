import { isHypothesisStatus } from '../constants/hypothesis-status';
import {
  LlmHypothesisItem,
  LlmHypothesisResponse,
} from './llm-hypothesis-response';

export type HypothesisSchemaValidationResult =
  | { ok: true; data: LlmHypothesisResponse }
  | { ok: false; message: string };

type RawHypothesis = {
  title?: string;
  coreClaim?: string;
  derivationProcess?: string;
  relatedFactIds?: string[];
  relatedRelationIds?: string[];
  supportingEvidence?: string[];
  contradictingEvidence?: string[];
  alternativeExplanations?: string[];
  assumptions?: string[];
  uncertaintyAndLimits?: string;
  additionalVerificationItems?: string[];
  relatedArticleUrls?: string[];
  factsVersusInference?: string;
  status?: string;
  statusReason?: string;
};

type RawHypothesisResponse = {
  hypotheses?: RawHypothesis[];
};

function parseStringArray(
  value: string[] | undefined,
  fieldName: string,
): { ok: true; data: string[] } | { ok: false; message: string } {
  if (value === undefined || !Array.isArray(value)) {
    return { ok: false, message: `${fieldName} must be a string array` };
  }

  const items: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      return { ok: false, message: `${fieldName} must be a string array` };
    }

    items.push(item);
  }

  return { ok: true, data: items };
}

function requireNonEmptyString(
  value: string | undefined,
  fieldName: string,
): { ok: true; data: string } | { ok: false; message: string } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, message: `${fieldName} is required` };
  }

  return { ok: true, data: value.trim() };
}

function parseHypothesis(
  value: RawHypothesis,
  index: number,
): { ok: true; data: LlmHypothesisItem } | { ok: false; message: string } {
  const title = requireNonEmptyString(
    value.title,
    `hypotheses[${index}].title`,
  );
  if (!title.ok) {
    return title;
  }

  const coreClaim = requireNonEmptyString(
    value.coreClaim,
    `hypotheses[${index}].coreClaim`,
  );
  if (!coreClaim.ok) {
    return coreClaim;
  }

  const derivationProcess = requireNonEmptyString(
    value.derivationProcess,
    `hypotheses[${index}].derivationProcess`,
  );
  if (!derivationProcess.ok) {
    return derivationProcess;
  }

  const uncertaintyAndLimits = requireNonEmptyString(
    value.uncertaintyAndLimits,
    `hypotheses[${index}].uncertaintyAndLimits`,
  );
  if (!uncertaintyAndLimits.ok) {
    return uncertaintyAndLimits;
  }

  const factsVersusInference = requireNonEmptyString(
    value.factsVersusInference,
    `hypotheses[${index}].factsVersusInference`,
  );
  if (!factsVersusInference.ok) {
    return factsVersusInference;
  }

  const statusReason = requireNonEmptyString(
    value.statusReason,
    `hypotheses[${index}].statusReason`,
  );
  if (!statusReason.ok) {
    return statusReason;
  }

  if (typeof value.status !== 'string' || !isHypothesisStatus(value.status)) {
    return {
      ok: false,
      message: `hypotheses[${index}].status is invalid`,
    };
  }

  const relatedFactIds = parseStringArray(
    value.relatedFactIds,
    `hypotheses[${index}].relatedFactIds`,
  );
  if (!relatedFactIds.ok) {
    return relatedFactIds;
  }

  const relatedRelationIds = parseStringArray(
    value.relatedRelationIds,
    `hypotheses[${index}].relatedRelationIds`,
  );
  if (!relatedRelationIds.ok) {
    return relatedRelationIds;
  }

  const supportingEvidence = parseStringArray(
    value.supportingEvidence,
    `hypotheses[${index}].supportingEvidence`,
  );
  if (!supportingEvidence.ok) {
    return supportingEvidence;
  }

  const contradictingEvidence = parseStringArray(
    value.contradictingEvidence,
    `hypotheses[${index}].contradictingEvidence`,
  );
  if (!contradictingEvidence.ok) {
    return contradictingEvidence;
  }

  const alternativeExplanations = parseStringArray(
    value.alternativeExplanations,
    `hypotheses[${index}].alternativeExplanations`,
  );
  if (!alternativeExplanations.ok) {
    return alternativeExplanations;
  }

  const assumptions = parseStringArray(
    value.assumptions,
    `hypotheses[${index}].assumptions`,
  );
  if (!assumptions.ok) {
    return assumptions;
  }

  const additionalVerificationItems = parseStringArray(
    value.additionalVerificationItems,
    `hypotheses[${index}].additionalVerificationItems`,
  );
  if (!additionalVerificationItems.ok) {
    return additionalVerificationItems;
  }

  const relatedArticleUrls = parseStringArray(
    value.relatedArticleUrls,
    `hypotheses[${index}].relatedArticleUrls`,
  );
  if (!relatedArticleUrls.ok) {
    return relatedArticleUrls;
  }

  return {
    ok: true,
    data: {
      title: title.data,
      coreClaim: coreClaim.data,
      derivationProcess: derivationProcess.data,
      relatedFactIds: relatedFactIds.data,
      relatedRelationIds: relatedRelationIds.data,
      supportingEvidence: supportingEvidence.data,
      contradictingEvidence: contradictingEvidence.data,
      alternativeExplanations: alternativeExplanations.data,
      assumptions: assumptions.data,
      uncertaintyAndLimits: uncertaintyAndLimits.data,
      additionalVerificationItems: additionalVerificationItems.data,
      relatedArticleUrls: relatedArticleUrls.data,
      factsVersusInference: factsVersusInference.data,
      status: value.status,
      statusReason: statusReason.data,
    },
  };
}

export function parseLlmHypothesisResponseJson(
  raw: string,
): HypothesisSchemaValidationResult {
  let parsed: RawHypothesisResponse;

  try {
    // Safety: JSON.parse is untyped; every field is validated below.
    parsed = JSON.parse(raw) as RawHypothesisResponse;
  } catch {
    return { ok: false, message: 'LLM hypothesis response is not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: 'LLM hypothesis response must be an object' };
  }

  if (!Array.isArray(parsed.hypotheses)) {
    return { ok: false, message: 'hypotheses must be an array' };
  }

  const hypotheses: LlmHypothesisItem[] = [];

  for (let index = 0; index < parsed.hypotheses.length; index += 1) {
    const item = parsed.hypotheses[index];

    if (item === undefined || typeof item !== 'object' || item === null) {
      return {
        ok: false,
        message: `hypotheses[${index}] must be an object`,
      };
    }

    const parsedItem = parseHypothesis(item, index);

    if (!parsedItem.ok) {
      return parsedItem;
    }

    hypotheses.push(parsedItem.data);
  }

  return {
    ok: true,
    data: { hypotheses },
  };
}
