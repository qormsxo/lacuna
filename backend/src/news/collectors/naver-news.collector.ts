import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { NAVER_SOURCE_URLS } from '../constants/source-urls';
import { ArticleDto } from '../dto/article.dto';
import {
  CollectorFailureDto,
  CollectorResult,
} from '../dto/collect-result.dto';
import { HtmlFetcher } from '../http/html-fetcher';
import {
  collapseWhitespace,
  isBlank,
  stripOpenInNewWindow,
} from '../utils/text';
import { normalizeArticleUrl } from '../utils/url';
import { CollectRequest, NewsCollector } from './news-collector';

type DraftArticle = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  summary: string | null;
};

@Injectable()
export class NaverNewsCollector implements NewsCollector {
  readonly source = 'naver' as const;

  constructor(private readonly htmlFetcher: HtmlFetcher) {}

  async collect(request: CollectRequest): Promise<CollectorResult> {
    const config = NAVER_SOURCE_URLS[request.category];
    const collectedAt = new Date().toISOString();
    const encoding = config.kind === 'list' ? 'euc-kr' : 'utf-8';
    const fetched = await this.htmlFetcher.fetchHtml(config.url, { encoding });

    if (fetched.status === 'failure') {
      return {
        status: 'failure',
        source: this.source,
        category: request.category,
        errorCode: fetched.errorCode,
        message: fetched.message,
      };
    }

    try {
      const drafts =
        config.kind === 'list'
          ? this.parseListPage(fetched.body)
          : this.parseSearchPage(fetched.body);

      if (drafts.length === 0) {
        return this.failure(
          request.category,
          'EMPTY_LIST',
          `Naver returned no parseable articles from ${config.url}`,
        );
      }

      return {
        status: 'success',
        source: this.source,
        category: request.category,
        articles: this.toArticles(drafts, request.category, collectedAt),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to parse Naver HTML';

      return this.failure(request.category, 'PARSE_ERROR', message);
    }
  }

  parseListPage(html: string): DraftArticle[] {
    const $ = cheerio.load(html);
    const items = $('ul.type06_headline li, ul.type06 li');

    if (items.length === 0) {
      throw new Error('Naver list selectors matched no items');
    }

    const drafts: DraftArticle[] = [];
    const seen = new Set<string>();

    items.each((_, element) => {
      const root = $(element);
      let title = '';
      let href = '';

      root.find('dt a, a').each((__, anchorElement) => {
        const anchor = $(anchorElement);
        const text = collapseWhitespace(anchor.text());
        const currentHref = anchor.attr('href') ?? '';

        if (href.length === 0 && currentHref.length > 0) {
          href = currentHref;
        }

        if (title.length === 0 && !isBlank(text)) {
          title = text;
          href = currentHref;
        }
      });

      if (isBlank(title)) {
        const alt = root.find('dt.photo img, img').first().attr('alt');
        title = collapseWhitespace(alt ?? '');
      }

      const url = normalizeArticleUrl(href);

      if (url === null || seen.has(url) || isBlank(title)) {
        return;
      }

      seen.add(url);
      drafts.push({
        title,
        url,
        publisher: this.nullableText(root.find('span.writing').first().text()),
        publishedAt: this.nullableText(root.find('span.date').first().text()),
        summary: this.nullableText(root.find('span.lede').first().text()),
      });
    });

    return drafts;
  }

  parseSearchPage(html: string): DraftArticle[] {
    const $ = cheerio.load(html);
    const draftsByUrl = new Map<string, DraftArticle>();

    $('a[href]').each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr('href') ?? '';

      if (!this.isNaverSearchArticleUrl(href)) {
        return;
      }

      const url = normalizeArticleUrl(href);

      if (url === null) {
        return;
      }

      const text = stripOpenInNewWindow(anchor.text());

      if (isBlank(text) || text.startsWith('네이버뉴스')) {
        return;
      }

      const existing = draftsByUrl.get(url);

      if (existing === undefined) {
        draftsByUrl.set(url, {
          title: text,
          url,
          publisher: null,
          publishedAt: null,
          summary: null,
        });

        return;
      }

      if (text === existing.title) {
        return;
      }

      if (text.length > (existing.summary?.length ?? 0)) {
        existing.summary = text;
      }
    });

    const drafts = Array.from(draftsByUrl.values());

    if (drafts.length === 0) {
      throw new Error('Naver search selectors matched no article links');
    }

    return drafts;
  }

  private isNaverSearchArticleUrl(href: string): boolean {
    if (!href.startsWith('http')) {
      return false;
    }

    return (
      href.includes('n.news.naver.com/') ||
      href.includes('m.entertain.naver.com/article/') ||
      href.includes('m.sports.naver.com/') ||
      /\/article\//u.test(href) ||
      /articleView\.html/u.test(href)
    );
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
