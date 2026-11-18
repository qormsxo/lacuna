type PagerProps = {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
};

export function Pager(props: PagerProps) {
  const { offset, limit, total, onChange } = props;
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  if (total <= limit) {
    return <p className="meta">총 {total}건</p>;
  }

  return (
    <div className="pager-inline">
      <button
        type="button"
        className="page-btn"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        ← 이전
      </button>
      <span className="meta">
        {page} / {pageCount} 페이지 · 총 {total}건
      </span>
      <button
        type="button"
        className="page-btn"
        disabled={page >= pageCount}
        onClick={() => onChange(offset + limit)}
      >
        다음 →
      </button>
    </div>
  );
}
