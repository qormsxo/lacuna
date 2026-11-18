import { useEffect, useState } from 'react';
import {
  collectNews,
  crawlPendingArticles,
  deleteArticles,
  fetchArticles,
  fetchNewsCategories,
  retryCollectFailures,
} from '../api/lacuna';
import type { Article } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

type LoadState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      articles: Article[];
      total: number;
    }
  | { kind: 'failed'; message: string };

const SOURCES = ['naver', 'daum', 'google'] as const;

const CRAWL_STATUS_LABEL: Record<string, string> = {
  pending: '대기 (본문 미크롤)',
  crawling: '크롤 중',
  success: '성공',
  failed: '실패',
  retry_waiting: '재시도 대기',
  inaccessible: '접근 불가',
};

const LIST_CRAWL_STATUSES = [
  'all',
  'pending',
  'success',
  'failed',
  'retry_waiting',
  'inaccessible',
  'crawling',
] as const;

function crawlTone(status: string): 'ok' | 'error' | 'pending' {
  if (status === 'success') {
    return 'ok';
  }
  if (status === 'failed' || status === 'inaccessible') {
    return 'error';
  }
  return 'pending';
}

const TITLE_MAX_LENGTH = 28;

function truncateTitle(title: string): string {
  if (title.length <= TITLE_MAX_LENGTH) {
    return title;
  }
  return `${title.slice(0, TITLE_MAX_LENGTH).trimEnd()}...`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateTime(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function articleDateTime(article: Article): string {
  return (
    formatDateTime(article.publishedAt) ??
    formatDateTime(article.collectedAt) ??
    '-'
  );
}

function buildPageWindow(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(current - 2, total - 6));
  const end = Math.min(total, start + 6);
  const pages: number[] = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

export function NewsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageJump, setPageJump] = useState('1');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    'naver',
    'daum',
    'google',
  ]);
  const [listSource, setListSource] = useState<string>('all');
  const [listCategory, setListCategory] = useState<string>('all');
  const [listCrawlStatus, setListCrawlStatus] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [listQuery, setListQuery] = useState('');
  const [crawlLimit, setCrawlLimit] = useState(20);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadPage(
    nextPage: number,
    options?: {
      source?: string;
      category?: string;
      crawlStatus?: string;
      q?: string;
      size?: number;
    },
  ) {
    const sourceFilter = options?.source ?? listSource;
    const categoryFilter = options?.category ?? listCategory;
    const crawlStatusFilter = options?.crawlStatus ?? listCrawlStatus;
    const queryFilter = options?.q ?? listQuery;
    const size = options?.size ?? pageSize;
    const offset = (nextPage - 1) * size;

    const result = await fetchArticles(size, offset, {
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      crawlStatus: crawlStatusFilter === 'all' ? undefined : crawlStatusFilter,
      q: queryFilter.trim().length > 0 ? queryFilter.trim() : undefined,
    });

    setPage(nextPage);
    setPageJump(String(nextPage));
    setSelectedArticleIds([]);
    setState({
      kind: 'ready',
      articles: result.articles,
      total: result.total,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [articlesPage, categoryList] = await Promise.all([
          fetchArticles(pageSize, 0),
          fetchNewsCategories(),
        ]);
        if (!cancelled) {
          setPage(1);
          setPageJump('1');
          setState({
            kind: 'ready',
            articles: articlesPage.articles,
            total: articlesPage.total,
          });
          setCategories(categoryList);
          setSelectedCategories([]);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '기사 목록 로드 실패';
        if (!cancelled) {
          setState({ kind: 'failed', message });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  }

  function toggleSource(source: string) {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        return prev.filter((item) => item !== source);
      }
      return [...prev, source];
    });
  }

  async function handleCollect() {
    if (selectedCategories.length === 0 || selectedSources.length === 0) {
      setActionMessage('카테고리와 소스를 하나 이상 선택하세요.');
      return;
    }

    setBusy(true);
    setActionMessage(null);

    try {
      let created = 0;
      let failed = 0;
      let filteredOut = 0;

      for (const category of selectedCategories) {
        const result = await collectNews(category, selectedSources);
        created += result.summary.createdCount;
        failed += result.summary.failureCount;
        filteredOut += result.summary.filteredOutCount ?? 0;
      }

      await loadPage(1);
      setActionMessage(
        `수집 완료: 신규 ${created}건, 제목필터 제외 ${filteredOut}건, 소스 실패 ${failed}건. pending은 본문 크롤 대기 상태입니다.`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '수집 요청 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCrawl() {
    if (selectedCategories.length === 0) {
      setActionMessage('크롤할 카테고리를 하나 이상 선택하세요.');
      return;
    }

    if (selectedSources.length === 0) {
      setActionMessage('크롤할 수집처를 하나 이상 선택하세요.');
      return;
    }

    if (!Number.isInteger(crawlLimit) || crawlLimit <= 0) {
      setActionMessage('크롤 개수는 1 이상의 정수여야 합니다.');
      return;
    }

    setBusy(true);
    setActionMessage(null);

    try {
      let remaining = crawlLimit;
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let retryWaiting = 0;
      const sourceOrder = ['naver', 'daum', 'google'];

      for (const category of selectedCategories) {
        for (const source of sourceOrder) {
          if (!selectedSources.includes(source) || remaining <= 0) {
            continue;
          }

          const result = await crawlPendingArticles(
            remaining,
            source,
            category,
          );
          processed += result.processed;
          succeeded += result.succeeded;
          failed += result.failed;
          retryWaiting += result.retryWaiting;
          remaining -= result.processed;
        }
      }

      await loadPage(page);
      setActionMessage(
        processed === 0
          ? `본문 크롤(${selectedCategories.join(', ')} / ${selectedSources.join(', ')}): 대상 0건.`
          : `본문 크롤(${selectedCategories.join(', ')}): 요청 ${crawlLimit} · 처리 ${processed} / 성공 ${succeeded} / 실패 ${failed} / 재시도대기 ${retryWaiting}`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '크롤 요청 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryCollect() {
    setBusy(true);
    setActionMessage(null);

    try {
      const result = await retryCollectFailures(10);
      await loadPage(1);
      setActionMessage(`수집 실패 재시도: ${result.attempted}건 실행`);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '재시도 요청 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  function applySearch() {
    const nextQuery = searchInput.trim();
    setListQuery(nextQuery);
    void loadPage(1, { q: nextQuery });
  }

  function toggleArticleSelection(articleId: string) {
    setSelectedArticleIds((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId],
    );
  }

  function toggleSelectPage() {
    if (state.kind !== 'ready') {
      return;
    }

    const pageIds = state.articles.map((article) => article.id);
    const allSelected =
      pageIds.length > 0 &&
      pageIds.every((id) => selectedArticleIds.includes(id));

    if (allSelected) {
      setSelectedArticleIds((current) =>
        current.filter((id) => !pageIds.includes(id)),
      );
      return;
    }

    setSelectedArticleIds((current) => [
      ...current,
      ...pageIds.filter((id) => !current.includes(id)),
    ]);
  }

  async function handleDeleteSelected() {
    if (selectedArticleIds.length === 0) {
      setActionMessage('삭제할 기사를 선택하세요.');
      return;
    }

    const confirmed = window.confirm(
      `선택한 ${selectedArticleIds.length}건을 삭제할까요?\n크롤 성공 기사와 연결된 사실·가설도 함께 삭제됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setActionMessage(null);

    try {
      const result = await deleteArticles(selectedArticleIds);
      await loadPage(page);
      setActionMessage(
        `기사 삭제: ${result.deletedArticleCount}건 (사실 ${result.deletedFactCount} / 가설 ${result.deletedHypothesisCount})`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '기사 삭제 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  const totalPages =
    state.kind === 'ready'
      ? Math.max(1, Math.ceil(state.total / pageSize))
      : 1;

  const pageWindow = buildPageWindow(page, totalPages);

  const pageAllSelected =
    state.kind === 'ready' &&
    state.articles.length > 0 &&
    state.articles.every((article) =>
      selectedArticleIds.includes(article.id),
    );

  return (
    <section className="page">
      <h1>뉴스 목록</h1>
      <p className="lede">
        카테고리를 골라 수집한 뒤, pending 기사는 본문 크롤로 가져옵니다.
        pending은 실패가 아니라 대기입니다.
      </p>

      <div className="panel collect-panel">
        <h2>수집·크롤 실행</h2>
        <div className="choice-group">
          <span className="choice-label">카테고리 (수집·크롤 공통)</span>
          <div className="choice-row">
            {categories.map((category) => (
              <label key={category} className="choice-chip">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>
        <div className="choice-group">
          <span className="choice-label">소스</span>
          <div className="choice-row">
            {SOURCES.map((source) => (
              <label key={source} className="choice-chip">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => toggleSource(source)}
                />
                {source}
              </label>
            ))}
          </div>
        </div>
        <div className="choice-group">
          <span className="choice-label">크롤 개수</span>
          <div className="choice-row">
            <input
              className="limit-input"
              type="number"
              min={1}
              max={5000}
              step={1}
              value={crawlLimit}
              disabled={busy}
              onChange={(event) => {
                const next = Number(event.target.value);
                setCrawlLimit(Number.isFinite(next) ? next : 0);
              }}
            />
            <span className="meta">
              선택한 카테고리만 크롤. 후보보다 크면 그 범위 전체.
            </span>
          </div>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={() => void handleCollect()}>
            선택 카테고리 수집
          </button>
          <button type="button" disabled={busy} onClick={() => void handleCrawl()}>
            선택 카테고리 본문 크롤
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRetryCollect()}
          >
            수집 실패 재시도
          </button>
        </div>
        {actionMessage ? <p className="meta">{actionMessage}</p> : null}
      </div>

      {state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {state.kind === 'failed' ? (
        <p className="error-text">{state.message}</p>
      ) : null}

      {state.kind === 'ready' ? (
        <>
          <div className="panel collect-panel">
            <h2>목록 필터</h2>
            <div className="choice-group">
              <span className="choice-label">검색 (제목·언론사)</span>
              <div className="choice-row">
                <input
                  className="search-input"
                  type="search"
                  value={searchInput}
                  disabled={busy}
                  placeholder="예: 금리, 삼성"
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      applySearch();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => applySearch()}
                >
                  검색
                </button>
                <button
                  type="button"
                  disabled={busy || (listQuery.length === 0 && searchInput.length === 0)}
                  onClick={() => {
                    setSearchInput('');
                    setListQuery('');
                    void loadPage(1, { q: '' });
                  }}
                >
                  검색 초기화
                </button>
              </div>
            </div>
            <div className="choice-group">
              <span className="choice-label">수집처</span>
              <div className="choice-row">
                {['all', ...SOURCES].map((source) => (
                  <label key={source} className="choice-chip">
                    <input
                      type="radio"
                      name="list-source"
                      checked={listSource === source}
                      onChange={() => {
                        setListSource(source);
                        void loadPage(1, { source });
                      }}
                    />
                    {source === 'all' ? '전체' : source}
                  </label>
                ))}
              </div>
            </div>
            <div className="choice-group">
              <span className="choice-label">카테고리</span>
              <div className="choice-row">
                {['all', ...categories].map((category) => (
                  <label key={category} className="choice-chip">
                    <input
                      type="radio"
                      name="list-category"
                      checked={listCategory === category}
                      onChange={() => {
                        setListCategory(category);
                        void loadPage(1, { category });
                      }}
                    />
                    {category === 'all' ? '전체' : category}
                  </label>
                ))}
              </div>
            </div>
            <div className="choice-group">
              <span className="choice-label">크롤 상태</span>
              <div className="choice-row">
                {LIST_CRAWL_STATUSES.map((status) => (
                  <label key={status} className="choice-chip">
                    <input
                      type="radio"
                      name="list-crawl-status"
                      checked={listCrawlStatus === status}
                      onChange={() => {
                        setListCrawlStatus(status);
                        void loadPage(1, { crawlStatus: status });
                      }}
                    />
                    {status === 'all'
                      ? '전체'
                      : (CRAWL_STATUS_LABEL[status] ?? status)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pager">
            <div className="choice-group">
              <p className="meta">
                필터 결과 {state.total}건 · {page}/{totalPages}페이지 · 페이지당{' '}
                {pageSize}건
              </p>
              <div className="choice-row">
                <span className="choice-label">페이지 크기</span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <label key={size} className="choice-chip">
                    <input
                      type="radio"
                      name="page-size"
                      checked={pageSize === size}
                      onChange={() => {
                        setPageSize(size);
                        void loadPage(1, { size });
                      }}
                    />
                    {size}
                  </label>
                ))}
              </div>
            </div>
            <div className="action-row pager-controls">
              <button
                type="button"
                disabled={busy || selectedArticleIds.length === 0}
                onClick={() => void handleDeleteSelected()}
              >
                선택 삭제 ({selectedArticleIds.length})
              </button>
              <button
                type="button"
                disabled={busy || page <= 1}
                onClick={() => void loadPage(page - 1)}
              >
                이전
              </button>
              {pageWindow.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={
                    pageNumber === page ? 'page-btn page-btn-active' : 'page-btn'
                  }
                  disabled={busy || pageNumber === page}
                  onClick={() => void loadPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                disabled={busy || page >= totalPages}
                onClick={() => void loadPage(page + 1)}
              >
                다음
              </button>
              <input
                className="limit-input"
                type="number"
                min={1}
                max={totalPages}
                value={pageJump}
                disabled={busy}
                aria-label="페이지 이동"
                onChange={(event) => setPageJump(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return;
                  }
                  const next = Number(pageJump);
                  if (!Number.isInteger(next) || next < 1 || next > totalPages) {
                    setActionMessage(
                      `페이지는 1~${totalPages} 사이 정수여야 합니다.`,
                    );
                    return;
                  }
                  void loadPage(next);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const next = Number(pageJump);
                  if (!Number.isInteger(next) || next < 1 || next > totalPages) {
                    setActionMessage(
                      `페이지는 1~${totalPages} 사이 정수여야 합니다.`,
                    );
                    return;
                  }
                  void loadPage(next);
                }}
              >
                이동
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="select-cell">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      disabled={busy || state.articles.length === 0}
                      onChange={toggleSelectPage}
                      aria-label="현재 페이지 전체 선택"
                    />
                  </th>
                  <th>제목</th>
                  <th>수집처</th>
                  <th>언론사</th>
                  <th>카테고리</th>
                  <th>수집시각</th>
                  <th>크롤 상태</th>
                  <th>원문</th>
                </tr>
              </thead>
              <tbody>
                {state.articles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="meta">
                      필터 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  state.articles.map((article) => (
                    <tr
                      key={article.id}
                      className={
                        selectedArticleIds.includes(article.id)
                          ? 'row-selected'
                          : undefined
                      }
                    >
                      <td className="select-cell">
                        <input
                          type="checkbox"
                          checked={selectedArticleIds.includes(article.id)}
                          disabled={busy}
                          onChange={() => toggleArticleSelection(article.id)}
                          aria-label={`${article.title} 선택`}
                        />
                      </td>
                      <td className="title-cell" title={article.title}>
                        {truncateTitle(article.title)}
                      </td>
                      <td className="nowrap-cell">
                        <StatusBadge
                          label={article.source}
                          tone={
                            article.source === 'google' ? 'pending' : 'ok'
                          }
                        />
                      </td>
                      <td className="nowrap-cell">
                        {article.publisher ?? '-'}
                      </td>
                      <td className="nowrap-cell">{article.category}</td>
                      <td className="meta nowrap-cell datetime-cell">
                        {articleDateTime(article)}
                      </td>
                      <td>
                        <StatusBadge
                          label={
                            CRAWL_STATUS_LABEL[article.crawlStatus] ??
                            article.crawlStatus
                          }
                          tone={crawlTone(article.crawlStatus)}
                        />
                      </td>
                      <td>
                        <a href={article.url} target="_blank" rel="noreferrer">
                          열기
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
