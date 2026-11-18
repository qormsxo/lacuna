import { Injectable } from '@nestjs/common';
import { CommonBodyExtractor } from './common-body.extractor';
import { DaumBodyExtractor } from './daum-body.extractor';
import { BodyExtractionResult, BodyExtractor } from './extraction-types';
import { NaverBodyExtractor } from './naver-body.extractor';

@Injectable()
export class BodyExtractorService {
  private readonly extractors: BodyExtractor[];
  private readonly byName: Map<string, BodyExtractor>;

  constructor(
    naverBodyExtractor: NaverBodyExtractor,
    daumBodyExtractor: DaumBodyExtractor,
    commonBodyExtractor: CommonBodyExtractor,
  ) {
    this.extractors = [
      naverBodyExtractor,
      daumBodyExtractor,
      commonBodyExtractor,
    ];
    this.byName = new Map<string, BodyExtractor>([
      ['naver', naverBodyExtractor],
      ['daum', daumBodyExtractor],
      ['common', commonBodyExtractor],
    ]);
  }

  extract(
    html: string,
    pageUrl: string,
    source?: string,
  ): BodyExtractionResult {
    const preferred = this.preferredExtractor(source, pageUrl);

    if (preferred !== null) {
      return preferred.extract(html, pageUrl);
    }

    for (const extractor of this.extractors) {
      if (!extractor.supports(pageUrl)) {
        continue;
      }

      return extractor.extract(html, pageUrl);
    }

    return {
      status: 'failure',
      errorCode: 'PARSE_ERROR',
      message: `No body extractor available for source=${source ?? 'unknown'} url=${pageUrl}`,
    };
  }

  private preferredExtractor(
    source: string | undefined,
    pageUrl: string,
  ): BodyExtractor | null {
    if (source === 'naver') {
      const extractor = this.byName.get('naver');
      if (extractor !== undefined && extractor.supports(pageUrl)) {
        return extractor;
      }
    }

    if (source === 'daum') {
      const extractor = this.byName.get('daum');
      if (extractor !== undefined && extractor.supports(pageUrl)) {
        return extractor;
      }
    }

    // Google (or unknown): pick by resolved publisher URL, never the google wrapper extractor path.
    for (const extractor of this.extractors) {
      if (extractor.name === 'common') {
        continue;
      }

      if (extractor.supports(pageUrl)) {
        return extractor;
      }
    }

    if (source === 'google' || source === undefined) {
      return this.byName.get('common') ?? null;
    }

    return null;
  }
}
