export const FACT_TYPES = [
  'verifiable_event',
  'official_announcement',
  'reported_content',
  'expert_opinion',
  'forecast_prediction',
  'analyst_interpretation',
] as const;

export type FactType = (typeof FACT_TYPES)[number];

export function isFactType(value: string): value is FactType {
  for (const item of FACT_TYPES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}

/** Types that describe a claim/assertion rather than a settled event. */
export const CLAIM_FACT_TYPES: ReadonlyArray<FactType> = [
  'expert_opinion',
  'forecast_prediction',
  'analyst_interpretation',
];

export function isClaimFactType(value: FactType): boolean {
  for (const item of CLAIM_FACT_TYPES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
