import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHypotheses, generateHypotheses } from '../api/lacuna';
import type { Hypothesis } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; hypotheses: Hypothesis[] }
  | { kind: 'failed'; message: string };

export function HypothesesPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function reloadHypotheses() {
    const hypotheses = await fetchHypotheses(50);
    setState({ kind: 'ready', hypotheses });
  }

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

  async function handleGenerate(force: boolean) {
    setBusy(true);
    setActionMessage(null);

    try {
      const result = await generateHypotheses(force);
      await reloadHypotheses();

      if (result.run.reusedExisting) {
        setActionMessage(
          `이전 실행 결과 재사용: ${result.run.hypothesisCount}건 (스킵 ${result.run.skippedCount}건). 미사용 사실이 더 있으면 사실/관계 분석을 먼저 하세요.`,
        );
        return;
      }

      setActionMessage(
        `가설 생성(미사용 사실): ${result.run.hypothesisCount}건, 필터 스킵 ${result.run.skippedCount}건 (상태 ${result.run.status})`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : '가설 생성 실패',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <h1>가설 탐색</h1>
      <p className="lede">
        서로 다른 기사 사실들을 연결해 새 가설을 만듭니다. 사실 추출·관계 분석
        뒤에 실행하세요.
      </p>

      <div className="panel collect-panel">
        <h2>가설 생성 실행</h2>
        <p className="meta">
          가설 생성에 아직 안 쓴 승인 사실만 대상으로 Gemini를 호출합니다.
          같은 묶음을 다시 돌릴 때만 강제 재생성을 쓰세요.
        </p>
        <div className="action-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate(false)}
          >
            미사용 사실로 가설 생성
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate(true)}
          >
            강제 재생성
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
          {state.hypotheses.length === 0 ? (
            <p className="meta">생성된 가설이 없습니다. 위에서 실행하세요.</p>
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
