import { useEffect, useState } from 'react';
import { fetchFacts, fetchVerifications } from '../api/lacuna';
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const facts = await fetchFacts(50);
        if (!cancelled) {
          setState({ kind: 'ready', facts });
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

  const selected =
    state.kind === 'ready'
      ? state.facts.find((fact) => fact.id === selectedId) ?? null
      : null;

  return (
    <section className="page">
      <h1>사실 탐색</h1>
      <p className="lede">추출된 사실, 원문 근거, 검증 상태를 확인합니다.</p>

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
            <ul className="plain-list selectable">
              {state.facts.map((fact) => (
                <li key={fact.id}>
                  <button
                    type="button"
                    className={
                      fact.id === selectedId ? 'list-button active' : 'list-button'
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
                  <p className="meta">아직 검증 결과가 없습니다.</p>
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
