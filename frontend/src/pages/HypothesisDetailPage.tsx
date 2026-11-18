import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchHypothesisDetail } from '../api/lacuna';
import type { HypothesisDetail } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; detail: HypothesisDetail }
  | { kind: 'failed'; message: string };

export function HypothesisDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const hypothesisId = id;

    if (hypothesisId === undefined) {
      setState({ kind: 'failed', message: '가설 ID가 없습니다.' });
      return;
    }

    let cancelled = false;

    async function load(id: string) {
      try {
        const detail = await fetchHypothesisDetail(id);
        if (!cancelled) {
          setState({ kind: 'ready', detail });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '가설 상세 로드 실패';
        if (!cancelled) {
          setState({ kind: 'failed', message });
        }
      }
    }

    void load(hypothesisId);
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <section className="page page-wide">
      <p className="meta">
        <Link to="/hypotheses">← 가설 목록</Link>
      </p>

      {state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {state.kind === 'failed' ? (
        <p className="error-text">{state.message}</p>
      ) : null}

      {state.kind === 'ready' ? (
        <>
          <h1>{state.detail.hypothesis.title}</h1>
          <p className="lede lede-wide">{state.detail.hypothesis.coreClaim}</p>
          <p className="meta">상태: {state.detail.hypothesis.status}</p>

          <div className="hypothesis-detail-grid">
            <div className="panel panel-span-2">
              <h2>도출 과정</h2>
              <p className="detail-prose">
                {state.detail.hypothesis.derivationProcess}
              </p>
              <p className="meta">
                사실/추론 구분: {state.detail.hypothesis.factsVersusInference}
              </p>
            </div>

            <div className="panel">
              <h2>지지 증거</h2>
              <ul className="plain-list">
                {state.detail.hypothesis.supportingEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h2>반대 증거</h2>
              <ul className="plain-list">
                {state.detail.hypothesis.contradictingEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h2>대안 설명 / 불확실성</h2>
              <ul className="plain-list">
                {state.detail.hypothesis.alternativeExplanations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="meta">
                {state.detail.hypothesis.uncertaintyAndLimits}
              </p>
              <h3>추가 검증 항목</h3>
              <ul className="plain-list">
                {state.detail.hypothesis.additionalVerificationItems.map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
            </div>

            <div className="panel">
              <h2>관련 사실</h2>
              <ul className="plain-list">
                {state.detail.relatedFacts.map((fact) => (
                  <li key={fact.id}>
                    <strong>{fact.normalizedStatement}</strong>
                    <p className="meta">{fact.evidenceSentence}</p>
                  </li>
                ))}
              </ul>
              <h2>관련 기사</h2>
              <ul className="plain-list">
                {state.detail.relatedArticles.map((article) => (
                  <li key={article.id}>
                    <a href={article.url} target="_blank" rel="noreferrer">
                      {article.title}
                    </a>
                    <p className="meta">
                      {article.publisher ?? '-'} · {article.source}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h2>변경 이력</h2>
              <ul className="plain-list">
                {state.detail.statusHistory.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {item.fromStatus ?? 'none'} → {item.toStatus}
                    </strong>
                    <p className="meta">{item.reason}</p>
                    <p className="meta">{item.changedAt}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
