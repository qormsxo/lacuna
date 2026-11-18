import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { HypothesisGenerationResult } from '../api/lacuna';
import { fetchHypothesesPage, startHypothesisGeneration } from '../api/lacuna';
import { Pager } from '../components/common/Pager';
import { LabelBadge, StatusBadge } from '../components/common/StatusBadge';
import { TaskProgress } from '../components/common/TaskProgress';
import { useAsync } from '../hooks/useAsync';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { formatDateTimeOr } from '../lib/format';
import * as labels from '../lib/labels';

const PAGE_SIZE = 20;

export function HypothesesPage() {
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const hypotheses = useAsync(
    () =>
      fetchHypothesesPage({
        limit: PAGE_SIZE,
        offset,
        status: statusFilter,
      }),
    [offset, statusFilter],
    '가설 목록 로드 실패',
  );

  const generateTask = useBackgroundTask<HypothesisGenerationResult>({
    onDone: async (result) => {
      await hypotheses.reload();
      setActionMessage(
        result.run.reusedExisting
          ? `이전 실행 결과 재사용: ${result.run.hypothesisCount}건 (스킵 ${result.run.skippedCount}건). 미사용 사실이 더 있으면 사실/관계 분석을 먼저 하세요.`
          : `가설 생성 완료: ${result.run.hypothesisCount}건, 필터 스킵 ${result.run.skippedCount}건`,
      );
    },
  });
  const busy = generateTask.view.running;

  function handleGenerate(force: boolean) {
    if (
      force &&
      !window.confirm(
        '같은 사실 묶음으로 가설을 다시 만듭니다. 이전 실행에서 만든 가설은 교체됩니다. 계속할까요?',
      )
    ) {
      return;
    }

    setActionMessage(null);
    void generateTask.start(() => startHypothesisGeneration(force));
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
            onClick={() => handleGenerate(false)}
          >
            미사용 사실로 가설 생성
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => handleGenerate(true)}
          >
            강제 재생성
          </button>
        </div>
        <TaskProgress view={generateTask.view} label="가설 생성" />
        {actionMessage ? <p className="meta">{actionMessage}</p> : null}
      </div>

      <div className="panel filter-bar">
        <label className="inline-select">
          상태
          <select
            value={statusFilter}
            onChange={(event) => {
              setOffset(0);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">전체</option>
            {labels.HYPOTHESIS_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {labels.hypothesisStatus(value).label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hypotheses.state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {hypotheses.state.kind === 'failed' ? (
        <p className="error-text">{hypotheses.state.message}</p>
      ) : null}

      {hypotheses.state.kind === 'ready' ? (
        <div className="card-stack">
          {hypotheses.state.data.items.length === 0 ? (
            <p className="meta">조건에 맞는 가설이 없습니다.</p>
          ) : (
            hypotheses.state.data.items.map((item) => (
              <article key={item.id} className="panel">
                <h2>
                  <Link to={`/hypotheses/${item.id}`}>{item.title}</Link>
                </h2>
                <p>{item.coreClaim}</p>
                <p className="badge-row">
                  <LabelBadge entry={labels.hypothesisStatus(item.status)} />
                  <span className="meta">
                    사실 {item.relatedFactIds.length}개 · 생성{' '}
                    {formatDateTimeOr(item.generatedAt)}
                    {item.lastReevaluatedAt
                      ? ` · 재평가 ${formatDateTimeOr(item.lastReevaluatedAt)}`
                      : ''}
                  </span>
                </p>
              </article>
            ))
          )}
          <Pager
            offset={offset}
            limit={PAGE_SIZE}
            total={hypotheses.state.data.total}
            onChange={setOffset}
          />
        </div>
      ) : null}
    </section>
  );
}
