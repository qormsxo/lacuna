import { useEffect, useState } from 'react';
import {
  extractFactsFromSuccessfulArticles,
  fetchFacts,
  fetchNewsCategories,
  fetchVerifications,
} from '../api/lacuna';
import type { Fact, Verification } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; facts: Fact[] }
  | { kind: 'failed'; message: string };

export function FactsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [busy, setBusy] = useState(false);
  const [extractLimit, setExtractLimit] = useState(10);
  const [categories, setCategories] = useState<string[]>([]);
  const [extractCategory, setExtractCategory] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function reloadFacts() {
    const facts = await fetchFacts(50);
    setState({ kind: 'ready', facts });
    if (facts[0]) {
      setSelectedId(facts[0].id);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [facts, categoryList] = await Promise.all([
          fetchFacts(50),
          fetchNewsCategories(),
        ]);
        if (!cancelled) {
          setState({ kind: 'ready', facts });
          setCategories(categoryList);
          if (facts[0]) {
            setSelectedId(facts[0].id);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '사실 목록 로드 실패';
        if (!cancelled) {
          setState({ kind: 'failed', message });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const factId = selectedId;

    if (factId === null) {
      setVerifications([]);
      return;
    }

    let cancelled = false;

    async function loadVerifications(id: string) {
      try {
        const rows = await fetchVerifications(id);
        if (!cancelled) {
          setVerifications(rows);
        }
      } catch {
        if (!cancelled) {
          setVerifications([]);
        }
      }
    }

    void loadVerifications(factId);
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleExtract() {
    if (!Number.isInteger(extractLimit) || extractLimit <= 0) {
      setActionMessage('추출 개수는 1 이상의 정수여야 합니다.');
      return;
    }

    setBusy(true);
    setActionMessage(null);

    try {
      const category =
        extractCategory === 'all' ? undefined : extractCategory;
      const result = await extractFactsFromSuccessfulArticles(
        extractLimit,
        category,
      );
      await reloadFacts();
      setActionMessage(
        result.attempted === 0
          ? `아직 사실 추출 안 된 크롤 성공 기사가 없습니다${category ? ` (${category})` : ''}.`
          : `사실 추출(미추출만${category ? ` · ${category}` : ''}): 대상 ${result.attempted}건 / 성공 ${result.succeeded} / 실패 ${result.failed}`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '사실 추출 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  const selected =
    state.kind === 'ready'
      ? state.facts.find((fact) => fact.id === selectedId) ?? null
      : null;

  return (
    <section className="page">
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
            {['all', ...categories].map((category) => (
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
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExtract()}
          >
            미추출 기사에서 사실 추출
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
        <div className="split-view">
          <div className="panel">
            <h2>사실 목록</h2>
            {state.facts.length === 0 ? (
              <p className="meta">추출된 사실이 없습니다. 위에서 실행하세요.</p>
            ) : (
              <ul className="plain-list selectable">
                {state.facts.map((fact) => (
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
                      <span className="meta">
                        {fact.factType}
                        {fact.isClaim ? ' · claim' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h2>상세</h2>
            {selected === null ? (
              <p className="meta">사실을 선택하세요.</p>
            ) : (
              <>
                <p>{selected.normalizedStatement}</p>
                <p className="meta">근거: {selected.evidenceSentence}</p>
                <p className="meta">
                  엔티티: {selected.entities.join(', ') || '-'}
                </p>
                <p className="meta">
                  검토 상태: {selected.reviewStatus} ·{' '}
                  <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
                    원문
                  </a>
                </p>
                <h3>검증 / 관련 주장</h3>
                {verifications.length === 0 ? (
                  <p className="meta">
                    아직 검증 결과가 없습니다. 관계 페이지에서 분석을 실행하세요.
                  </p>
                ) : (
                  <ul className="plain-list">
                    {verifications.map((item) => (
                      <li key={item.id}>
                        <strong>{item.verificationStatus}</strong>
                        <p className="meta">{item.comparisonSummary}</p>
                        <p className="meta">
                          품질 {item.sourceQuality} · 독립성{' '}
                          {item.sourceIndependence}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
