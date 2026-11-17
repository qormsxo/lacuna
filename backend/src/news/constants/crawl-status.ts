export const CRAWL_STATUSES = [
  'pending',
  'crawling',
  'success',
  'failed',
  'retry_waiting',
  'inaccessible',
] as const;

export type CrawlStatus = (typeof CRAWL_STATUSES)[number];

export function isCrawlStatus(value: string): value is CrawlStatus {
  for (const status of CRAWL_STATUSES) {
    if (status === value) {
      return true;
    }
  }

  return false;
}
