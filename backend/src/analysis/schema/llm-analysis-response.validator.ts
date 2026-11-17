import { isEvidenceDirectness } from '../constants/evidence-directness';
import { isRelationType } from '../constants/relation-types';
import { isSourceIndependence } from '../constants/source-independence';
import { isSourceQuality } from '../constants/source-quality';
import { isUncertaintyLevel } from '../constants/uncertainty';
import { isVerificationStatus } from '../constants/verification-status';
import {
  LlmAnalysisResponse,
  LlmRelationItem,
  LlmVerificationItem,
} from './llm-analysis-response';

export type AnalysisSchemaValidationResult =
  | { ok: true; data: LlmAnalysisResponse }
  | { ok: false; message: string };

type RawVerification = {
  factId?: string;
  verificationStatus?: string;
  sourceQuality?: string;
  sourceIndependence?: string;
  evidenceDirectness?: string;
  comparisonSummary?: string;
  comparedFactIds?: string[];
  citedPrimarySources?: string[];
  contentAgreement?: boolean;
  partialAgreement?: boolean;
  contradictionFound?: boolean;
  countsAsIndependentEvidence?: boolean;
};

type RawRelation = {
  relationType?: string;
  factIdA?: string;
  factIdB?: string;
  description?: string;
  rationale?: string;
  sourceRefs?: string[];
  isDirectlyConfirmed?: boolean;
  isInferred?: boolean;
  uncertainty?: string;
  alternativeExplanations?: string | null;
};

