export const REEVALUATION_EVIDENCE_KINDS = [
  'supporting',
  'contradicting',
  'repeat',
  'unrelated',
] as const;

export type ReevaluationEvidenceKind =
  (typeof REEVALUATION_EVIDENCE_KINDS)[number];

export function isReevaluationEvidenceKind(
  value: string,
): value is ReevaluationEvidenceKind {
  for (const item of REEVALUATION_EVIDENCE_KINDS) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
