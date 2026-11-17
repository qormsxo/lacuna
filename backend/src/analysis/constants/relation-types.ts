export const RELATION_TYPES = [
  'same_organization',
  'same_person',
  'same_industry',
  'supply_chain',
  'competition',
  'investment_capacity_change',
  'policy_corporate_action',
  'demand_supply_change',
  'temporal_sequence',
  'contradictory_claims',
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export function isRelationType(value: string): value is RelationType {
  for (const item of RELATION_TYPES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
