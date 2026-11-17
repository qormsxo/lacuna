export const EVIDENCE_DIRECTNESS_VALUES = [
  'direct',
  'indirect',
  'mixed',
  'unknown',
] as const;

export type EvidenceDirectness =
  (typeof EVIDENCE_DIRECTNESS_VALUES)[number];

export function isEvidenceDirectness(
  value: string,
): value is EvidenceDirectness {
  for (const item of EVIDENCE_DIRECTNESS_VALUES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
