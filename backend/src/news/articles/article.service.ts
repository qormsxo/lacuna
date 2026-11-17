import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { BodyStorageMode } from '../constants/body-storage';
import { CrawlStatus, CRAWL_STATUSES } from '../constants/crawl-status';
import { ArticleDto } from '../dto/article.dto';
import { NewsArticleEntity } from '../entities/news-article.entity';
import { ExtractedArticleBody } from '../crawl/extractors/extraction-types';
import {
  buildArticleIdentity,
  hashText,
} from '../utils/article-identity';
import { UpsertCollectedResult } from './article-collection.store';

@Injectable()
export class ArticleService {
  private readonly bodyStorageMode: BodyStorageMode;

  constructor(
    @InjectRepository(NewsArticleEntity)
    private readonly articles: Repository<NewsArticleEntity>,
    configService: ConfigService,
  ) {
    this.bodyStorageMode =
      configService.get<boolean>('news.storeFullBody') === false
        ? 'metadata_only'
        : 'full';
  }

  async upsertCollectedArticles(
    articles: ArticleDto[],
  ): Promise<UpsertCollectedResult> {
    const saved: NewsArticleEntity[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;

    for (const article of articles) {
      const identity = buildArticleIdentity(
        article.url,
        article.title,
        article.publisher,
      );

      if (identity === null) {
        duplicateCount += 1;
        continue;
      }

      const existing = await this.findExistingDuplicate(identity);

      if (existing !== null) {
        existing.url = article.url;
        existing.normalizedUrl = identity.normalizedUrl;
        existing.articleKey = identity.articleKey ?? existing.articleKey;
        existing.title = article.title;
        existing.titleHash = identity.titleHash;
        existing.publisher = article.publisher;
        existing.identityHash = identity.identityHash;
        existing.category = article.category;
        existing.source = article.source;
        existing.summary = article.summary;
        existing.listPublishedAt = article.publishedAt;
        existing.collectedAt = new Date(article.collectedAt);
        saved.push(await this.articles.save(existing));
        updatedCount += 1;
        duplicateCount += 1;
        continue;
      }

      const created = this.articles.create({
        url: article.url,
        normalizedUrl: identity.normalizedUrl,
        articleKey: identity.articleKey,
        title: article.title,
        titleHash: identity.titleHash,
        publisher: article.publisher,
        identityHash: identity.identityHash,
        category: article.category,
        source: article.source,
        summary: article.summary,
        listPublishedAt: article.publishedAt,
        collectedAt: new Date(article.collectedAt),
        crawlStatus: 'pending',
        crawlAttempts: 0,
        nextRetryAt: null,
        crawledAt: null,
        body: null,
        bodyLength: null,
        bodyHash: null,
        bodyStorageMode: this.bodyStorageMode,
        bodyExtracted: false,
        isDuplicate: false,
        duplicateOfId: null,
        author: null,
        publishedAt: null,
        modifiedAt: null,
        lastError: null,
        lastErrorCode: null,
      });

      saved.push(await this.articles.save(created));
      createdCount += 1;
    }

    return {
      articles: saved,
      createdCount,
      updatedCount,
      duplicateCount,
    };
  }

  findById(id: string): Promise<NewsArticleEntity | null> {
    return this.articles.findOne({ where: { id } });
  }

  countAll(): Promise<number> {
    return this.articles.count();
  }

  async countByCategory(): Promise<Array<{ category: string; count: number }>> {
    const rows = await this.articles
      .createQueryBuilder('article')
      .select('article.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('article.category')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ category: string; count: string }>();

    const result: Array<{ category: string; count: number }> = [];

    for (const row of rows) {
      result.push({
        category: row.category,
        count: Number(row.count),
      });
    }

    return result;
  }


  findMany(params: {
    crawlStatus?: CrawlStatus;
    category?: string;
    from?: Date;
    to?: Date;
    limit: number;
    offset?: number;
  }): Promise<NewsArticleEntity[]> {
    const query = this.articles.createQueryBuilder('article');

    if (params.crawlStatus !== undefined) {
      query.andWhere('article.crawlStatus = :crawlStatus', {
        crawlStatus: params.crawlStatus,
      });
    }

    if (params.category !== undefined) {
      query.andWhere('article.category = :category', {
        category: params.category,
      });
    }

    if (params.from !== undefined) {
      query.andWhere('article.collectedAt >= :from', { from: params.from });
    }

    if (params.to !== undefined) {
      query.andWhere('article.collectedAt <= :to', { to: params.to });
    }

    query.orderBy('article.collectedAt', 'DESC');
    query.take(params.limit);

    if (params.offset !== undefined && params.offset > 0) {
      query.skip(params.offset);
    }

    return query.getMany();
  }

  findCrawlCandidates(limit: number): Promise<NewsArticleEntity[]> {
    const now = new Date();

    return this.articles.find({
      where: [
        { crawlStatus: 'pending', isDuplicate: false },
        {
          crawlStatus: 'retry_waiting',
          nextRetryAt: LessThanOrEqual(now),
          isDuplicate: false,
        },
      ],
      order: { collectedAt: 'ASC' },
      take: limit,
    });
  }

  async markCrawling(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.articles.update(
      { id: In(ids), crawlStatus: In(['pending', 'retry_waiting']) },
      {
        crawlStatus: 'crawling',
        lastError: null,
        lastErrorCode: null,
      },
    );
  }

  async markSuccess(
    article: NewsArticleEntity,
    extracted: ExtractedArticleBody,
  ): Promise<NewsArticleEntity> {
    const bodyHash = hashText(extracted.body);
    const duplicateOf = await this.findBodyDuplicate(article.id, bodyHash, article.publisher);

    article.crawlStatus = 'success';
    article.crawlAttempts += 1;
    article.nextRetryAt = null;
    article.crawledAt = new Date();
    article.title = extracted.title || article.title;
    article.publisher = extracted.publisher ?? article.publisher;
    article.author = extracted.author;
    article.publishedAt = extracted.publishedAt;
    article.modifiedAt = extracted.modifiedAt;
    article.bodyExtracted = true;
    article.bodyLength = extracted.body.length;
    article.bodyHash = bodyHash;
    article.bodyStorageMode = this.bodyStorageMode;
    article.body = this.bodyStorageMode === 'full' ? extracted.body : null;
    article.lastError = null;
    article.lastErrorCode = null;

    if (duplicateOf !== null) {
      article.isDuplicate = true;
      article.duplicateOfId = duplicateOf.id;
    }

    return this.articles.save(article);
  }

  async markFailure(
    article: NewsArticleEntity,
    params: {
      errorCode: string;
      message: string;
      inaccessible: boolean;
      maxAttempts: number;
      retryDelayMs: number;
    },
  ): Promise<NewsArticleEntity> {
    article.crawlAttempts += 1;
    article.crawledAt = new Date();
    article.lastError = params.message;
    article.lastErrorCode = params.errorCode;
    article.bodyExtracted = false;

    if (params.inaccessible) {
      article.crawlStatus = 'inaccessible';
      article.nextRetryAt = null;

      return this.articles.save(article);
    }

    if (article.crawlAttempts >= params.maxAttempts) {
      article.crawlStatus = 'failed';
      article.nextRetryAt = null;

      return this.articles.save(article);
    }

    article.crawlStatus = 'retry_waiting';
    article.nextRetryAt = new Date(Date.now() + params.retryDelayMs);

    return this.articles.save(article);
  }

  async countByCrawlStatus(): Promise<Record<CrawlStatus, number>> {
    const counts: Record<CrawlStatus, number> = {
      pending: 0,
      crawling: 0,
      success: 0,
      failed: 0,
      retry_waiting: 0,
      inaccessible: 0,
    };

    const rows = await this.articles
      .createQueryBuilder('article')
      .select('article.crawlStatus', 'crawlStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('article.crawlStatus')
      .getRawMany<{ crawlStatus: string; count: string }>();

    for (const row of rows) {
      for (const status of CRAWL_STATUSES) {
        if (row.crawlStatus === status) {
          counts[status] = Number(row.count);
        }
      }
    }

    return counts;
  }

  private async findExistingDuplicate(identity: {
    normalizedUrl: string;
    articleKey: string | null;
    identityHash: string | null;
  }): Promise<NewsArticleEntity | null> {
    const byUrl = await this.articles.findOne({
      where: { normalizedUrl: identity.normalizedUrl },
    });

    if (byUrl !== null) {
      return byUrl;
    }

    if (identity.articleKey !== null) {
      const byKey = await this.articles.findOne({
        where: { articleKey: identity.articleKey },
      });

      if (byKey !== null) {
        return byKey;
      }
    }

    if (identity.identityHash !== null) {
      const byIdentity = await this.articles.findOne({
        where: { identityHash: identity.identityHash },
      });

      if (byIdentity !== null) {
        return byIdentity;
      }
    }

    return null;
  }

  private async findBodyDuplicate(
    articleId: string,
    bodyHash: string,
    publisher: string | null,
  ): Promise<NewsArticleEntity | null> {
    if (publisher === null) {
      return null;
    }

    const query = this.articles
      .createQueryBuilder('article')
      .where('article.bodyHash = :bodyHash', { bodyHash })
      .andWhere('article.publisher = :publisher', { publisher })
      .andWhere('article.id != :articleId', { articleId })
      .andWhere('article.crawlStatus = :status', { status: 'success' })
      .orderBy('article.collectedAt', 'ASC')
      .take(1);

    return query.getOne();
  }
}