type RawAnalysisResponse = {
  verifications?: RawVerification[];
  relations?: RawRelation[];
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

function parseVerification(
  value: RawVerification,
  index: number,
): { ok: true; data: LlmVerificationItem } | { ok: false; message: string } {
  if (typeof value.factId !== 'string' || value.factId.trim().length === 0) {
    return { ok: false, message: `verifications[${index}].factId is required` };
  }

  if (
    typeof value.verificationStatus !== 'string' ||
    !isVerificationStatus(value.verificationStatus)
  ) {
    return {
      ok: false,
      message: `verifications[${index}].verificationStatus is invalid`,
    };
  }

  if (
    typeof value.sourceQuality !== 'string' ||
    !isSourceQuality(value.sourceQuality)
  ) {
    return {
      ok: false,
      message: `verifications[${index}].sourceQuality is invalid`,
    };
  }

  if (
    typeof value.sourceIndependence !== 'string' ||
    !isSourceIndependence(value.sourceIndependence)
  ) {
    return {
      ok: false,
      message: `verifications[${index}].sourceIndependence is invalid`,
    };
  }

  if (
    typeof value.evidenceDirectness !== 'string' ||
    !isEvidenceDirectness(value.evidenceDirectness)
  ) {
    return {
      ok: false,
      message: `verifications[${index}].evidenceDirectness is invalid`,
    };
  }

  if (
    typeof value.comparisonSummary !== 'string' ||
    value.comparisonSummary.trim().length === 0
  ) {
    return {
      ok: false,
      message: `verifications[${index}].comparisonSummary is required`,
    };
  }

  const compared = parseStringArray(
    value.comparedFactIds,
    `verifications[${index}].comparedFactIds`,
  );

  if (!compared.ok) {
    return compared;
  }

  const cited = parseStringArray(
    value.citedPrimarySources,
    `verifications[${index}].citedPrimarySources`,
  );

  if (!cited.ok) {
    return cited;
  }

  if (typeof value.contentAgreement !== 'boolean') {
    return {
      ok: false,
      message: `verifications[${index}].contentAgreement must be boolean`,
    };
  }

  if (typeof value.partialAgreement !== 'boolean') {
    return {
      ok: false,
      message: `verifications[${index}].partialAgreement must be boolean`,
    };
  }

  if (typeof value.contradictionFound !== 'boolean') {
    return {
      ok: false,
      message: `verifications[${index}].contradictionFound must be boolean`,
    };
  }

  if (typeof value.countsAsIndependentEvidence !== 'boolean') {
    return {
      ok: false,
      message: `verifications[${index}].countsAsIndependentEvidence must be boolean`,
    };
  }

  return {
    ok: true,
    data: {
      factId: value.factId,
      verificationStatus: value.verificationStatus,
      sourceQuality: value.sourceQuality,
      sourceIndependence: value.sourceIndependence,
      evidenceDirectness: value.evidenceDirectness,
      comparisonSummary: value.comparisonSummary.trim(),
      comparedFactIds: compared.data,
      citedPrimarySources: cited.data,
      contentAgreement: value.contentAgreement,
      partialAgreement: value.partialAgreement,
      contradictionFound: value.contradictionFound,
      countsAsIndependentEvidence: value.countsAsIndependentEvidence,
    },
  };
}

function parseRelation(
  value: RawRelation,
  index: number,
): { ok: true; data: LlmRelationItem } | { ok: false; message: string } {
  if (
    typeof value.relationType !== 'string' ||
    !isRelationType(value.relationType)
  ) {
    return {
      ok: false,
      message: `relations[${index}].relationType is invalid`,
    };
  }

  if (typeof value.factIdA !== 'string' || value.factIdA.trim().length === 0) {
    return { ok: false, message: `relations[${index}].factIdA is required` };
  }

  if (typeof value.factIdB !== 'string' || value.factIdB.trim().length === 0) {
    return { ok: false, message: `relations[${index}].factIdB is required` };
  }

  if (value.factIdA === value.factIdB) {
    return {
      ok: false,
      message: `relations[${index}] factIdA and factIdB must differ`,
    };
  }

  if (
    typeof value.description !== 'string' ||
    value.description.trim().length === 0
  ) {
    return {
      ok: false,
      message: `relations[${index}].description is required`,
    };
  }

  if (
    typeof value.rationale !== 'string' ||
    value.rationale.trim().length === 0
  ) {
    return { ok: false, message: `relations[${index}].rationale is required` };
  }

  const sourceRefs = parseStringArray(
    value.sourceRefs,
    `relations[${index}].sourceRefs`,
  );

  if (!sourceRefs.ok) {
    return sourceRefs;
  }

  if (typeof value.isDirectlyConfirmed !== 'boolean') {
    return {
      ok: false,
      message: `relations[${index}].isDirectlyConfirmed must be boolean`,
    };
  }

  if (typeof value.isInferred !== 'boolean') {
    return {
      ok: false,
      message: `relations[${index}].isInferred must be boolean`,
    };
  }

  if (
    typeof value.uncertainty !== 'string' ||
    !isUncertaintyLevel(value.uncertainty)
  ) {
    return {
      ok: false,
      message: `relations[${index}].uncertainty is invalid`,
    };
  }

  let alternativeExplanations: string | null = null;

  if (
    value.alternativeExplanations !== undefined &&
    value.alternativeExplanations !== null
  ) {
    if (typeof value.alternativeExplanations !== 'string') {
      return {
        ok: false,
        message: `relations[${index}].alternativeExplanations must be string or null`,
      };
    }

    alternativeExplanations = value.alternativeExplanations;
  }

  return {
    ok: true,
    data: {
      relationType: value.relationType,
      factIdA: value.factIdA,
      factIdB: value.factIdB,
      description: value.description.trim(),
      rationale: value.rationale.trim(),
      sourceRefs: sourceRefs.data,
      isDirectlyConfirmed: value.isDirectlyConfirmed,
      isInferred: value.isInferred,
      uncertainty: value.uncertainty,
      alternativeExplanations,
    },
  };
}

export function parseLlmAnalysisResponseJson(
  raw: string,
): AnalysisSchemaValidationResult {
  let parsed: RawAnalysisResponse;

  try {
    // Safety: JSON.parse is untyped; every field is validated below.
    parsed = JSON.parse(raw) as RawAnalysisResponse;
  } catch {
    return { ok: false, message: 'LLM analysis response is not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: 'LLM analysis response must be an object' };
  }

  if (!Array.isArray(parsed.verifications)) {
    return { ok: false, message: 'verifications must be an array' };
  }

  if (!Array.isArray(parsed.relations)) {
    return { ok: false, message: 'relations must be an array' };
  }

  const verifications: LlmVerificationItem[] = [];

  for (let index = 0; index < parsed.verifications.length; index += 1) {
    const item = parsed.verifications[index];

    if (item === undefined || typeof item !== 'object' || item === null) {
      return {
        ok: false,
        message: `verifications[${index}] must be an object`,
      };
    }

    const parsedItem = parseVerification(item, index);

    if (!parsedItem.ok) {
      return parsedItem;
    }

    verifications.push(parsedItem.data);
  }

  const relations: LlmRelationItem[] = [];

  for (let index = 0; index < parsed.relations.length; index += 1) {
    const item = parsed.relations[index];

    if (item === undefined || typeof item !== 'object' || item === null) {
      return { ok: false, message: `relations[${index}] must be an object` };
    }

    const parsedItem = parseRelation(item, index);

    if (!parsedItem.ok) {
      return parsedItem;
    }

    relations.push(parsedItem.data);
  }

  return {
    ok: true,
    data: {
      verifications,
      relations,
    },
  };
}
