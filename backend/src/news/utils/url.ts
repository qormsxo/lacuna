const TRACKING_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
]);

export function normalizeArticleUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.hash = '';
    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')
    ) {
      url.port = '';
    }

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    const keptParams: Array<[string, string]> = [];

    for (const [key, value] of url.searchParams.entries()) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        continue;
      }

      keptParams.push([key, value]);
    }

    keptParams.sort((left, right) => {
      if (left[0] === right[0]) {
        if (left[1] < right[1]) {
          return -1;
        }

        if (left[1] > right[1]) {
          return 1;
        }

        return 0;
      }

      if (left[0] < right[0]) {
        return -1;
      }

      if (left[0] > right[0]) {
        return 1;
      }

      return 0;
    });

    url.search = '';

    for (const [key, value] of keptParams) {
      url.searchParams.append(key, value);
    }

    return url.toString();

  } catch {
    return null;
  }
}

export function isHttpUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractArticleKey(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;

    const naverMatch = path.match(
      /\/mnews\/article\/(\d+)\/(\d+)/u,
    );

    if (
      (host.includes('naver.com') || host.includes('naver.net')) &&
      naverMatch !== null
    ) {
      return `naver:${naverMatch[1]}:${naverMatch[2]}`;
    }

    const daumMatch = path.match(/\/v\/(\d+)/u);

    if (host.includes('daum.net') && daumMatch !== null) {
      return `daum:${daumMatch[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}
