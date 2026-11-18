import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisRunResult } from '../api/lacuna';
import { fetchRelationsPage, startAnalysis } from '../api/lacuna';
import type { RelationFactSummary } from '../api/types';
import { FactGraph } from '../components/graph/FactGraph';
import { Pager } from '../components/common/Pager';
import { LabelBadge, StatusBadge } from '../components/common/StatusBadge';
import { TaskProgress } from '../components/common/TaskProgress';
import { useAsync } from '../hooks/useAsync';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { formatDateTimeOr } from '../lib/format';
import * as labels from '../lib/labels';

const PAGE_SIZE = 30;
const GRAPH_SIZE = 100;

type ViewMode = 'list' | 'graph';

function FactSide(props: { fact: RelationFactSummary | null | undefined; fallbackId: string }) {
  const { fact, fallbackId } = props;

  if (fact === null || fact === undefined) {
    return <p className="meta">사실 {fallbackId.slice(0, 8)}… (삭제됨)</p>;
  }

  return (
    <div className="relation-fact">
      <p>{fact.statement}</p>
      <p className="meta">
        {fact.publisher ?? '언론사 미상'} ·{' '}
        <Link to={`/news/${fact.articleId}`}>
          {fact.articleTitle ?? '기사 보기'}
        </Link>
      </p>
    </div>
  );
}

export function RelationsPage() {
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [mode, setMode] = useState<ViewMode>('list');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const relations = useAsync(
    () =>
      fetchRelationsPage({
        limit: mode === 'graph' ? GRAPH_SIZE : PAGE_SIZE,
        offset: mode === 'graph' ? 0 : offset,
        relationType: typeFilter,
      }),
    [offset, typeFilter, mode],
    '관계 목록 로드 실패',
  );

  const analysisTask = useBackgroundTask<AnalysisRunResult>({
    onDone: async (result) => {
      await relations.reload();
      setActionMessage(
        result.run.reusedExisting
          ? `이전 분석 결과 재사용: 검증 ${result.run.verificationCount}건 / 관계 ${result.run.relationCount}건. 미사용 사실이 없으면 사실 추출을 먼저 하세요.`
          : `분석 완료(미사용 사실): 검증 ${result.run.verificationCount}건 / 관계 ${result.run.relationCount}건`,
      );
    },
  });

  return (
    <section className="page page-wide">
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
            disabled={analysisTask.view.running}
            onClick={() => {
              setActionMessage(null);
              void analysisTask.start(() => startAnalysis(false));
            }}
          >
            미사용 사실 관계·검증 분석
          </button>
        </div>
        <TaskProgress view={analysisTask.view} label="관계·검증 분석" />
        {actionMessage ? <p className="meta">{actionMessage}</p> : null}
      </div>

      <div className="panel filter-bar">
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'list'}
            className={mode === 'list' ? 'active' : ''}
            onClick={() => setMode('list')}
          >
            목록
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'graph'}
            className={mode === 'graph' ? 'active' : ''}
            onClick={() => setMode('graph')}
          >
            그래프
          </button>
        </div>
        <label className="inline-select">
          관계 유형
          <select
            value={typeFilter}
            onChange={(event) => {
              setOffset(0);
              setTypeFilter(event.target.value);
            }}
          >
            <option value="">전체</option>
            {labels.RELATION_TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {labels.relationType(value).label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {relations.state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {relations.state.kind === 'failed' ? (
        <p className="error-text">{relations.state.message}</p>
      ) : null}

      {relations.state.kind === 'ready' && mode === 'graph' ? (
        <>
          {relations.state.data.total > GRAPH_SIZE ? (
            <p className="meta">
              최근 {GRAPH_SIZE}개 관계만 그립니다 (전체 {relations.state.data.total}개).
            </p>
          ) : null}
          <FactGraph relations={relations.state.data.items} />
        </>
      ) : null}

      {relations.state.kind === 'ready' && mode === 'list' ? (
        <div className="card-stack">
          {relations.state.data.items.length === 0 ? (
            <p className="meta">
              저장된 관계가 없습니다. 위에서 분석을 실행하세요.
            </p>
          ) : (
            relations.state.data.items.map((relation) => (
              <article key={relation.id} className="panel relation-card">
                <header className="relation-head">
                  <LabelBadge entry={labels.relationType(relation.relationType)} />
                  <LabelBadge
                    entry={labels.uncertainty(relation.uncertainty)}
                    title="불확실성"
                  />
                  {relation.isDirectlyConfirmed ? (
                    <StatusBadge label="직접 확인" tone="ok" />
                  ) : null}
                  {relation.isInferred ? (
                    <StatusBadge label="추론 포함" tone="pending" />
                  ) : null}
                  <span className="meta">
                    {formatDateTimeOr(relation.analyzedAt)}
                  </span>
                </header>
                <div className="relation-pair">
                  <FactSide fact={relation.factA} fallbackId={relation.factIdA} />
                  <span className="relation-arrow" aria-hidden="true">
                    ↔
                  </span>
                  <FactSide fact={relation.factB} fallbackId={relation.factIdB} />
                </div>
                <p>{relation.description}</p>
                <p className="meta">근거: {relation.rationale}</p>
                {relation.alternativeExplanations ? (
                  <p className="meta">
                    대안 설명: {relation.alternativeExplanations}
                  </p>
                ) : null}
              </article>
            ))
          )}
          <Pager
            offset={offset}
            limit={PAGE_SIZE}
            total={relations.state.data.total}
            onChange={setOffset}
          />
        </div>
      ) : null}
    </section>
  );
}
