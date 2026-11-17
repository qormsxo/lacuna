export const HYPOTHESIS_STATUSES = [
  'exploring',
  'gathering_evidence',
  'supporting_evidence_increasing',
  'contradicting_evidence_increasing',
  'deferred',
  'support_weakening',
  'contradicted',
] as const;

export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];

export function isHypothesisStatus(
  value: string,
): value is HypothesisStatus {
  for (const item of HYPOTHESIS_STATUSES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
