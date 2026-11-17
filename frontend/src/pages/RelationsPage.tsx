import { useEffect, useState } from 'react';
import { fetchRelations } from '../api/lacuna';
import type { Relation } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; relations: Relation[] }
  | { kind: 'failed'; message: string };

export function RelationsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const relations = await fetchRelations(50);
        if (!cancelled) {
          setState({ kind: 'ready', relations });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '관계 목록 로드 실패';
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
      <h1>관계 탐색</h1>
      <p className="lede">사실·사건 사이의 연결 유형과 근거, 불확실성입니다.</p>

      {state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {state.kind === 'failed' ? (
        <p className="error-text">{state.message}</p>
      ) : null}

      {state.kind === 'ready' ? (
        <div className="card-stack">
          {state.relations.length === 0 ? (
            <p className="meta">저장된 관계가 없습니다. 분석 실행 후 확인하세요.</p>
          ) : (
            state.relations.map((relation) => (
              <article key={relation.id} className="panel">
                <h2>{relation.relationType}</h2>
                <p>{relation.description}</p>
                <p className="meta">근거: {relation.rationale}</p>
                <p className="meta">
                  불확실성 {relation.uncertainty} ·{' '}
                  {relation.isDirectlyConfirmed ? '직접 확인' : '직접 확인 아님'} ·{' '}
                  {relation.isInferred ? '추론 포함' : '추론 없음'}
                </p>
                <p className="meta">
                  {relation.factIdA.slice(0, 8)}… ↔ {relation.factIdB.slice(0, 8)}…
                </p>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
