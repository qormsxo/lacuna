import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/lacuna';
import type { DashboardSummary } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: DashboardSummary }
  | { kind: 'failed'; message: string };

export function DashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchDashboardSummary();
        if (!cancelled) {
          setState({ kind: 'ready', data });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '대시보드 로드 실패';
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
      <h1>Dashboard</h1>
      <p className="lede">
        뉴스 수집부터 사실 연결 가설까지 전체 파이프라인 현황입니다.
      </p>

      {state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}

      {state.kind === 'failed' ? (
        <p className="error-text">{state.message}</p>
      ) : null}

      {state.kind === 'ready' ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">수집 기사</span>
              <strong>{state.data.articleCount}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">추출 사실</span>
              <strong>{state.data.factTotal}</strong>
              <span className="stat-meta">
                승인 {state.data.factAccepted} / 검토{' '}
                {state.data.factNeedsReview}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">관계</span>
              <strong>{state.data.relationCount}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">가설</span>
              <strong>{state.data.hypothesisCount}</strong>
            </div>
          </div>

          <div className="panel-grid">
            <div className="panel">
              <h2>카테고리별 기사</h2>
              {state.data.articlesByCategory.length === 0 ? (
                <p className="meta">아직 수집된 기사가 없습니다.</p>
              ) : (
                <ul className="plain-list">
                  {state.data.articlesByCategory.map((item) => (
                    <li key={item.category}>
                      <span>{item.category}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <h2>최근 수집 기사</h2>
              <ul className="plain-list">
                {state.data.recentArticles.map((article) => (
                  <li key={article.id}>
                    <div>
                      <Link to="/news">{article.title}</Link>
                      <p className="meta">
                        {article.publisher ?? '언론사 미상'} · {article.category}{' '}
                        · {article.crawlStatus}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h2>최근 가설</h2>
              <ul className="plain-list">
                {state.data.recentHypotheses.map((item) => (
                  <li key={item.id}>
                    <div>
                      <Link to={`/hypotheses/${item.id}`}>{item.title}</Link>
                      <p className="meta">
                        {item.status} · {item.generatedAt}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h2>최근 재평가</h2>
              {state.data.recentReevaluations.length === 0 ? (
                <p className="meta">재평가 이력이 없습니다.</p>
              ) : (
                <ul className="plain-list">
                  {state.data.recentReevaluations.map((item) => (
                    <li key={item.id}>
                      <div>
                        <Link to={`/hypotheses/${item.hypothesisId}`}>
                          {item.evidenceKind}
                        </Link>
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
