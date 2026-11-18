import { Injectable } from '@nestjs/common';
import {
  GOOGLE_NEWS_QUERIES,
  googleNewsRssUrl,
} from '../constants/source-urls';
import { ArticleDto } from '../dto/article.dto';
import {
  CollectorFailureDto,
  CollectorResult,
} from '../dto/collect-result.dto';
import { RssFeed, RssFeedItem, RssFeedLoader } from '../http/rss-feed-loader';
import { collapseWhitespace, isBlank } from '../utils/text';
import { decodeGoogleNewsArticleUrl } from '../utils/google-news-url';
import { normalizeArticleUrl } from '../utils/url';
import { CollectRequest, NewsCollector } from './news-collector';

type TitleAndPublisher = {
  title: string;
  publisher: string | null;
};

@Injectable()
export class GoogleNewsCollector implements NewsCollector {
  readonly source = 'google' as const;

  constructor(private readonly rssFeedLoader: RssFeedLoader) {}

  async collect(request: CollectRequest): Promise<CollectorResult> {
    const query = GOOGLE_NEWS_QUERIES[request.category];
    const feedUrl = googleNewsRssUrl(query);
    const collectedAt = new Date().toISOString();

    try {
      const feed = await this.rssFeedLoader.parseUrl(feedUrl);
      const articles = this.parseFeed(feed, request.category, collectedAt);

      if (articles.length === 0) {
        return this.failure(
          request.category,
          'EMPTY_LIST',
          `Google News RSS returned no articles for query "${query}"`,
        );
      }

      return {
        status: 'success',
        source: this.source,
        category: request.category,
        articles,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to parse Google News RSS';

      const normalized = message.toLowerCase();

      if (normalized.includes('timeout')) {
        return this.failure(request.category, 'TIMEOUT', message);
      }

      if (
        normalized.includes('status code 401') ||
        normalized.includes('status code 403') ||
        normalized.includes('status code 429')
      ) {
        return this.failure(request.category, 'ACCESS_DENIED', message);
      }

      return this.failure(request.category, 'PARSE_ERROR', message);
    }
  }

  parseFeed(
    feed: RssFeed,
    category: CollectRequest['category'],
    collectedAt: string,
  ): ArticleDto[] {
    const articles: ArticleDto[] = [];
    const seen = new Set<string>();

    for (const item of feed.items ?? []) {
      const article = this.toArticle(item, category, collectedAt);

      if (article === null) {
        continue;
      }

      if (seen.has(article.url)) {
        continue;
      }

      seen.add(article.url);
      articles.push(article);
    }

    return articles;
  }

  private toArticle(
    item: RssFeedItem,
    category: CollectRequest['category'],
    collectedAt: string,
  ): ArticleDto | null {
    if (isBlank(item.title) || isBlank(item.link)) {
      return null;
    }

    const normalized = normalizeArticleUrl(item.link ?? '');

    if (normalized === null) {
      return null;
    }

    // Cheap sync decode only. Modern CBMi tokens need batchexecute at crawl time.
    const url = decodeGoogleNewsArticleUrl(normalized) ?? normalized;
    const parsed = this.splitTitleAndPublisher(item.title ?? '');

    return {
      title: parsed.title,
      url,
      publisher: parsed.publisher ?? item.creator ?? null,
      publishedAt: item.pubDate ?? null,
      collectedAt,
      category,
      source: this.source,
      summary: item.contentSnippet
        ? collapseWhitespace(item.contentSnippet)
        : null,
    };
  }

  private splitTitleAndPublisher(rawTitle: string): TitleAndPublisher {
    const title = collapseWhitespace(rawTitle);
    const separator = ' - ';
    const index = title.lastIndexOf(separator);

    if (index <= 0) {
      return { title, publisher: null };
    }

    const maybeTitle = title.slice(0, index).trim();
    const maybePublisher = title.slice(index + separator.length).trim();

    if (maybeTitle.length === 0 || maybePublisher.length === 0) {
      return { title, publisher: null };
    }

    return {
      title: maybeTitle,
      publisher: maybePublisher,
    };
  }

  private failure(
    category: CollectRequest['category'],
    errorCode: CollectorFailureDto['errorCode'],
    message: string,
  ): CollectorFailureDto {
    return {
      status: 'failure',
      source: this.source,
      category,
      errorCode,
      message,
    };
  }
}
