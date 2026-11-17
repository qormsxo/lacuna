import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHypotheses } from '../api/lacuna';
import type { Hypothesis } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; hypotheses: Hypothesis[] }
  | { kind: 'failed'; message: string };

export function HypothesesPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const hypotheses = await fetchHypotheses(50);
        if (!cancelled) {
          setState({ kind: 'ready', hypotheses });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '가설 목록 로드 실패';
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

  return (
    <section className="page">
      <h1>가설 탐색</h1>
      <p className="lede">사실 연결로 생성된 가설 목록입니다.</p>

      {state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {state.kind === 'failed' ? (
        <p className="error-text">{state.message}</p>
      ) : null}

      {state.kind === 'ready' ? (
        <div className="card-stack">
          {state.hypotheses.length === 0 ? (
            <p className="meta">생성된 가설이 없습니다.</p>
          ) : (
            state.hypotheses.map((item) => (
              <article key={item.id} className="panel">
                <h2>
                  <Link to={`/hypotheses/${item.id}`}>{item.title}</Link>
                </h2>
                <p>{item.coreClaim}</p>
                <p className="meta">
                  상태 {item.status} · 생성 {item.generatedAt}
                  {item.lastReevaluatedAt
                    ? ` · 재평가 ${item.lastReevaluatedAt}`
                    : ''}
                </p>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
