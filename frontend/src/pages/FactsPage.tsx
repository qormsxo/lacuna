import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExtractPendingResult } from '../api/lacuna';
import {
  fetchFactsPage,
  fetchNewsCategories,
  fetchRelationsByFact,
  fetchVerifications,
  startExtractPending,
} from '../api/lacuna';
import { LabelBadge, StatusBadge } from '../components/common/StatusBadge';
import { Pager } from '../components/common/Pager';
import { TaskProgress } from '../components/common/TaskProgress';
import { useAsync } from '../hooks/useAsync';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { formatDateTimeOr } from '../lib/format';
import * as labels from '../lib/labels';

const PAGE_SIZE = 30;

export function FactsPage() {
  const [offset, setOffset] = useState(0);
  const [reviewFilter, setReviewFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extractLimit, setExtractLimit] = useState(10);
  const [extractCategory, setExtractCategory] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const categories = useAsync(() => fetchNewsCategories(), []);
  const facts = useAsync(
    () =>
      fetchFactsPage({
        limit: PAGE_SIZE,
        offset,
        reviewStatus: reviewFilter,
        q: query,
      }),
    [offset, reviewFilter, query],
    '사실 목록 로드 실패',
  );
  const detail = useAsync(
    async () =>
      selectedId === null
        ? null
        : {
            verifications: await fetchVerifications(selectedId),
            relations: await fetchRelationsByFact(selectedId),
          },
    [selectedId],
  );

  const extractTask = useBackgroundTask<ExtractPendingResult>({
    onDone: async (result) => {
      await facts.reload();
      const scope = extractCategory === 'all' ? '' : ` · ${extractCategory}`;
      setActionMessage(
        result.attempted === 0
          ? `아직 사실 추출 안 된 크롤 성공 기사가 없습니다${scope}.`
          : `사실 추출 완료${scope}: 대상 ${result.attempted}건 / 성공 ${result.extracted} / 실패 ${result.failed}`,
      );
    },
  });
  const busy = extractTask.view.running;

  function handleExtract() {
    if (!Number.isInteger(extractLimit) || extractLimit <= 0) {
      setActionMessage('추출 개수는 1 이상의 정수여야 합니다.');
      return;
    }

    setActionMessage(null);
    const category = extractCategory === 'all' ? undefined : extractCategory;
    void extractTask.start(() => startExtractPending(extractLimit, category));
  }

  const rows = facts.state.kind === 'ready' ? facts.state.data.items : [];
  const selected = rows.find((fact) => fact.id === selectedId) ?? null;
  const categoryList =
    categories.state.kind === 'ready' ? categories.state.data : [];

  return (
    <section className="page page-wide">
      <h1>사실 탐색</h1>
      <p className="lede">
        크롤 성공 기사 본문에서 Gemini로 사실을 추출하고, 결과와 검증 상태를
        확인합니다.
      </p>

      <div className="panel collect-panel">
        <h2>사실 추출 실행</h2>
        <p className="meta">
          아직 사실 추출이 없는 크롤 성공 기사만 골라 Gemini를 호출합니다.
          카테고리를 고르면 그 분류만 대상입니다.
        </p>
        <div className="choice-group">
          <span className="choice-label">추출 카테고리</span>
          <div className="choice-row">
            {['all', ...categoryList].map((category) => (
              <label key={category} className="choice-chip">
                <input
                  type="radio"
                  name="extract-category"
                  checked={extractCategory === category}
                  disabled={busy}
                  onChange={() => setExtractCategory(category)}
                />
                {category === 'all' ? '전체' : category}
              </label>
            ))}
          </div>
        </div>
        <div className="choice-group">
          <span className="choice-label">추출 개수</span>
          <div className="choice-row">
            <input
              className="limit-input"
              type="number"
              min={1}
              max={100}
              step={1}
              value={extractLimit}
              disabled={busy}
              onChange={(event) => {
                const next = Number(event.target.value);
                setExtractLimit(Number.isFinite(next) ? next : 0);
              }}
            />
            <span className="meta">이미 추출한 기사는 건너뜀</span>
          </div>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={handleExtract}>
            미추출 기사에서 사실 추출
          </button>
        </div>
        <TaskProgress view={extractTask.view} label="사실 추출" />
        {actionMessage ? <p className="meta">{actionMessage}</p> : null}
      </div>

      <div className="panel filter-bar">
        <form
          className="choice-row"
          onSubmit={(event) => {
            event.preventDefault();
            setOffset(0);
            setQuery(searchInput.trim());
          }}
        >
          <input
            className="search-input"
            type="search"
            placeholder="사실 문장 검색"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="page-btn">
            검색
          </button>
        </form>
        <div className="choice-row">
          {[
            ['', '전체'],
            ['accepted', '승인'],
            ['needs_review', '검토 필요'],
          ].map(([value, label]) => (
            <label key={value} className="choice-chip">
              <input
                type="radio"
                name="review-filter"
                checked={reviewFilter === value}
                onChange={() => {
                  setOffset(0);
                  setReviewFilter(value);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {facts.state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {facts.state.kind === 'failed' ? (
        <p className="error-text">{facts.state.message}</p>
      ) : null}

      {facts.state.kind === 'ready' ? (
        <div className="split-view">
          <div className="panel">
            <h2>사실 목록</h2>
            {rows.length === 0 ? (
              <p className="meta">
                조건에 맞는 사실이 없습니다. 위에서 추출을 실행하세요.
              </p>
            ) : (
              <ul className="plain-list selectable">
                {rows.map((fact) => (
                  <li key={fact.id}>
                    <button
                      type="button"
                      className={
                        fact.id === selectedId
                          ? 'list-button active'
                          : 'list-button'
                      }
                      onClick={() => setSelectedId(fact.id)}
                    >
                      <span>{fact.normalizedStatement}</span>
                      <span className="badge-row">
                        <LabelBadge entry={labels.factType(fact.factType)} />
                        <LabelBadge
                          entry={labels.reviewStatus(fact.reviewStatus)}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Pager
              offset={offset}
              limit={PAGE_SIZE}
              total={facts.state.data.total}
              onChange={setOffset}
            />
          </div>

          <div className="panel sticky-panel">
            <h2>상세</h2>
            {selected === null ? (
              <p className="meta">왼쪽에서 사실을 선택하세요.</p>
            ) : (
              <>
                <p className="detail-prose">{selected.normalizedStatement}</p>
                <blockquote className="evidence">
                  {selected.evidenceSentence}
                </blockquote>
                <p className="badge-row">
                  <LabelBadge entry={labels.factType(selected.factType)} />
                  <LabelBadge
                    entry={labels.reviewStatus(selected.reviewStatus)}
                  />
                  {selected.isClaim ? (
                    <StatusBadge label="주장" tone="pending" />
                  ) : null}
                </p>
                <p className="meta">
                  엔티티: {selected.entities.join(', ') || '-'}
                </p>
                <p className="meta">
                  추출 {formatDateTimeOr(selected.extractedAt)} ·{' '}
                  <Link to={`/news/${selected.articleId}`}>기사 상세</Link> ·{' '}
                  <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
                    원문 ↗
                  </a>
                </p>

                <h3>검증</h3>
                {detail.state.kind === 'ready' &&
                detail.state.data !== null &&
                detail.state.data.verifications.length > 0 ? (
                  <ul className="plain-list">
                    {detail.state.data.verifications.map((item) => (
                      <li key={item.id} className="stacked">
                        <LabelBadge
                          entry={labels.verificationStatus(
                            item.verificationStatus,
                          )}
                        />
                        <p className="meta">{item.comparisonSummary}</p>
                        <p className="meta">
                          출처 품질{' '}
                          {labels.sourceQuality(item.sourceQuality).label} ·{' '}
                          {labels.sourceIndependence(item.sourceIndependence).label}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="meta">
                    {detail.state.kind === 'loading'
                      ? '불러오는 중…'
                      : '아직 검증 결과가 없습니다. 관계 페이지에서 분석을 실행하세요.'}
                  </p>
                )}

                <h3>연결된 관계</h3>
                {detail.state.kind === 'ready' &&
                detail.state.data !== null &&
                detail.state.data.relations.length > 0 ? (
                  <ul className="plain-list">
                    {detail.state.data.relations.map((relation) => {
                      const other =
                        relation.factIdA === selected.id
                          ? relation.factB
                          : relation.factA;
                      return (
                        <li key={relation.id} className="stacked">
                          <LabelBadge
                            entry={labels.relationType(relation.relationType)}
                          />
                          <p>{other?.statement ?? relation.description}</p>
                          <p className="meta">{relation.rationale}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="meta">
                    {detail.state.kind === 'loading'
                      ? '불러오는 중…'
                      : '연결된 관계가 없습니다.'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
