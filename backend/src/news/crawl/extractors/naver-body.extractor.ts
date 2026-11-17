import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { collapseWhitespace, isBlank } from '../../utils/text';
import { validateArticleBody } from './body-validator';
import { cleanArticleRoot, extractParagraphText } from './dom-cleaner';
import { BodyExtractionResult, BodyExtractor } from './extraction-types';

@Injectable()
export class NaverBodyExtractor implements BodyExtractor {
  readonly name = 'naver';

  supports(url: string): boolean {
    return (
      url.includes('n.news.naver.com/') ||
      url.includes('news.naver.com/') ||
      url.includes('m.entertain.naver.com/') ||
      url.includes('m.sports.naver.com/')
    );
  }

  extract(html: string, pageUrl: string): BodyExtractionResult {
    const $ = cheerio.load(html);

    const root =
      cleanArticleRoot($, '#dic_area') ??
      cleanArticleRoot($, '#newsct_article') ??
      cleanArticleRoot($, 'article#dic_area');

    if (root === null) {
      return {
        status: 'failure',
        errorCode: 'STRUCTURE_CHANGED',
        message: 'Naver article body container was not found',
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
        author: this.readAuthor($),
        publishedAt: this.readDateTime($, '._ARTICLE_DATE_TIME'),
        modifiedAt: this.readDateTime($, '._ARTICLE_MODIFY_DATE_TIME'),
        canonicalUrl: pageUrl,
      },
    };
  }

  private readTitle($: cheerio.CheerioAPI): string {
    const headline = collapseWhitespace(
      $('#title_area h2, .media_end_head_headline').first().text(),
    );

    if (!isBlank(headline)) {
      return headline;
    }

    return collapseWhitespace(
      $('meta[property="og:title"]').attr('content') ?? '',
    );
  }

  private readPublisher($: cheerio.CheerioAPI): string | null {
    const logoAlt = collapseWhitespace(
      $('.media_end_head_top_logo img').attr('alt') ?? '',
    );

    if (!isBlank(logoAlt)) {
      return logoAlt;
    }

    const siteName = collapseWhitespace(
      $('meta[property="og:site_name"]').attr('content') ?? '',
    );

    if (isBlank(siteName) || siteName === '네이버 뉴스') {
      return null;
    }

    return siteName;
  }

  private readAuthor($: cheerio.CheerioAPI): string | null {
    const journalist = collapseWhitespace(
      $('em.media_end_head_journalist_name').first().text(),
    );

    if (!isBlank(journalist)) {
      return journalist;
    }

    const byline = collapseWhitespace($('.byline_p').first().text());

    if (isBlank(byline)) {
      return null;
    }

    return byline;
  }

  private readDateTime($: cheerio.CheerioAPI, selector: string): string | null {
    const node = $(selector).first();

    const dataValue =
      node.attr('data-date-time') ?? node.attr('data-modify-date-time');

    if (!isBlank(dataValue)) {
      return collapseWhitespace(dataValue ?? '');
    }

    const text = collapseWhitespace(node.text());

    if (isBlank(text)) {
      return null;
    }

    return text;
  }
}
