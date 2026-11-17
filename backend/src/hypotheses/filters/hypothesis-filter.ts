import { ExtractedFactEntity } from '../../facts/entities/extracted-fact.entity';
import { collapseWhitespace } from '../../news/utils/text';
import { LlmHypothesisItem } from '../schema/llm-hypothesis-response';

export type HypothesisFilterResult =
  | { keep: true }
  | { keep: false; reason: string };

function containsProbabilityClaim(text: string): boolean {
  return /\b\d{1,3}\s?%|\b확률\b|\blikelihood\b|\bprobability\b/iu.test(text);
}

function isRepackagedSingleFact(
  hypothesis: LlmHypothesisItem,
  factsById: Map<string, ExtractedFactEntity>,
): boolean {
  if (hypothesis.relatedFactIds.length !== 1) {
    return false;
  }

  const factId = hypothesis.relatedFactIds[0];

  if (factId === undefined) {
    return false;
  }

  const fact = factsById.get(factId);

  if (fact === undefined) {
    return false;
  }

  const claim = collapseWhitespace(hypothesis.coreClaim).toLowerCase();
  const statement = collapseWhitespace(fact.normalizedStatement).toLowerCase();

  return claim === statement || claim.includes(statement) || statement.includes(claim);
}

export function evaluateHypothesisCandidate(
  hypothesis: LlmHypothesisItem,
  factsById: Map<string, ExtractedFactEntity>,
  knownRelationIds: Set<string>,
): HypothesisFilterResult {
  if (hypothesis.relatedFactIds.length < 2) {
    return {
      keep: false,
      reason: 'Hypothesis must connect at least two facts',
    };
  }

  const articleIds = new Set<string>();

  for (const factId of hypothesis.relatedFactIds) {
    const fact = factsById.get(factId);

    if (fact === undefined) {
      return {
        keep: false,
        reason: `Unknown related fact id: ${factId}`,
      };
    }

    articleIds.add(fact.articleId);
  }

  if (articleIds.size < 2) {
    return {
      keep: false,
      reason: 'Hypothesis must use facts from at least two different articles',
    };
  }

  for (const relationId of hypothesis.relatedRelationIds) {
    if (!knownRelationIds.has(relationId)) {
      return {
        keep: false,
        reason: `Unknown related relation id: ${relationId}`,
      };
    }
  }

  if (hypothesis.supportingEvidence.length === 0) {
    return { keep: false, reason: 'Supporting evidence is required' };
  }

  if (hypothesis.alternativeExplanations.length === 0) {
    return {
      keep: false,
      reason: 'At least one alternative explanation is required',
    };
  }

  if (hypothesis.additionalVerificationItems.length === 0) {
    return {
      keep: false,
      reason: 'At least one falsifying/additional verification item is required',
    };
  }

  if (hypothesis.relatedArticleUrls.length === 0) {
    return { keep: false, reason: 'Related article URLs are required' };
  }

  if (
    containsProbabilityClaim(hypothesis.coreClaim) ||
    containsProbabilityClaim(hypothesis.derivationProcess)
  ) {
    return {
      keep: false,
      reason: 'Probability claims without objective grounding are not allowed',
    };
  }

  if (isRepackagedSingleFact(hypothesis, factsById)) {
    return {
      keep: false,
      reason: 'Hypothesis merely repackages an already explicit article claim',
    };
  }

  return { keep: true };
}
