import { Injectable } from '@nestjs/common';
import { CommonBodyExtractor } from './common-body.extractor';
import { DaumBodyExtractor } from './daum-body.extractor';
import { BodyExtractionResult, BodyExtractor } from './extraction-types';
import { NaverBodyExtractor } from './naver-body.extractor';

@Injectable()
export class BodyExtractorService {
  private readonly extractors: BodyExtractor[];

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
  }

  extract(html: string, pageUrl: string): BodyExtractionResult {
    for (const extractor of this.extractors) {
      if (!extractor.supports(pageUrl)) {
        continue;
      }

      return extractor.extract(html, pageUrl);
    }

    return {
      status: 'failure',
      errorCode: 'PARSE_ERROR',
      message: `No body extractor available for ${pageUrl}`,
    };
  }
}
