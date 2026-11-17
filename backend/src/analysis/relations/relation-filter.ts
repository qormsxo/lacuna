import { LlmRelationItem } from '../schema/llm-analysis-response';

/**
 * Drop weak relations that violate stage-6 analysis rules.
 */
export function shouldKeepRelation(relation: LlmRelationItem): boolean {
  if (relation.rationale.trim().length < 12) {
    return false;
  }

  if (relation.sourceRefs.length === 0 && !relation.isDirectlyConfirmed) {
    return false;
  }

  if (
    relation.isInferred &&
    relation.uncertainty === 'high' &&
    (relation.alternativeExplanations === null ||
      relation.alternativeExplanations.trim().length === 0)
  ) {
    return false;
  }

  if (
    relation.relationType === 'temporal_sequence' &&
    relation.isDirectlyConfirmed &&
    relation.description.toLowerCase().includes('caus')
  ) {
    return false;
  }

  return true;
}
