import { BodyExtractionResult } from './extraction-types';

export type BodyExtractorRunner = {
  extract(
    html: string,
    pageUrl: string,
    source?: string,
  ): BodyExtractionResult;
};

export const BODY_EXTRACTOR_RUNNER = Symbol('BODY_EXTRACTOR_RUNNER');
