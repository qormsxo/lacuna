import * as cheerio from 'cheerio';
import { collapseWhitespace } from '../../utils/text';

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  '.ad',
  '.ads',
  '.advertisement',
  '[class*="ad_"]',
  '[id*="ad_"]',
  '[class*="recommend"]',
  '[class*="related"]',
  '[class*="comment"]',
  '[id*="comment"]',
  '[class*="reply"]',
  '[class*="share"]',
  '[class*="sns"]',
  '[class*="promotion"]',
  '[class*="banner"]',
  '[class*="newsletter"]',
  '.media_end_linked_more',
  '.media_end_categorize',
  '.journalistcard_summary',
  '.copyright',
  '.util_nav',
  '#cbox_module',
  '.box_etc',
  '.relate_news',
  '.list_relate',
  '.tag_relate',
];

export function cleanArticleRoot($: cheerio.CheerioAPI, selector: string) {
  const root = $(selector).first();

  if (root.length === 0) {
    return null;
  }

  const clone = root.clone();

  for (const removeSelector of REMOVE_SELECTORS) {
    clone.find(removeSelector).remove();
  }

  clone.find('*').each((_, element) => {
    const node = $(element);
    const className = (node.attr('class') ?? '').toLowerCase();
    const id = (node.attr('id') ?? '').toLowerCase();
    const combined = `${className} ${id}`;

    if (
      combined.includes('menu') ||
      combined.includes('nav') ||
      combined.includes('sidebar')
    ) {
      node.remove();
    }
  });

  return clone;
}

export function extractParagraphText(
  $: cheerio.CheerioAPI,
  root: NonNullable<ReturnType<typeof cleanArticleRoot>>,
): string {
  const paragraphs: string[] = [];

  root.find('p').each((_, element) => {
    const text = collapseWhitespace($(element).text());

    if (text.length >= 20) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  const clone = root.clone();
  clone.find('br').replaceWith('\n');

  return collapseWhitespace(clone.text()).replace(/\n+/gu, '\n\n').trim();
}
