// 백엔드 enum 값을 화면용 한글 라벨과 배지 색으로 바꾼다.
// 모르는 값이 와도 깨지지 않도록 원문을 그대로 돌려준다.

export type Tone = 'ok' | 'error' | 'pending' | 'neutral';

type LabelEntry = { label: string; tone: Tone };

function lookup(
  table: Record<string, LabelEntry>,
  value: string | null | undefined,
): LabelEntry {
  if (value === null || value === undefined || value.length === 0) {
    return { label: '-', tone: 'neutral' };
  }

  return table[value] ?? { label: value, tone: 'neutral' };
}

const CRAWL_STATUS = {
  pending: { label: '대기 (본문 미크롤)', tone: 'pending' },
  crawling: { label: '크롤 중', tone: 'pending' },
  success: { label: '성공', tone: 'ok' },
  failed: { label: '실패', tone: 'error' },
  retry_waiting: { label: '재시도 대기', tone: 'pending' },
  inaccessible: { label: '접근 불가', tone: 'error' },
} satisfies Record<string, LabelEntry>;

const HYPOTHESIS_STATUS = {
  exploring: { label: '탐색 중', tone: 'neutral' },
  gathering_evidence: { label: '증거 수집 중', tone: 'pending' },
  supporting_evidence_increasing: { label: '지지 증거 증가', tone: 'ok' },
  contradicting_evidence_increasing: { label: '반대 증거 증가', tone: 'error' },
  deferred: { label: '보류', tone: 'neutral' },
  support_weakening: { label: '지지 약화', tone: 'pending' },
  contradicted: { label: '반박됨', tone: 'error' },
} satisfies Record<string, LabelEntry>;

const VERIFICATION_STATUS = {
  confirmed: { label: '확인됨', tone: 'ok' },
  partially_confirmed: { label: '부분 확인', tone: 'ok' },
  single_source: { label: '단일 출처', tone: 'pending' },
  source_conflict: { label: '출처 충돌', tone: 'error' },
  unverified: { label: '미검증', tone: 'neutral' },
  contradicted: { label: '반박됨', tone: 'error' },
} satisfies Record<string, LabelEntry>;

const RELATION_TYPE = {
  same_organization: { label: '같은 조직', tone: 'neutral' },
  same_person: { label: '같은 인물', tone: 'neutral' },
  same_industry: { label: '같은 산업', tone: 'neutral' },
  supply_chain: { label: '공급망', tone: 'neutral' },
  competition: { label: '경쟁', tone: 'neutral' },
  investment_capacity_change: { label: '투자·설비 변화', tone: 'neutral' },
  policy_corporate_action: { label: '정책 → 기업 대응', tone: 'neutral' },
  demand_supply_change: { label: '수요·공급 변화', tone: 'neutral' },
  temporal_sequence: { label: '시간 순서', tone: 'neutral' },
  contradictory_claims: { label: '상충 주장', tone: 'error' },
} satisfies Record<string, LabelEntry>;

const FACT_TYPE = {
  verifiable_event: { label: '검증 가능 사건', tone: 'ok' },
  official_announcement: { label: '공식 발표', tone: 'ok' },
  reported_content: { label: '보도 내용', tone: 'neutral' },
  expert_opinion: { label: '전문가 의견', tone: 'pending' },
  forecast_prediction: { label: '전망·예측', tone: 'pending' },
  analyst_interpretation: { label: '분석가 해석', tone: 'pending' },
} satisfies Record<string, LabelEntry>;

const REVIEW_STATUS = {
  accepted: { label: '승인', tone: 'ok' },
  needs_review: { label: '검토 필요', tone: 'pending' },
} satisfies Record<string, LabelEntry>;

const UNCERTAINTY = {
  low: { label: '낮음', tone: 'ok' },
  medium: { label: '중간', tone: 'pending' },
  high: { label: '높음', tone: 'error' },
} satisfies Record<string, LabelEntry>;

const SOURCE_QUALITY = {
  high: { label: '높음', tone: 'ok' },
  medium: { label: '중간', tone: 'pending' },
  low: { label: '낮음', tone: 'error' },
  unknown: { label: '알 수 없음', tone: 'neutral' },
} satisfies Record<string, LabelEntry>;

const SOURCE_INDEPENDENCE = {
  independent: { label: '독립 출처', tone: 'ok' },
  republished_same_release: { label: '같은 보도자료 재배포', tone: 'pending' },
  unclear: { label: '불분명', tone: 'neutral' },
} satisfies Record<string, LabelEntry>;

const EVIDENCE_KIND = {
  supporting: { label: '지지 증거', tone: 'ok' },
  contradicting: { label: '반대 증거', tone: 'error' },
  repeat: { label: '반복 보도', tone: 'neutral' },
  unrelated: { label: '무관', tone: 'neutral' },
} satisfies Record<string, LabelEntry>;

const SOURCE = {
  naver: { label: '네이버', tone: 'neutral' },
  daum: { label: '다음', tone: 'neutral' },
  google: { label: '구글', tone: 'neutral' },
} satisfies Record<string, LabelEntry>;

const TASK_STATUS = {
  running: { label: '실행 중', tone: 'pending' },
  completed: { label: '완료', tone: 'ok' },
  failed: { label: '실패', tone: 'error' },
} satisfies Record<string, LabelEntry>;

export const crawlStatus = (v: string | null | undefined) => lookup(CRAWL_STATUS, v);

export const hypothesisStatus = (v: string | null | undefined) =>
  lookup(HYPOTHESIS_STATUS, v);

export const verificationStatus = (v: string | null | undefined) =>
  lookup(VERIFICATION_STATUS, v);

export const relationType = (v: string | null | undefined) => lookup(RELATION_TYPE, v);
export const factType = (v: string | null | undefined) => lookup(FACT_TYPE, v);
export const reviewStatus = (v: string | null | undefined) => lookup(REVIEW_STATUS, v);
export const uncertainty = (v: string | null | undefined) => lookup(UNCERTAINTY, v);
export const sourceQuality = (v: string | null | undefined) => lookup(SOURCE_QUALITY, v);

export const sourceIndependence = (v: string | null | undefined) =>
  lookup(SOURCE_INDEPENDENCE, v);

export const evidenceKind = (v: string | null | undefined) => lookup(EVIDENCE_KIND, v);
export const newsSource = (v: string | null | undefined) => lookup(SOURCE, v);
export const taskStatus = (v: string | null | undefined) => lookup(TASK_STATUS, v);

export const HYPOTHESIS_STATUS_OPTIONS = Object.keys(HYPOTHESIS_STATUS);
export const RELATION_TYPE_OPTIONS = Object.keys(RELATION_TYPE);
export const CRAWL_STATUS_OPTIONS = Object.keys(CRAWL_STATUS);
