import { Link, useParams } from 'react-router-dom';
import { fetchHypothesisDetail } from '../api/lacuna';
import { LabelBadge, StatusBadge } from '../components/common/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { formatDateTimeOr } from '../lib/format';
import * as labels from '../lib/labels';

function BulletList(props: { items: string[]; empty: string }) {
  if (props.items.length === 0) {
    return <p className="meta">{props.empty}</p>;
  }

  return (
    <ul className="bullet-list">
      {props.items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

export function HypothesisDetailPage() {
  const { id } = useParams();
  const { state } = useAsync(
    () => {
      if (id === undefined) {
        return Promise.reject(new Error('가설 ID가 없습니다.'));
      }
      return fetchHypothesisDetail(id);
    },
    [id],
    '가설 상세 로드 실패',
  );

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
          <h1>{state.data.hypothesis.title}</h1>
          <p className="lede lede-wide">{state.data.hypothesis.coreClaim}</p>
          <p className="badge-row">
            <LabelBadge
              entry={labels.hypothesisStatus(state.data.hypothesis.status)}
            />
            <span className="meta">
              생성 {formatDateTimeOr(state.data.hypothesis.generatedAt)}
              {state.data.hypothesis.lastReevaluatedAt
                ? ` · 마지막 재평가 ${formatDateTimeOr(state.data.hypothesis.lastReevaluatedAt)}`
                : ''}
            </span>
          </p>

          <div className="hypothesis-detail-grid">
            <div className="panel panel-span-2">
              <h2>도출 과정</h2>
              <p className="detail-prose">
                {state.data.hypothesis.derivationProcess}
              </p>
              <p className="meta">
                사실/추론 구분: {state.data.hypothesis.factsVersusInference}
              </p>
              {state.data.hypothesis.assumptions.length > 0 ? (
                <>
                  <h3>전제</h3>
                  <BulletList
                    items={state.data.hypothesis.assumptions}
                    empty="-"
                  />
                </>
              ) : null}
            </div>

            <div className="panel">
              <h2>지지 증거</h2>
              <BulletList
                items={state.data.hypothesis.supportingEvidence}
                empty="없음"
              />
              <h2>반대 증거</h2>
              <BulletList
                items={state.data.hypothesis.contradictingEvidence}
                empty="없음"
              />
            </div>

            <div className="panel">
              <h2>대안 설명 / 불확실성</h2>
              <BulletList
                items={state.data.hypothesis.alternativeExplanations}
                empty="없음"
              />
              <p className="meta">{state.data.hypothesis.uncertaintyAndLimits}</p>
              <h3>추가 검증 항목</h3>
              <BulletList
                items={state.data.hypothesis.additionalVerificationItems}
                empty="없음"
              />
            </div>

            <div className="panel">
              <h2>관련 사실 ({state.data.relatedFacts.length})</h2>
              <ul className="plain-list">
                {state.data.relatedFacts.map((fact) => (
                  <li key={fact.id}>
                    <div>
                      <strong>{fact.normalizedStatement}</strong>
                      <blockquote className="evidence">
                        {fact.evidenceSentence}
                      </blockquote>
                      <p className="badge-row">
                        <LabelBadge entry={labels.factType(fact.factType)} />
                        <Link to={`/news/${fact.articleId}`}>기사 상세</Link>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <h2>관련 기사 ({state.data.relatedArticles.length})</h2>
              <ul className="plain-list">
                {state.data.relatedArticles.map((article) => (
                  <li key={article.id}>
                    <div>
                      <Link to={`/news/${article.id}`}>{article.title}</Link>
                      <p className="meta">
                        {article.publisher ?? '-'} ·{' '}
                        {labels.newsSource(article.source).label} ·{' '}
                        <a href={article.url} target="_blank" rel="noreferrer">
                          원문 ↗
                        </a>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h2>상태 변경 이력</h2>
              <ol className="timeline">
                {state.data.statusHistory.map((item) => (
                  <li key={item.id}>
                    <p className="badge-row">
                      {item.fromStatus ? (
                        <>
                          <LabelBadge
                            entry={labels.hypothesisStatus(item.fromStatus)}
                          />
                          →
                        </>
                      ) : (
                        <span className="meta">생성 →</span>
                      )}
                      <LabelBadge entry={labels.hypothesisStatus(item.toStatus)} />
                    </p>
                    <p>{item.reason}</p>
                    <p className="meta">{formatDateTimeOr(item.changedAt)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
