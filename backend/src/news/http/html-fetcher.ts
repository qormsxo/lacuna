import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { CollectorErrorCode } from '../dto/collect-result.dto';
import { collapseWhitespace, isBlank } from '../utils/text';

export type HtmlFetchSuccess = {
  status: 'success';
  url: string;
  finalUrl: string;
  statusCode: number;
  body: string;
};

export type HtmlFetchFailure = {
  status: 'failure';
  url: string;
  errorCode: CollectorErrorCode;
  message: string;
};

export type HtmlFetchResult = HtmlFetchSuccess | HtmlFetchFailure;

export type FetchHtmlOptions = {
  encoding?: 'utf-8' | 'euc-kr';
};

@Injectable()
export class HtmlFetcher {
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(configService: ConfigService) {
    this.timeoutMs = configService.get<number>('news.httpTimeoutMs') ?? 15000;
    this.userAgent =
      configService.get<string>('news.userAgent') ??
      'Mozilla/5.0 (compatible; LacunaNewsCollector/0.1; +http://localhost)';
  }

  async fetchHtml(
    url: string,
    options: FetchHtmlOptions = {},
  ): Promise<HtmlFetchResult> {
    try {
      new URL(url);
    } catch {
      return {
        status: 'failure',
        url,
        errorCode: 'INVALID_URL',
        message: `Invalid URL: ${url}`,
      };
    }

    try {
      const response = await axios.get<ArrayBuffer>(url, {
        timeout: this.timeoutMs,
        responseType: 'arraybuffer',
        maxRedirects: 5,
        headers: {
          'User-Agent': this.userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        validateStatus: () => true,
      });

      if (response.status === 401 || response.status === 403) {
        return {
          status: 'failure',
          url,
          errorCode: 'ACCESS_DENIED',
          message: `Access denied with status ${response.status}`,
        };
      }

      if (response.status >= 400) {
        return {
          status: 'failure',
          url,
          errorCode: 'NETWORK_ERROR',
          message: `HTTP status ${response.status}`,
        };
      }

      const encoding = options.encoding ?? 'utf-8';
      const buffer = Buffer.from(response.data);

      const body =
        encoding === 'euc-kr'
          ? iconv.decode(buffer, 'euc-kr')
          : buffer.toString('utf8');

      return {
        status: 'success',
        url,
        finalUrl: this.readFinalUrl(url, body),
        statusCode: response.status,
        body,
      };
    } catch (error) {
      if (error instanceof AxiosError || error instanceof Error) {
        return this.toFailure(url, error);
      }

      return {
        status: 'failure',
        url,
        errorCode: 'NETWORK_ERROR',
        message: 'Unknown network error',
      };
    }
  }

  private readFinalUrl(fallbackUrl: string, html: string): string {
    const $ = cheerio.load(html);

    const canonical = collapseWhitespace(
      $('link[rel="canonical"]').attr('href') ?? '',
    );

    if (!isBlank(canonical)) {
      try {
        return new URL(canonical, fallbackUrl).toString();
      } catch {
        return fallbackUrl;
      }
    }

    const ogUrl = collapseWhitespace(
      $('meta[property="og:url"]').attr('content') ?? '',
    );

    if (!isBlank(ogUrl)) {
      try {
        return new URL(ogUrl, fallbackUrl).toString();
      } catch {
        return fallbackUrl;
      }
    }

    return fallbackUrl;
  }

  private toFailure(url: string, error: AxiosError | Error): HtmlFetchFailure {
    if (error instanceof AxiosError && error.code === 'ECONNABORTED') {
      return {
        status: 'failure',
        url,
        errorCode: 'TIMEOUT',
        message: `Request timed out for ${url}`,
      };
    }

    return {
      status: 'failure',
      url,
      errorCode: 'NETWORK_ERROR',
      message: error.message,
    };
  }
}
