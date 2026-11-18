import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  decodeGoogleNewsArticleUrl,
  extractGoogleNewsArticleId,
  isGoogleNewsWrapperUrl,
} from './google-news-url';

const BATCH_EXECUTE_URL =
  'https://news.google.com/_/DotsSplashUi/data/batchexecute';

@Injectable()
export class GoogleNewsUrlResolver {
  private readonly logger = new Logger(GoogleNewsUrlResolver.name);
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(configService: ConfigService) {
    this.timeoutMs = configService.get<number>('news.httpTimeoutMs') ?? 15000;
    this.userAgent =
      configService.get<string>('news.userAgent') ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  }

  async resolve(url: string): Promise<string | null> {
    if (!isGoogleNewsWrapperUrl(url)) {
      return url;
    }

    const embedded = decodeGoogleNewsArticleUrl(url);

    if (embedded !== null) {
      return embedded;
    }

    return this.resolveViaBatchexecute(url);
  }

  private async resolveViaBatchexecute(url: string): Promise<string | null> {
    const articleId = extractGoogleNewsArticleId(url);

    if (articleId === null) {
      return null;
    }

    try {
      const page = await axios.get<string>(url, {
        timeout: this.timeoutMs,
        responseType: 'text',
        maxRedirects: 5,
        headers: {
          'User-Agent': this.userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        validateStatus: () => true,
      });

      if (page.status === 429) {
        this.logger.warn(`Google resolve rate-limited for ${articleId}`);
        return null;
      }

      if (page.status >= 400) {
        this.logger.warn(
          `Google resolve page failed status=${page.status} for ${articleId}`,
        );
        return null;
      }

      const redirected = this.readAxiosFinalUrl(page, url);

      if (!isGoogleNewsWrapperUrl(redirected)) {
        return redirected;
      }

      const html = typeof page.data === 'string' ? page.data : String(page.data);
      const signature = html.match(/data-n-a-sg="([^"]+)"/u)?.[1];
      const timestamp = html.match(/data-n-a-ts="([^"]+)"/u)?.[1];

      if (signature === undefined || timestamp === undefined) {
        this.logger.warn(
          `Google resolve missing signature/timestamp for ${articleId}`,
        );
        return null;
      }

      const rpcInner = JSON.stringify([
        'garturlreq',
        [
          [
            'X',
            'X',
            ['X', 'X'],
            null,
            null,
            1,
            1,
            'KR:ko',
            null,
            1,
            null,
            null,
            null,
            null,
            null,
            0,
            1,
          ],
          'X',
          'X',
          1,
          [1, 1, 1],
          1,
          1,
          null,
          0,
          0,
          null,
          0,
        ],
        articleId,
        Number(timestamp),
        signature,
      ]);

      const fReq = JSON.stringify([[['Fbv4je', rpcInner, null, 'generic']]]);
      const post = await axios.post<string>(
        BATCH_EXECUTE_URL,
        new URLSearchParams({ 'f.req': fReq }).toString(),
        {
          timeout: this.timeoutMs,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': this.userAgent,
            Referer: 'https://news.google.com/',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          },
          validateStatus: () => true,
        },
      );

      if (post.status >= 400) {
        this.logger.warn(
          `Google batchexecute failed status=${post.status} for ${articleId}`,
        );
        return null;
      }

      return this.parseBatchexecutePublisherUrl(String(post.data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Google resolve error for ${articleId}: ${message}`);
      return null;
    }
  }

  private parseBatchexecutePublisherUrl(rawBody: string): string | null {
    let body = rawBody;

    if (body.startsWith(")]}'")) {
      const newline = body.indexOf('\n');
      body = newline >= 0 ? body.slice(newline + 1) : body.slice(4);
    }

    const direct = /garturlres","(https?:\/\/[^"\\]+)"/u.exec(body);

    if (direct?.[1] !== undefined) {
      return this.safePublisherUrl(direct[1].replace(/\\u003d/gu, '='));
    }

    try {
      const envelopes = JSON.parse(body) as unknown;

      if (!Array.isArray(envelopes)) {
        return null;
      }

      for (const envelope of envelopes) {
        if (!Array.isArray(envelope) || envelope.length < 3) {
          continue;
        }

        if (envelope[0] !== 'wrb.fr' || envelope[1] !== 'Fbv4je') {
          continue;
        }

        const payload = JSON.parse(String(envelope[2])) as unknown;

        if (
          Array.isArray(payload) &&
          payload[0] === 'garturlres' &&
          typeof payload[1] === 'string'
        ) {
          return this.safePublisherUrl(payload[1]);
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private safePublisherUrl(candidate: string): string | null {
    try {
      const parsed = new URL(candidate);

      if (parsed.hostname.includes('news.google.com')) {
        return null;
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  private readAxiosFinalUrl(
    response: {
      request?: { res?: { responseUrl?: string } };
      config?: { url?: string };
    },
    fallbackUrl: string,
  ): string {
    const fromRedirect = response.request?.res?.responseUrl;

    if (typeof fromRedirect === 'string' && fromRedirect.length > 0) {
      return fromRedirect;
    }

    if (
      typeof response.config?.url === 'string' &&
      response.config.url.length > 0
    ) {
      return response.config.url;
    }

    return fallbackUrl;
  }
}
