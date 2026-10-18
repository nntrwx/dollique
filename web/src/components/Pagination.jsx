// Page numbers to show: first, last, and two around the current one, with "…" gaps.
function getPages(page, totalPages) {
  const pages = [];
  for (let number = 1; number <= totalPages; number += 1) {
    if (number === 1 || number === totalPages || Math.abs(number - page) <= 1) {
      pages.push(number);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return pages;
}

// Hand-drawn square buttons. `children` goes to the right end (the page size picker).
function Pagination({
  page, totalPages, onChange, children = null,
}) {
  return (
    <nav className="pager" aria-label="Pages">
      {totalPages > 1 && (
        <>
          <button
            type="button"
            className="nbtn nbtn--sq"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          {getPages(page, totalPages).map((item, index) => (item === '…' ? (
            <span key={`gap-${index}`} className="pager__gap">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`nbtn nbtn--sq${item === page ? ' on' : ''}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          )))}
          <button
            type="button"
            className="nbtn nbtn--sq"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </>
      )}
      {children && <span className="pager__end">{children}</span>}
    </nav>
  );
}

export default Pagination;
