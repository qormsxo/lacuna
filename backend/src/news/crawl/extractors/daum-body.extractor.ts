import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { collapseWhitespace, isBlank } from '../../utils/text';
import { validateArticleBody } from './body-validator';
import { cleanArticleRoot, extractParagraphText } from './dom-cleaner';
import { BodyExtractionResult, BodyExtractor } from './extraction-types';

type ArticleInfo = {
  author: string | null;
  publishedAt: string | null;
};

@Injectable()
export class DaumBodyExtractor implements BodyExtractor {
  readonly name = 'daum';

  supports(url: string): boolean {
    return (
      url.includes('v.daum.net/') ||
      url.includes('news.daum.net/') ||
      url.includes('entertain.daum.net/')
    );
  }

  extract(html: string, pageUrl: string): BodyExtractionResult {
    const $ = cheerio.load(html);

    const root =
      cleanArticleRoot($, '.article_view') ?? cleanArticleRoot($, '.news_view');

    if (root === null) {
      return {
        status: 'failure',
        errorCode: 'STRUCTURE_CHANGED',
        message: 'Daum article body container was not found',
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

    const info = this.readInfo($);

    return {
      status: 'success',
      data: {
        title,
        publisher: this.readPublisher($),
        body,
        author: info.author,
        publishedAt: info.publishedAt,
        modifiedAt: null,
        canonicalUrl: pageUrl,
      },
    };
  }

  private readTitle($: cheerio.CheerioAPI): string {
    const headline = collapseWhitespace($('.tit_view').first().text());

    if (!isBlank(headline)) {
      return headline;
    }

    return collapseWhitespace(
      $('meta[property="og:title"]').attr('content') ?? '',
    );
  }

  private readPublisher($: cheerio.CheerioAPI): string | null {
    const siteName = collapseWhitespace(
      $('meta[property="og:site_name"]').attr('content') ?? '',
    );

    if (isBlank(siteName)) {
      return null;
    }

    const parts = siteName.split('|');

    if (parts.length >= 2) {
      return collapseWhitespace(parts[parts.length - 1] ?? siteName);
    }

    return siteName;
  }

  private readInfo($: cheerio.CheerioAPI): ArticleInfo {
    const infoText = collapseWhitespace($('.info_view').first().text());

    if (isBlank(infoText)) {
      return { author: null, publishedAt: null };
    }

    const match = infoText.match(
      /^(.+?)\s+(\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{1,2}:\d{2})/u,
    );

    if (match === null) {
      return { author: infoText, publishedAt: null };
    }

    return {
      author: collapseWhitespace(match[1] ?? '') || null,
      publishedAt: collapseWhitespace(match[2] ?? '') || null,
    };
  }
}
