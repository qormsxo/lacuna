export const SOURCE_INDEPENDENCE_VALUES = [
  'independent',
  'republished_same_release',
  'unclear',
] as const;

export type SourceIndependence =
  (typeof SOURCE_INDEPENDENCE_VALUES)[number];

export function isSourceIndependence(
  value: string,
): value is SourceIndependence {
  for (const item of SOURCE_INDEPENDENCE_VALUES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
