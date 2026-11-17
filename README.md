# Lacuna

여러 뉴스 기사에서 사실을 추출하고, 사실 간 관계를 분석해 새로운 가설을 생성하는 시스템입니다.

현재 단계는 **수집→추출→검증→관계→가설→재평가**와 **프론트엔드 대시보드**까지 포함합니다.

## 기술 스택

- Language: TypeScript
- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: React + Vite + TypeScript
- HTTP / Parsing: Axios, Cheerio, rss-parser
- Test: Jest
- API: REST + Swagger

## 저장소 구조

```text
lacuna/
├── backend/          NestJS API
├── frontend/         React + Vite app
├── docker-compose.yml
├── .env.example
└── README.md
```

## 사전 요구사항

- Node.js 20+
- npm
- 로컬 PostgreSQL (`lacuna` DB)

## 환경 변수

루트 `.env`와 `backend/.env`에 로컬 DB 정보를 맞춥니다. (`TYPEORM_SYNCHRONIZE=true`면 서버 시작 시 테이블 자동 생성)

프론트엔드는 `frontend/.env`에 `VITE_API_BASE_URL`만 있으면 됩니다.

## 실행 방법

### 1. PostgreSQL

로컬 PostgreSQL을 사용합니다. DB 이름 `lacuna`가 있어야 합니다.

Docker Postgres는 기본으로 쓰지 않습니다. 필요하면 `docker compose up -d`로 선택 실행할 수 있습니다.

### 2. Backend

```bash
cd backend
npm install
npm run start:dev
```

- API: http://localhost:3000/api/v1/health
- Swagger: http://localhost:3000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173

### 루트 스크립트

```bash
npm run dev:backend
npm run dev:frontend
npm run test:backend
```


## 테스트

```bash
cd backend
npm test
```

e2e 테스트는 PostgreSQL이 실행 중이어야 합니다.

```bash
cd backend
npm run test:e2e
```

## 현재 제공 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | API + DB 연결 상태 |
| GET | `/api/v1/news/categories` | 지원 뉴스 카테고리 목록 |
| GET | `/api/v1/news/collect?category=정치&sources=google,naver,daum` | 카테고리별 뉴스 목록 수집 후 DB 저장 |
| POST | `/api/v1/news/crawl/run?limit=5` | 대기/재시도 기사 본문 크롤링 배치 실행 |
| GET | `/api/v1/news/articles?category=정치&from=&to=&crawlStatus=&limit=20` | 기사 목록(카테고리/기간/상태) |
| GET | `/api/v1/news/articles/:id` | 기사 상세(본문/메타/상태) |
| GET | `/api/v1/news/crawl/status` | 크롤링 상태 집계 |
| GET | `/api/v1/news/jobs/status` | 수집 작업/스케줄러 상태 |
| GET | `/api/v1/news/jobs?limit=20` | 최근 수집·크롤 작업 이력 |
| POST | `/api/v1/facts/extract/:articleId?force=false` | 기사 본문에서 사실/주장 추출 |
| GET | `/api/v1/facts/article/:articleId` | 기사별 추출 사실 목록 |
| GET | `/api/v1/facts/:id` | 사실 상세(근거 문장·출처 URL) |
| POST | `/api/v1/analysis/run?factIds=&force=false` | 사실 출처 검증 + 관계 분석 |
| GET | `/api/v1/analysis/runs/:id` | 분석 실행 결과 |
| GET | `/api/v1/analysis/verifications?factId=` | 사실별 검증 상태 |
| GET | `/api/v1/analysis/verifications/:id` | 검증 상세 |
| GET | `/api/v1/analysis/relations?factId=` | 사실별 관계(근거·추론 여부) |
| GET | `/api/v1/analysis/relations/:id` | 관계 상세 |
| POST | `/api/v1/hypotheses/generate?factIds=&force=false` | 사실 연결 기반 새 가설 생성 |
| GET | `/api/v1/hypotheses?limit=20` | 가설 목록 |
| GET | `/api/v1/hypotheses/:id` | 가설 상세(관련 사실·기사·반증·상태 이력) |
| POST | `/api/v1/hypotheses/reevaluate/:articleId` | 새 기사 사실로 기존 가설 재평가 |
| GET | `/api/v1/hypotheses/reevaluations` | 최근 재평가 이력 |
| GET | `/api/v1/dashboard/summary` | 대시보드 집계 |
| GET | `/api/v1/facts` | 최근 추출 사실 목록 |

