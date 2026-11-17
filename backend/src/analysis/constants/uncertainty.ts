export const UNCERTAINTY_LEVELS = ['low', 'medium', 'high'] as const;

export type UncertaintyLevel = (typeof UNCERTAINTY_LEVELS)[number];

export function isUncertaintyLevel(
  value: string,
): value is UncertaintyLevel {
  for (const item of UNCERTAINTY_LEVELS) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
