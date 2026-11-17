import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { DAUM_SOURCE_URLS } from '../constants/source-urls';
import { ArticleDto } from '../dto/article.dto';
import {
  CollectorFailureDto,
  CollectorResult,
} from '../dto/collect-result.dto';
import { HtmlFetcher } from '../http/html-fetcher';
import { collapseWhitespace, isBlank } from '../utils/text';
import { normalizeArticleUrl } from '../utils/url';
import { CollectRequest, NewsCollector } from './news-collector';

type DraftArticle = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  summary: string | null;
};

type ParsedHeadline = {
  title: string;
  publisher: string | null;
  publishedAt: string | null;
  summary: string | null;
};

@Injectable()
export class DaumNewsCollector implements NewsCollector {
  readonly source = 'daum' as const;

  constructor(private readonly htmlFetcher: HtmlFetcher) {}

  async collect(request: CollectRequest): Promise<CollectorResult> {
    const urls = DAUM_SOURCE_URLS[request.category];
    const collectedAt = new Date().toISOString();
    const drafts: DraftArticle[] = [];
    const seen = new Set<string>();
    let lastFailure: CollectorFailureDto | null = null;

    for (const url of urls) {
      const fetched = await this.htmlFetcher.fetchHtml(url);

      if (fetched.status === 'failure') {
        lastFailure = {
          status: 'failure',
          source: this.source,
          category: request.category,
          errorCode: fetched.errorCode,
          message: fetched.message,
        };
        continue;
      }

      try {
        const pageDrafts = this.isSearchUrl(url)
          ? this.parseSearchPage(fetched.body)
          : this.parseSectionPage(fetched.body);

        for (const draft of pageDrafts) {
          if (seen.has(draft.url)) {
            continue;
          }

          seen.add(draft.url);
          drafts.push(draft);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to parse Daum HTML';

        lastFailure = this.failure(request.category, 'PARSE_ERROR', message);
      }
    }

    if (drafts.length === 0) {
      if (lastFailure !== null) {
        return lastFailure;
      }

      return this.failure(
        request.category,
        'EMPTY_LIST',
        `Daum returned no parseable articles for category ${request.category}`,
      );
    }

    return {
      status: 'success',
      source: this.source,
      category: request.category,
      articles: this.toArticles(drafts, request.category, collectedAt),
    };
  }

  parseSectionPage(html: string): DraftArticle[] {
    const $ = cheerio.load(html);

    const anchors = $(
      'a.item_newsheadline2[href*="v.daum.net"], a.item_newsblock[href*="v.daum.net"]',
    );

    if (anchors.length === 0) {
      throw new Error('Daum section selectors matched no article links');
    }

    const drafts: DraftArticle[] = [];
    const seen = new Set<string>();

    anchors.each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr('href') ?? '';
      const url = normalizeArticleUrl(href);

      if (url === null || seen.has(url)) {
        return;
      }

      const parsed = this.parseHeadlineText(anchor.text());

      if (isBlank(parsed.title)) {
        return;
      }

      seen.add(url);
      drafts.push({
        title: parsed.title,
        url,
        publisher: parsed.publisher,
        publishedAt: parsed.publishedAt,
        summary: parsed.summary,
      });
    });

    return drafts;
  }

  parseSearchPage(html: string): DraftArticle[] {
    const $ = cheerio.load(html);

    const titleAnchors = $(
      'a.tit_main[href*="v.daum.net"], a.tit_main[href*="daum.net/v/"]',
    );

    if (titleAnchors.length === 0) {
      throw new Error('Daum search selectors matched no article links');
    }

    const drafts: DraftArticle[] = [];
    const seen = new Set<string>();

    titleAnchors.each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr('href') ?? '';

      const absoluteHref = href.startsWith('http')
        ? href
        : `https://${href.replace(/^\/\//u, '')}`;

      const url = normalizeArticleUrl(absoluteHref);

      if (url === null || seen.has(url)) {
        return;
      }

      const title = collapseWhitespace(anchor.text());

      if (isBlank(title)) {
        return;
      }

      const card = anchor.closest('.c-item, .item-bundle, li, .wrap_cont');

      const summary = this.nullableText(
        card.find('a.desc, .desc, p.desc').first().text(),
      );

      const publisher = this.nullableText(
        card.find('a.item-writer, .item-writer, .txt_info').first().text(),
      );

      const publishedAt = this.nullableText(
        card.find('.txt_info, .f_nb, .date').first().text(),
      );

      seen.add(url);
      drafts.push({
        title,
        url,
        publisher,
        publishedAt,
        summary,
      });
    });

    return drafts;
  }

  private parseHeadlineText(rawText: string): ParsedHeadline {
    const text = collapseWhitespace(rawText);

    if (isBlank(text)) {
      return {
        title: '',
        publisher: null,
        publishedAt: null,
        summary: null,
      };
    }

    const relativeTimeMatch = text.match(
      /^(.*)\s+(\S+)\s+(\d+\s*(?:분|시간|일)\s*전)$/u,
    );

    if (relativeTimeMatch !== null) {
      const title = collapseWhitespace(relativeTimeMatch[1] ?? '');
      const publisher = collapseWhitespace(relativeTimeMatch[2] ?? '');
      const publishedAt = collapseWhitespace(relativeTimeMatch[3] ?? '');

      return {
        title,
        publisher: publisher.length > 0 ? publisher : null,
        publishedAt: publishedAt.length > 0 ? publishedAt : null,
        summary: null,
      };
    }

    if (text.length > 80) {
      return {
        title: text.slice(0, 80).trim(),
        publisher: null,
        publishedAt: null,
        summary: text,
      };
    }

    return {
      title: text,
      publisher: null,
      publishedAt: null,
      summary: null,
    };
  }

  private isSearchUrl(url: string): boolean {
    return url.includes('search.daum.net/search');
  }

  private toArticles(
    drafts: DraftArticle[],
    category: CollectRequest['category'],
    collectedAt: string,
  ): ArticleDto[] {
    const articles: ArticleDto[] = [];

    for (const draft of drafts) {
      articles.push({
        title: draft.title,
        url: draft.url,
        publisher: draft.publisher,
        publishedAt: draft.publishedAt,
        collectedAt,
        category,
        source: this.source,
        summary: draft.summary,
      });
    }

    return articles;
  }

  private nullableText(value: string): string | null {
    const text = collapseWhitespace(value);

    if (text.length === 0) {
      return null;
    }

    return text;
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
