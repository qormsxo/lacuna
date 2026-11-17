export const SOURCE_QUALITIES = [
  'high',
  'medium',
  'low',
  'unknown',
] as const;

export type SourceQuality = (typeof SOURCE_QUALITIES)[number];

export function isSourceQuality(value: string): value is SourceQuality {
  for (const item of SOURCE_QUALITIES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
