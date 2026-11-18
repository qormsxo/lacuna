const GOOGLE_ARTICLE_PATH =
  /news\.google\.com\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/u;

export function isGoogleNewsWrapperUrl(url: string): boolean {
  return (
    url.includes('news.google.com/rss/articles/') ||
    url.includes('news.google.com/articles/')
  );
}

export function extractGoogleNewsArticleId(url: string): string | null {
  const match = GOOGLE_ARTICLE_PATH.exec(url);
  return match?.[1] ?? null;
}

/**
 * Best-effort decode for older Google News tokens that still embed an http URL.
 * Post-2024 CBMi tokens usually do not contain a publisher URL.
 */
export function decodeGoogleNewsArticleUrl(url: string): string | null {
  const articleId = extractGoogleNewsArticleId(url);

  if (articleId === null) {
    return null;
  }

  let encoded = articleId.replace(/-/gu, '+').replace(/_/gu, '/');

  while (encoded.length % 4 !== 0) {
    encoded += '=';
  }

  let decoded: string;

  try {
    decoded = Buffer.from(encoded, 'base64').toString('latin1');
  } catch {
    return null;
  }

  const found = /https?:\/\/[\w.~:/?#\[\]@!$&'()*+,;=%-]+/u.exec(decoded);

  if (found === null || found[0] === undefined) {
    return null;
  }

  const candidate = found[0].replace(/[^\w/~:%?#&=+.@-]+$/u, '');

  try {
    const parsed = new URL(candidate);

    if (parsed.hostname.includes('news.google.com')) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveStoredArticleUrl(url: string): string {
  if (!isGoogleNewsWrapperUrl(url)) {
    return url;
  }

  return decodeGoogleNewsArticleUrl(url) ?? url;
}
