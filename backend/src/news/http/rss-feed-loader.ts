import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

export type RssFeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  creator?: string;
};

export type RssFeed = {
  title?: string;
  items?: RssFeedItem[];
};

@Injectable()
export class RssFeedLoader {
  private readonly parser = new Parser();

  parseUrl(url: string): Promise<RssFeed> {
    return this.parser.parseURL(url);
  }
}
