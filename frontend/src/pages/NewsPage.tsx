import { useEffect, useState } from 'react';
import { fetchArticles } from '../api/lacuna';
import type { Article } from '../api/types';
import { StatusBadge } from '../components/common/StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; articles: Article[] }
  | { kind: 'failed'; message: string };

function crawlTone(status: string): 'ok' | 'error' | 'pending' {
  if (status === 'success') {
    return 'ok';
  }
  if (status === 'failed' || status === 'inaccessible') {
    return 'error';
  }
  return 'pending';
}

export function NewsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const articles = await fetchArticles(50);
        if (!cancelled) {
          setState({ kind: 'ready', articles });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '기사 목록 로드 실패';
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
      <h1>뉴스 목록</h1>
      <p className="lede">수집된 기사와 본문 크롤링 상태입니다.</p>

      {state.kind === 'loading' ? (
        <StatusBadge label="불러오는 중..." tone="pending" />
      ) : null}
      {state.kind === 'failed' ? (
        <p className="error-text">{state.message}</p>
      ) : null}

      {state.kind === 'ready' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>언론사</th>
                <th>카테고리</th>
                <th>발행/수집</th>
                <th>크롤 상태</th>
                <th>원문</th>
              </tr>
            </thead>
            <tbody>
              {state.articles.map((article) => (
                <tr key={article.id}>
                  <td>{article.title}</td>
                  <td>{article.publisher ?? '-'}</td>
                  <td>{article.category}</td>
                  <td className="meta">
                    {article.publishedAt ?? article.collectedAt}
                  </td>
                  <td>
                    <StatusBadge
                      label={article.crawlStatus}
                      tone={crawlTone(article.crawlStatus)}
                    />
                  </td>
                  <td>
                    <a href={article.url} target="_blank" rel="noreferrer">
                      열기
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
