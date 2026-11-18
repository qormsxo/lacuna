import { useEffect, useState } from 'react';
import { fetchRelations, runAnalysis } from '../api/lacuna';
import type { Relation } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; relations: Relation[] }
  | { kind: 'failed'; message: string };

export function RelationsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function reloadRelations() {
    const relations = await fetchRelations(50);
    setState({ kind: 'ready', relations });
  }

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

  async function handleAnalyze() {
    setBusy(true);
    setActionMessage(null);

    try {
      const result = await runAnalysis(false);
      await reloadRelations();

      if (result.run.reusedExisting) {
        setActionMessage(
          `이전 분석 결과 재사용: 검증 ${result.run.verificationCount}건 / 관계 ${result.run.relationCount}건. 미사용 사실이 없으면 사실 추출을 먼저 하세요.`,
        );
        return;
      }

      setActionMessage(
        `분석 완료(미사용 사실): 검증 ${result.run.verificationCount}건 / 관계 ${result.run.relationCount}건 (상태 ${result.run.status})`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '관계·검증 분석 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <h1>관계 탐색</h1>
      <p className="lede">
        아직 분석에 안 쓴 승인 사실만 골라 검증·관계를 만듭니다. 사실 추출 후
        실행하세요.
      </p>

      <div className="panel collect-panel">
        <h2>관계·검증 분석 실행</h2>
        <p className="meta">
          이미 분석 완료된 사실은 건너뛰고, 남은 미사용 사실만 Gemini로
          돌립니다.
        </p>
        <div className="action-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAnalyze()}
          >
            미사용 사실 관계·검증 분석
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
        <div className="card-stack">
          {state.relations.length === 0 ? (
            <p className="meta">
              저장된 관계가 없습니다. 위에서 분석을 실행하세요.
            </p>
          ) : (
            state.relations.map((relation) => (
              <article key={relation.id} className="panel">
                <h2>{relation.relationType}</h2>
                <p>{relation.description}</p>
                <p className="meta">근거: {relation.rationale}</p>
                <p className="meta">
                  불확실성 {relation.uncertainty} ·{' '}
                  {relation.isDirectlyConfirmed ? '직접 확인' : '직접 확인 아님'}{' '}
                  · {relation.isInferred ? '추론 포함' : '추론 없음'}
                </p>
                <p className="meta">
                  {relation.factIdA.slice(0, 8)}… ↔{' '}
                  {relation.factIdB.slice(0, 8)}…
                </p>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
