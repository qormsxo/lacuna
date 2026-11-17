import { ArticleResponseDto } from '../dto/crawl-result.dto';
import { CrawlHistoryItemDto } from '../dto/job-status.dto';
import { CrawlHistoryEntity } from '../entities/crawl-history.entity';
import { NewsArticleEntity } from '../entities/news-article.entity';

export function toArticleResponse(
  article: NewsArticleEntity,
): ArticleResponseDto {
  return {
    id: article.id,
    url: article.url,
    normalizedUrl: article.normalizedUrl,
    title: article.title,
    publisher: article.publisher,
    category: article.category,
    source: article.source,
    summary: article.summary,
    crawlStatus: article.crawlStatus,
    crawlAttempts: article.crawlAttempts,
    bodyExtracted: article.bodyExtracted,
    bodyStorageMode: article.bodyStorageMode,
    body: article.body,
    bodyLength: article.bodyLength,
    bodyHash: article.bodyHash,
    isDuplicate: article.isDuplicate,
    duplicateOfId: article.duplicateOfId,
    author: article.author,
    publishedAt: article.publishedAt,
    modifiedAt: article.modifiedAt,
    lastError: article.lastError,
    lastErrorCode: article.lastErrorCode,
    collectedAt: article.collectedAt.toISOString(),
    crawledAt: article.crawledAt ? article.crawledAt.toISOString() : null,
  };
}

export function toCrawlHistoryItem(
  history: CrawlHistoryEntity,
): CrawlHistoryItemDto {
  return {
    id: history.id,
    jobType: history.jobType,
    status: history.status,
    category: history.category,
    startedAt: history.startedAt.toISOString(),
    finishedAt: history.finishedAt
      ? history.finishedAt.toISOString()
      : null,
    requestedCount: history.requestedCount,
    createdCount: history.createdCount,
    updatedCount: history.updatedCount,
    duplicateCount: history.duplicateCount,
    crawledSuccess: history.crawledSuccess,
    crawledFailed: history.crawledFailed,
    message: history.message,
  };
}
