import { collapseWhitespace, isBlank } from '../../utils/text';

const NOISE_PHRASES = [
  '댓글',
  '관련기사',
  '관련 뉴스',
  '추천 기사',
  '구독하기',
  '로그인',
  '회원가입',
  '광고',
  'copyright',
];

export type BodyValidationResult =
  { status: 'valid' } | { status: 'invalid'; reason: string };

export function validateArticleBody(
  body: string,
  title: string,
): BodyValidationResult {
  const normalizedBody = collapseWhitespace(body);
  const normalizedTitle = collapseWhitespace(title);

  if (isBlank(normalizedBody)) {
    return { status: 'invalid', reason: 'Body is empty' };
  }

  if (normalizedBody.length < 60) {
    return {
      status: 'invalid',
      reason: 'Body is too short to be a full article',
    };
  }

  if (normalizedBody === normalizedTitle) {
    return { status: 'invalid', reason: 'Body equals title only' };
  }

  let noiseHits = 0;

  for (const phrase of NOISE_PHRASES) {
    if (normalizedBody.toLowerCase().includes(phrase.toLowerCase())) {
      noiseHits += 1;
    }
  }

  if (noiseHits >= 3 && normalizedBody.length < 200) {
    return {
      status: 'invalid',
      reason: 'Body looks like navigation or chrome text',
    };
  }

  const sentenceMarks = (normalizedBody.match(/[.!?。]/gu) ?? []).length;
  const hasKorean = /[가-힣]/u.test(normalizedBody);

  if (!hasKorean && sentenceMarks === 0) {
    return {
      status: 'invalid',
      reason: 'Body lacks sentence structure',
    };
  }

  return { status: 'valid' };
}
