import { collapseWhitespace } from '../../news/utils/text';

export type EvidenceMatchResult =
  | { matched: true; normalizedEvidence: string }
  | { matched: false; reason: 'empty' | 'not_found' };

export function matchEvidenceSentence(
  articleBody: string,
  evidenceSentence: string,
): EvidenceMatchResult {
  const normalizedEvidence = collapseWhitespace(evidenceSentence);

  if (normalizedEvidence.length === 0) {
    return { matched: false, reason: 'empty' };
  }

  const normalizedBody = collapseWhitespace(articleBody);

  if (normalizedBody.includes(normalizedEvidence)) {
    return { matched: true, normalizedEvidence };
  }

  // Allow minor quote/punctuation drift by comparing without common punctuation.
  const compactEvidence = stripLoosePunctuation(normalizedEvidence);
  const compactBody = stripLoosePunctuation(normalizedBody);

  if (
    compactEvidence.length >= 12 &&
    compactBody.includes(compactEvidence)
  ) {
    return { matched: true, normalizedEvidence };
  }

  return { matched: false, reason: 'not_found' };
}

function stripLoosePunctuation(value: string): string {
  return value
    .replace(/[“”"‘’'`.,!?…·\-–—:;\(\)\[\]{}]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}
