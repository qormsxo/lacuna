import { createHash } from 'node:crypto';
import { ExtractedFactEntity } from '../../facts/entities/extracted-fact.entity';
import { NewsArticleEntity } from '../../news/entities/news-article.entity';
import { collapseWhitespace } from '../../news/utils/text';

export type FactWithArticle = {
  fact: ExtractedFactEntity;
  article: NewsArticleEntity;
};

export function normalizeEntityToken(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

export function entitiesOverlap(
  left: string[],
  right: string[],
): boolean {
  const rightSet = new Set<string>();

  for (const item of right) {
    rightSet.add(normalizeEntityToken(item));
  }

  for (const item of left) {
    if (rightSet.has(normalizeEntityToken(item))) {
      return true;
    }
  }

  return false;
}

export function statementSimilarityHint(
  left: string,
  right: string,
): boolean {
  const a = collapseWhitespace(left).toLowerCase();
  const b = collapseWhitespace(right).toLowerCase();

  if (a === b) {
    return true;
  }

  if (a.length < 8 || b.length < 8) {
    return false;
  }

  return a.includes(b) || b.includes(a);
}

/**
 * Same press-release redistribution signal:
 * identical/near-identical body hash or publisher-less reprint of same statement.
 */
export function looksLikeRepublishedRelease(
  left: FactWithArticle,
  right: FactWithArticle,
): boolean {
  if (left.fact.id === right.fact.id) {
    return false;
  }

  if (
    left.article.bodyHash !== null &&
    right.article.bodyHash !== null &&
    left.article.bodyHash === right.article.bodyHash
  ) {
    return true;
  }

  const sameStatement = statementSimilarityHint(
    left.fact.normalizedStatement,
    right.fact.normalizedStatement,
  );

  if (!sameStatement) {
    return false;
  }

  const sameEvidence = statementSimilarityHint(
    left.fact.evidenceSentence,
    right.fact.evidenceSentence,
  );

  return sameEvidence;
}

export function buildCandidatePairs(
  items: FactWithArticle[],
): Array<[FactWithArticle, FactWithArticle]> {
  const pairs: Array<[FactWithArticle, FactWithArticle]> = [];

  for (let i = 0; i < items.length; i += 1) {
    const left = items[i];

    if (left === undefined) {
      continue;
    }

    for (let j = i + 1; j < items.length; j += 1) {
      const right = items[j];

      if (right === undefined) {
        continue;
      }

      const related =
        entitiesOverlap(left.fact.entities, right.fact.entities) ||
        left.fact.eventType === right.fact.eventType ||
        statementSimilarityHint(
          left.fact.normalizedStatement,
          right.fact.normalizedStatement,
        );

      if (!related) {
        continue;
      }

      pairs.push([left, right]);
    }
  }

  return pairs;
}

export function hashFactIds(factIds: string[]): string {
  const sorted = [...factIds].sort();
  return createHash('sha256').update(sorted.join('|')).digest('hex');
}

export function orderedFactPair(
  factIdA: string,
  factIdB: string,
): { factIdA: string; factIdB: string } {
  if (factIdA < factIdB) {
    return { factIdA, factIdB };
  }

  return { factIdA: factIdB, factIdB: factIdA };
}
