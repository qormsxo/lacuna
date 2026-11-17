import { createHash } from 'node:crypto';
import { collapseWhitespace } from './text';
import { extractArticleKey, normalizeArticleUrl } from './url';

export function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildTitleHash(title: string): string {
  return hashText(collapseWhitespace(title).toLowerCase());
}

export function buildIdentityHash(
  title: string,
  publisher: string | null,
): string | null {
  if (publisher === null) {
    return null;
  }

  const normalizedPublisher = collapseWhitespace(publisher).toLowerCase();

  if (normalizedPublisher.length === 0) {
    return null;
  }

  return hashText(`${normalizedPublisher}|${buildTitleHash(title)}`);
}

export type ArticleIdentity = {
  url: string;
  normalizedUrl: string;
  articleKey: string | null;
  titleHash: string;
  identityHash: string | null;
};

export function buildArticleIdentity(
  rawUrl: string,
  title: string,
  publisher: string | null,
): ArticleIdentity | null {
  const normalizedUrl = normalizeArticleUrl(rawUrl);

  if (normalizedUrl === null) {
    return null;
  }

  return {
    url: rawUrl,
    normalizedUrl,
    articleKey: extractArticleKey(normalizedUrl),
    titleHash: buildTitleHash(title),
    identityHash: buildIdentityHash(title, publisher),
  };
}
