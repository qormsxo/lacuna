import { Link } from 'react-router-dom';
import {
  fetchDashboardSummary,
  fetchPipelineStatus,
  runPipeline,
} from '../api/lacuna';
import type { PipelineRunResult, PipelineStepResult } from '../api/types';
import { LabelBadge, StatusBadge } from '../components/common/StatusBadge';
import { TaskProgress } from '../components/common/TaskProgress';
import { useAsync } from '../hooks/useAsync';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { formatDateTimeOr } from '../lib/format';
import * as labels from '../lib/labels';

const STEP_LABEL: Record<PipelineStepResult['step'], string> = {
  extract: '사실 추출',
  analyze: '관계·검증',
  generate: '가설 생성',
  reevaluate: '재평가',
};

function PipelineSteps(props: { result: PipelineRunResult }) {
  return (
    <ol className="pipeline-steps">
      {props.result.steps.map((step) => (
        <li key={step.step}>
          <StatusBadge
            label={STEP_LABEL[step.step]}
            tone={step.ok ? 'ok' : 'pending'}
          />
          <span className="meta">{step.summary}</span>
        </li>
      ))}
    </ol>
  );
}

export function DashboardPage() {
  const summary = useAsync(
    () => fetchDashboardSummary(),
    [],
    '대시보드 로드 실패',
  );
  const pipeline = useAsync(() => fetchPipelineStatus(), []);
  const pipelineTask = useBackgroundTask<PipelineRunResult>({
    onDone: async () => {
      await Promise.all([summary.reload(), pipeline.reload()]);
    },
  });

  const lastRun =
    pipeline.state.kind === 'ready'
      ? pipeline.state.data.recent.find((task) => task.status !== 'running')
      : undefined;
  const lastResult =
    pipelineTask.view.task?.status === 'completed'
      ? (pipelineTask.view.task.result as PipelineRunResult)
      : lastRun?.status === 'completed'
        ? (lastRun.result as PipelineRunResult)
        : null;
  const maxCategoryCount =
    summary.state.kind === 'ready'
      ? Math.max(
          1,
          ...summary.state.data.articlesByCategory.map((row) => row.count),
        )
      : 1;
  const serverRunning =
    pipeline.state.kind === 'ready' && pipeline.state.data.running;

  return (
    <section className="page page-wide">
      <h1>Dashboard</h1>
      <p className="lede">
        뉴스 수집부터 사실 연결 가설까지 전체 파이프라인 현황입니다.
      </p>

      <div className="panel-grid">
        <div className="panel">
          <h2>분석 파이프라인</h2>
          <p className="meta">
            크롤 성공 기사 → 사실 추출 → 관계·검증 → 가설 생성 → 새 기사로
            재평가를 한 번에 실행합니다. 수집·크롤은{' '}
            <Link to="/news">뉴스</Link>에서 합니다.
          </p>
          {pipeline.state.kind === 'ready' ? (
            <p className="meta">
              자동 실행:{' '}
              {pipeline.state.data.autoEnabled
                ? `켜짐 (${pipeline.state.data.cron})`
                : '꺼짐 (PIPELINE_AUTO_ENABLED=true로 켤 수 있음)'}
            </p>
          ) : null}
          <div className="action-row">
            <button
              type="button"
              disabled={pipelineTask.view.running || serverRunning}
              onClick={() => void pipelineTask.start(() => runPipeline())}
            >
              {serverRunning && !pipelineTask.view.running
                ? '다른 실행이 진행 중'
                : '파이프라인 실행'}
            </button>
          </div>
          <TaskProgress view={pipelineTask.view} label="파이프라인" />
          {lastResult ? (
            <>
              <p className="meta">
                마지막 실행 {formatDateTimeOr(lastResult.finishedAt)}
              </p>
              <PipelineSteps result={lastResult} />
            </>
          ) : null}
          {lastRun?.status === 'failed' && !pipelineTask.view.running ? (
            <p className="error-text">마지막 실행 실패: {lastRun.error}</p>
          ) : null}
        </div>

        <div className="panel">
          <h2>단계별로 직접 실행</h2>
          <ol className="step-list">
            <li>
              <Link to="/news">뉴스</Link> 수집 → 본문 크롤
            </li>
            <li>
              <Link to="/facts">사실</Link> 「미추출 기사에서 사실 추출」
            </li>
            <li>
              <Link to="/relations">관계</Link> 「관계·검증 분석」
            </li>
            <li>
              <Link to="/hypotheses">가설</Link> 「가설 생성」
            </li>
          </ol>
        </div>
      </div>

      {summary.state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}

      {summary.state.kind === 'failed' ? (
        <p className="error-text">{summary.state.message}</p>
      ) : null}

      {summary.state.kind === 'ready' ? (
        <>
          <div className="stat-grid">
            <Link to="/news" className="stat-card">
              <span className="stat-label">수집 기사</span>
              <strong>{summary.state.data.articleCount}</strong>
            </Link>
            <Link to="/facts" className="stat-card">
              <span className="stat-label">추출 사실</span>
              <strong>{summary.state.data.factTotal}</strong>
              <span className="stat-meta">
                승인 {summary.state.data.factAccepted} / 검토{' '}
                {summary.state.data.factNeedsReview}
              </span>
            </Link>
            <Link to="/relations" className="stat-card">
              <span className="stat-label">관계</span>
              <strong>{summary.state.data.relationCount}</strong>
            </Link>
            <Link to="/hypotheses" className="stat-card">
              <span className="stat-label">가설</span>
              <strong>{summary.state.data.hypothesisCount}</strong>
            </Link>
          </div>

          <div className="panel-grid">
            <div className="panel">
              <h2>카테고리별 기사</h2>
              {summary.state.data.articlesByCategory.length === 0 ? (
                <p className="meta">아직 수집된 기사가 없습니다.</p>
              ) : (
                <ul className="bar-list">
                  {summary.state.data.articlesByCategory.map((item) => {
                    return (
                      <li key={item.category}>
                        <span>{item.category}</span>
                        <span className="bar-track">
                          <span
                            className="bar-fill"
                            style={{
                              width: `${(item.count / maxCategoryCount) * 100}%`,
                            }}
                          />
                        </span>
                        <strong>{item.count}</strong>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="panel">
              <h2>최근 수집 기사</h2>
              <ul className="plain-list">
                {summary.state.data.recentArticles.map((article) => (
                  <li key={article.id}>
                    <div>
                      <Link to={`/news/${article.id}`}>{article.title}</Link>
                      <p className="badge-row">
                        <LabelBadge
                          entry={labels.crawlStatus(article.crawlStatus)}
                        />
                        <span className="meta">
                          {article.publisher ?? '언론사 미상'} ·{' '}
                          {article.category} ·{' '}
                          {formatDateTimeOr(article.collectedAt)}
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h2>최근 가설</h2>
              {summary.state.data.recentHypotheses.length === 0 ? (
                <p className="meta">아직 생성된 가설이 없습니다.</p>
              ) : (
                <ul className="plain-list">
                  {summary.state.data.recentHypotheses.map((item) => (
                    <li key={item.id}>
                      <div>
                        <Link to={`/hypotheses/${item.id}`}>{item.title}</Link>
                        <p className="badge-row">
                          <LabelBadge entry={labels.hypothesisStatus(item.status)} />
                          <span className="meta">
                            {formatDateTimeOr(item.generatedAt)}
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <h2>최근 재평가</h2>
              {summary.state.data.recentReevaluations.length === 0 ? (
                <p className="meta">재평가 이력이 없습니다.</p>
              ) : (
                <ul className="plain-list">
                  {summary.state.data.recentReevaluations.map((item) => (
                    <li key={item.id}>
                      <div>
                        <Link to={`/hypotheses/${item.hypothesisId}`}>
                          {item.hypothesisTitle ?? '가설 보기'}
                        </Link>
                        <p className="badge-row">
                          <LabelBadge
                            entry={labels.evidenceKind(item.evidenceKind)}
                          />
                          <span className="meta">
                            {formatDateTimeOr(item.evaluatedAt)}
                          </span>
                        </p>
                        <p className="meta">{item.summary}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
