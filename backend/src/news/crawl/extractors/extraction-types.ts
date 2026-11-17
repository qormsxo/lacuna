export type ExtractedArticleBody = {
  title: string;
  publisher: string | null;
  body: string;
  author: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  canonicalUrl: string;
};

export type BodyExtractionSuccess = {
  status: 'success';
  data: ExtractedArticleBody;
};

export type BodyExtractionFailure = {
  status: 'failure';
  errorCode:
    | 'STRUCTURE_CHANGED'
    | 'EMPTY_BODY'
    | 'INVALID_BODY'
    | 'ACCESS_DENIED'
    | 'PARSE_ERROR';
  message: string;
};

export type BodyExtractionResult =
  BodyExtractionSuccess | BodyExtractionFailure;

export interface BodyExtractor {
  readonly name: string;
  supports(url: string): boolean;
  extract(html: string, pageUrl: string): BodyExtractionResult;
}
