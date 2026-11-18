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

루트 `.env`와 `backend/.env`에 로컬 DB 정보를 맞춥니다. 전체 목록과 설명은 `.env.example`에 있습니다.

프론트엔드는 `frontend/.env`에 `VITE_API_BASE_URL`만 있으면 됩니다. 백엔드에 `API_KEY`를 설정했다면 `VITE_API_KEY`에 같은 값을 넣습니다.

### DB 스키마 (synchronize vs 마이그레이션)

- 로컬 개발: `TYPEORM_SYNCHRONIZE=true`면 서버 시작 시 엔티티에 맞춰 테이블을 자동으로 맞춥니다.
- 운영·공유 DB: `TYPEORM_SYNCHRONIZE=false`로 두고 마이그레이션을 씁니다.
  - 빈 DB: `npm --prefix backend run migration:run` (또는 `TYPEORM_MIGRATIONS_RUN=true`)
  - synchronize로 이미 만든 DB: `npm --prefix backend run migration:baseline`을 한 번 실행해 초기 마이그레이션을 "적용됨"으로 기록
  - 엔티티 변경 후: `npm --prefix backend run migration:generate`

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

e2e 테스트는 PostgreSQL이 실행 중이어야 합니다. 읽기 전용 요청만 보내고, `STALE_RECOVERY_ON_BOOT=false`로 부팅해 개발 서버의 진행 중 작업을 건드리지 않습니다.

```bash
cd backend
npm run test:e2e
```

## 현재 제공 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | API + DB 연결 상태 |
| GET | `/api/v1/news/categories` | 지원 뉴스 카테고리 목록 |
| POST | `/api/v1/news/collect?category=정치&sources=google,naver,daum` | 카테고리별 뉴스 목록 수집 후 DB 저장 (이전엔 GET) |
| POST | `/api/v1/news/crawl/run?limit=5&background=true` | 대기/재시도 기사 본문 크롤링 배치 실행 |
| GET | `/api/v1/news/articles?category=정치&from=&to=&crawlStatus=&limit=20` | 기사 목록(카테고리/기간/상태) |
| GET | `/api/v1/news/articles/:id` | 기사 상세(본문/메타/상태) |
| GET | `/api/v1/news/crawl/status` | 크롤링 상태 집계 |
| GET | `/api/v1/news/jobs/status` | 수집 작업/스케줄러 상태 |
| GET | `/api/v1/news/jobs?limit=20` | 최근 수집·크롤 작업 이력 |
| POST | `/api/v1/facts/extract/pending?limit=10&category=&background=true` | 미추출 크롤 성공 기사에서 사실 추출 |
| POST | `/api/v1/facts/extract/:articleId?force=false` | 기사 본문에서 사실/주장 추출 |
| GET | `/api/v1/facts/article/:articleId` | 기사별 추출 사실 목록 |
| GET | `/api/v1/facts/:id` | 사실 상세(근거 문장·출처 URL) |
| POST | `/api/v1/analysis/run?factIds=&force=false&background=true` | 사실 출처 검증 + 관계 분석 |
| GET | `/api/v1/analysis/runs/:id` | 분석 실행 결과 |
| GET | `/api/v1/analysis/verifications?factId=` | 사실별 검증 상태 |
| GET | `/api/v1/analysis/verifications/:id` | 검증 상세 |
| GET | `/api/v1/analysis/relations?factId=&limit=&offset=&relationType=` | 관계 목록(양쪽 사실 문장·원문 기사 포함, `total`) |
| GET | `/api/v1/analysis/relations/:id` | 관계 상세 |
| POST | `/api/v1/hypotheses/generate?factIds=&force=false&background=true` | 사실 연결 기반 새 가설 생성 |
| GET | `/api/v1/hypotheses?limit=20&offset=0&status=` | 가설 목록 (`total`) |
| GET | `/api/v1/hypotheses/:id` | 가설 상세(관련 사실·기사·반증·상태 이력) |
| POST | `/api/v1/hypotheses/reevaluate/:articleId` | 새 기사 사실로 기존 가설 재평가 |
| GET | `/api/v1/hypotheses/reevaluations` | 최근 재평가 이력 |
| GET | `/api/v1/dashboard/summary` | 대시보드 집계 |
| GET | `/api/v1/facts?limit=&offset=&reviewStatus=&q=` | 추출 사실 목록 (`total`) |
| POST | `/api/v1/pipeline/run` | 추출→관계·검증→가설→재평가를 백그라운드로 한 번 실행 |
| GET | `/api/v1/pipeline/status` | 자동 실행 설정·최근 파이프라인 실행 |
| GET | `/api/v1/tasks`, `/api/v1/tasks/:id` | 백그라운드 작업 상태·결과 |

`background=true`를 붙이면 바로 `{ taskId }`를 돌려주고, 결과는 `/tasks/:id`로 폴링합니다. 작업 상태는 서버 메모리에만 있어서 재시작하면 사라지며, 그때 DB에 남은 `running` 기록은 시작 시 자동으로 `failed`(중단됨)로 정리됩니다.

`API_KEY`를 설정하면 `/health`를 뺀 모든 요청에 `x-api-key` 헤더가 필요합니다.

### 프론트엔드

- `/` 대시보드
- `/news` 뉴스 목록, `/news/:id` 기사 상세(본문·추출 사실·이 기사로 추출/재평가)
- `/facts` 사실 탐색(검색·승인/검토 필터·페이지, 검증·연결 관계)
- `/relations` 관계 탐색(목록 / 그래프 보기, 유형 필터)
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
- LLM 호출은 429·5xx·타임아웃·빈 응답일 때 지수 백오프로 재시도합니다 (`LLM_MAX_RETRIES`, `Retry-After` 우선)
- `PIPELINE_AUTO_ENABLED=true`면 `PIPELINE_CRON`마다 추출→관계·검증→가설→재평가를 자동 실행합니다. 대시보드의 「파이프라인 실행」으로 수동 실행도 됩니다
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
- 단위 테스트 59개, e2e 6개 통과
- 수집(Naver) → 본문 크롤 → 사실 추출(Gemini) → 검증/관계 → 가설 생성 → 관련 기사 재평가 → 대시보드/프론트 API
- 프론트 프로덕션 빌드 성공, `http://127.0.0.1:5173` 응답 확인

남은 제한:
- 백그라운드 작업 상태는 메모리에만 있어 서버 여러 대로 늘리면 공유되지 않음(그때는 `STALE_RECOVERY_ON_BOOT=false` + 작업 큐 필요)
- Google/Daum 장애·출처 충돌·잘못된 LLM JSON은 코드/단위 테스트로 방어하지만, 이번 실검증에서 모든 소스를 동시에 깨뜨려 보진 않음
- 엔티티 겹침이 없는 새 기사는 재평가 후보 0건이 될 수 있음(의도된 동작)

