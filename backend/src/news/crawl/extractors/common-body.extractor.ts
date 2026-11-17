import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { collapseWhitespace, isBlank } from '../../utils/text';
import { validateArticleBody } from './body-validator';
import { cleanArticleRoot, extractParagraphText } from './dom-cleaner';
import { BodyExtractionResult, BodyExtractor } from './extraction-types';

@Injectable()
export class CommonBodyExtractor implements BodyExtractor {
  readonly name = 'common';

  supports(): boolean {
    return true;
  }

  extract(html: string, pageUrl: string): BodyExtractionResult {
    if (pageUrl.includes('news.google.com/')) {
      return {
        status: 'failure',
        errorCode: 'ACCESS_DENIED',
        message:
          'Google News wrapper URL did not resolve to a publisher article page',
      };
    }

    const $ = cheerio.load(html);

    const root =
      cleanArticleRoot($, 'div[itemprop="articleBody"]') ??
      cleanArticleRoot($, 'article') ??
      cleanArticleRoot($, 'main');

    if (root === null) {
      return {
        status: 'failure',
        errorCode: 'STRUCTURE_CHANGED',
        message: 'Common article body container was not found',
      };
    }

    const title = this.readTitle($);
    const body = extractParagraphText($, root);
    const validation = validateArticleBody(body, title);

    if (validation.status === 'invalid') {
      return {
        status: 'failure',
        errorCode: 'INVALID_BODY',
        message: validation.reason,
      };
    }

    return {
      status: 'success',
      data: {
        title,
        publisher: this.readPublisher($),
        body,
        author: null,
        publishedAt:
          $('meta[property="article:published_time"]').attr('content') ?? null,
        modifiedAt:
          $('meta[property="article:modified_time"]').attr('content') ?? null,
        canonicalUrl: pageUrl,
      },
    };
  }

  private readTitle($: cheerio.CheerioAPI): string {
    const ogTitle = collapseWhitespace(
      $('meta[property="og:title"]').attr('content') ?? '',
    );

    if (!isBlank(ogTitle)) {
      return ogTitle;
    }

    return collapseWhitespace($('h1').first().text());
  }

  private readPublisher($: cheerio.CheerioAPI): string | null {
    const siteName = collapseWhitespace(
      $('meta[property="og:site_name"]').attr('content') ?? '',
    );

    if (isBlank(siteName)) {
      return null;
    }

    return siteName;
  }
}
