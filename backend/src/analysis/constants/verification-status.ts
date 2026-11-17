export const VERIFICATION_STATUSES = [
  'confirmed',
  'partially_confirmed',
  'single_source',
  'source_conflict',
  'unverified',
  'contradicted',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export function isVerificationStatus(
  value: string,
): value is VerificationStatus {
  for (const item of VERIFICATION_STATUSES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
