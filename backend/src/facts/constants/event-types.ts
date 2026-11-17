export const EVENT_TYPES = [
  'corporate_action',
  'investment_contract',
  'policy_announcement',
  'product_launch',
  'business_expansion_contraction',
  'production_supply_change',
  'price_demand_change',
  'person_statement',
  'incident_change',
  'other_verifiable_claim',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: string): value is EventType {
  for (const item of EVENT_TYPES) {
    if (item === value) {
      return true;
    }
  }

  return false;
}
