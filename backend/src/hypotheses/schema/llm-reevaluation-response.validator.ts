import { isHypothesisStatus } from '../constants/hypothesis-status';
import { isReevaluationEvidenceKind } from '../constants/reevaluation-outcome';
import {
  LlmReevaluationItem,
  LlmReevaluationResponse,
} from './llm-reevaluation-response';

export type ReevaluationSchemaValidationResult =
  | { ok: true; data: LlmReevaluationResponse }
  | { ok: false; message: string };

type RawAssessment = {
  hypothesisId?: string;
  evidenceKind?: string;
  isIndependentSource?: boolean;
  summary?: string;
  evidenceText?: string;
  newStatus?: string | null;
  statusReason?: string;
};

type RawResponse = {
  assessments?: RawAssessment[];
};

export function parseLlmReevaluationResponseJson(
  raw: string,
): ReevaluationSchemaValidationResult {
  let parsed: RawResponse;

  try {
    // Safety: JSON.parse is untyped; every field is validated below.
    parsed = JSON.parse(raw) as RawResponse;
  } catch {
    return {
      ok: false,
      message: 'LLM reevaluation response is not valid JSON',
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      message: 'LLM reevaluation response must be an object',
    };
  }

  if (!Array.isArray(parsed.assessments)) {
    return { ok: false, message: 'assessments must be an array' };
  }

  const assessments: LlmReevaluationItem[] = [];

  for (let index = 0; index < parsed.assessments.length; index += 1) {
    const item = parsed.assessments[index];

    if (item === undefined || typeof item !== 'object' || item === null) {
      return {
        ok: false,
        message: `assessments[${index}] must be an object`,
      };
    }

    if (
      typeof item.hypothesisId !== 'string' ||
      item.hypothesisId.trim().length === 0
    ) {
      return {
        ok: false,
        message: `assessments[${index}].hypothesisId is required`,
      };
    }

    if (
      typeof item.evidenceKind !== 'string' ||
      !isReevaluationEvidenceKind(item.evidenceKind)
    ) {
      return {
        ok: false,
        message: `assessments[${index}].evidenceKind is invalid`,
      };
    }

    if (typeof item.isIndependentSource !== 'boolean') {
      return {
        ok: false,
        message: `assessments[${index}].isIndependentSource must be boolean`,
      };
    }

    if (typeof item.summary !== 'string' || item.summary.trim().length === 0) {
      return {
        ok: false,
        message: `assessments[${index}].summary is required`,
      };
    }

    if (
      typeof item.evidenceText !== 'string' ||
      item.evidenceText.trim().length === 0
    ) {
      return {
        ok: false,
        message: `assessments[${index}].evidenceText is required`,
      };
    }

    if (
      typeof item.statusReason !== 'string' ||
      item.statusReason.trim().length === 0
    ) {
      return {
        ok: false,
        message: `assessments[${index}].statusReason is required`,
      };
    }

    let newStatus: LlmReevaluationItem['newStatus'] = null;

    if (item.newStatus !== undefined && item.newStatus !== null) {
      if (
        typeof item.newStatus !== 'string' ||
        !isHypothesisStatus(item.newStatus)
      ) {
        return {
          ok: false,
          message: `assessments[${index}].newStatus is invalid`,
        };
      }

      newStatus = item.newStatus;
    }

    assessments.push({
      hypothesisId: item.hypothesisId,
      evidenceKind: item.evidenceKind,
      isIndependentSource: item.isIndependentSource,
      summary: item.summary.trim(),
      evidenceText: item.evidenceText.trim(),
      newStatus,
      statusReason: item.statusReason.trim(),
    });
  }

  return { ok: true, data: { assessments } };
}
