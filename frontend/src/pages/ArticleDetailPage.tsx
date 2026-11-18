import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  extractFactsForArticle,
  fetchArticle,
  fetchFactsByArticle,
  reevaluateForArticle,
} from '../api/lacuna';
import { LabelBadge, StatusBadge } from '../components/common/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { errorMessage, formatDateTimeOr } from '../lib/format';
import * as labels from '../lib/labels';

export function ArticleDetailPage() {
  const { id } = useParams();
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showBody, setShowBody] = useState(false);

  const article = useAsync(
    () =>
      id === undefined
        ? Promise.reject(new Error('기사 ID가 없습니다.'))
        : fetchArticle(id),
    [id],
    '기사 로드 실패',
  );

  const facts = useAsync(
    () => (id === undefined ? Promise.resolve([]) : fetchFactsByArticle(id)),
    [id],
    '사실 로드 실패',
  );

  async function runAction(
    label: string,
    work: () => Promise<string>,
  ): Promise<void> {
    setBusy(true);
    setActionMessage(`${label} 실행 중…`);

    try {
      setActionMessage(await work());
      await facts.reload();
    } catch (error) {
      setActionMessage(errorMessage(error, `${label} 실패`));
    } finally {
      setBusy(false);
    }
  }

  if (article.state.kind === 'loading') {
    return (
      <section className="page">
        <StatusBadge label="불러오는 중..." tone="pending" />
      </section>
    );
  }

  if (article.state.kind === 'failed') {
    return (
      <section className="page">
        <p className="meta">
          <Link to="/news">← 뉴스 목록</Link>
        </p>
        <p className="error-text">{article.state.message}</p>
      </section>
    );
  }

  const data = article.state.data;
  const canExtract = data.crawlStatus === 'success' && data.bodyExtracted;

  return (
    <section className="page page-wide">
      <p className="meta">
        <Link to="/news">← 뉴스 목록</Link>
      </p>
      <h1>{data.title}</h1>
      <p className="badge-row">
        <LabelBadge entry={labels.crawlStatus(data.crawlStatus)} />
        <span className="meta">
          {data.publisher ?? '언론사 미상'}
          {data.author ? ` · ${data.author}` : ''} · {data.category} ·{' '}
          {labels.newsSource(data.source).label}
        </span>
      </p>
      <p className="meta">
        발행 {formatDateTimeOr(data.publishedAt)} · 수집{' '}
        {formatDateTimeOr(data.collectedAt)} · 크롤{' '}
        {formatDateTimeOr(data.crawledAt)} (시도 {data.crawlAttempts}회) ·{' '}
        <a href={data.url} target="_blank" rel="noreferrer">
          원문 ↗
        </a>
      </p>
      {data.lastError ? (
        <p className="error-text">마지막 오류: {data.lastError}</p>
      ) : null}

      <div className="panel collect-panel">
        <h2>이 기사로 실행</h2>
        <div className="action-row">
          <button
            type="button"
            disabled={busy || !canExtract}
            title={canExtract ? undefined : '본문 크롤이 성공한 기사만 추출할 수 있습니다'}
            onClick={() =>
              void runAction('사실 추출', async () => {
                const result = await extractFactsForArticle(data.id, false);

                return `사실 추출: 승인 ${result.run.acceptedCount}건 / 검토 ${result.run.reviewCount}건 (${result.run.status})`;
              })
            }
          >
            사실 추출
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy || !canExtract}
            onClick={() =>
              void runAction('가설 재평가', async () => {
                const result = await reevaluateForArticle(data.id);

                return `재평가: 후보 가설 ${result.candidateHypothesisCount}건, 평가 ${result.assessments.length}건, 중복 스킵 ${result.skippedDuplicates}건`;
              })
            }
          >
            이 기사로 기존 가설 재평가
          </button>
        </div>
        {actionMessage ? <p className="meta">{actionMessage}</p> : null}
      </div>

      <div className="split-view">
        <div className="panel">
          <h2>
            추출된 사실{' '}
            {facts.state.kind === 'ready' ? `(${facts.state.data.length})` : ''}
          </h2>
          {facts.state.kind === 'ready' && facts.state.data.length === 0 ? (
            <p className="meta">아직 추출된 사실이 없습니다.</p>
          ) : null}
          {facts.state.kind === 'failed' ? (
            <p className="error-text">{facts.state.message}</p>
          ) : null}
          {facts.state.kind === 'ready' ? (
            <ul className="plain-list">
              {facts.state.data.map((fact) => (
                <li key={fact.id}>
                  <div>
                    <p>{fact.normalizedStatement}</p>
                    <blockquote className="evidence">
                      {fact.evidenceSentence}
                    </blockquote>
                    <p className="badge-row">
                      <LabelBadge entry={labels.factType(fact.factType)} />
                      <LabelBadge entry={labels.reviewStatus(fact.reviewStatus)} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="panel">
          <h2>본문</h2>
          {data.summary ? <p className="meta">{data.summary}</p> : null}
          {data.body ? (
            <>
              <div className={showBody ? 'article-body' : 'article-body collapsed'}>
                {data.body}
              </div>
              <button
                type="button"
                className="page-btn"
                onClick={() => setShowBody((prev) => !prev)}
              >
                {showBody ? '접기' : '본문 펼치기'}
              </button>
            </>
          ) : (
            <p className="meta">
              {data.bodyStorageMode === 'metadata_only'
                ? '본문 저장이 꺼져 있어 길이·해시만 보관합니다.'
                : '본문이 없습니다.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