### 프론트엔드

- `/` 대시보드
- `/news` 뉴스 목록
- `/facts` 사실 탐색
- `/relations` 관계 탐색
- `/hypotheses`, `/hypotheses/:id` 가설 탐색/상세

### 뉴스 수집·크롤링 메모

- 소스: Google News RSS, Naver 목록/검색 HTML, Daum 섹션/검색 HTML
- 한 소스가 실패해도 다른 소스 수집은 계속됩니다
- URL 정규화 / articleKey / 동일 언론+제목 해시 / 본문 해시로 중복을 줄입니다
- 서로 다른 언론사의 동일 사건 기사는 별도 레코드로 유지합니다
- `NEWS_SCHEDULE_ENABLED=true`면 카테고리 수집·본문 크롤을 cron으로 돌립니다 (`NEWS_COLLECT_CRON`, `NEWS_CRAWL_CRON`)
- 동일 작업이 이미 실행 중이면 `crawl_histories`에 skipped로 남기고 중복 실행하지 않습니다
- `NEWS_STORE_FULL_BODY=false`면 본문 대신 길이·해시만 저장합니다
- 사실 추출은 Gemini(`gemini-3.1-flash-lite`) OpenAI 호환 엔드포인트를 사용합니다 (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`)
- 발표 사실과 전망/주장은 `factType`으로 분리 저장하며, 근거 문장이 본문에 없으면 제외 또는 `needs_review` 처리합니다
- 같은 기사·같은 본문 해시는 재추출하지 않습니다 (`force=true`로 강제 가능)
- 사실 검증 상태: confirmed / partially_confirmed / single_source / source_conflict / unverified / contradicted
- 동일 보도자료 재배포는 `republished_same_release`로 표시하며 독립 증거로 세지 않습니다
- 관계는 근거·직접확인/추론·불확실성을 저장하고, 약한 연결은 자동 제외합니다
- 가설은 서로 다른 기사 사실의 연결에서만 생성하며, 단일 기사 주장 재포장·근거 부족·확률 표기는 제외합니다
- 가설 상세에서 관련 사실, 원문 URL, 도출 과정, 반대 증거, 대안 설명, 불확실성, 상태 변경 이유를 확인할 수 있습니다
- 새 기사 재평가는 가설을 덮어쓰지 않고 상태 이력·증거 목록에 추가하며, 동일 기사·가설 쌍은 중복 재평가하지 않습니다

## 검증한 것 / 남은 제한

검증함:
- 단위 테스트 45개 통과
- 수집(Naver) → 본문 크롤 → 사실 추출(Gemini) → 검증/관계 → 가설 생성 → 관련 기사 재평가 → 대시보드/프론트 API
- 프론트 프로덕션 빌드 성공, `http://127.0.0.1:5173` 응답 확인

남은 제한:
- 스케줄 기반 자동 전체 파이프라인(수집 직후 자동 추출·재평가)은 API 수동 호출 중심
- Google/Daum 장애·출처 충돌·잘못된 LLM JSON은 코드/단위 테스트로 방어하지만, 이번 실검증에서 모든 소스를 동시에 깨뜨려 보진 않음
- 엔티티 겹침이 없는 새 기사는 재평가 후보 0건이 될 수 있음(의도된 동작)
- 프론트에서 수집/크롤/추출 실행 버튼은 없고 조회 중심

