type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function getPageItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <nav className="ui-pagination" aria-label="Paginacion">
      <button
        type="button"
        className="ui-page-button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Anterior
      </button>

      <div className="ui-pagination-list">
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="ui-pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`ui-page-button${item === currentPage ? " is-active" : ""}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className="ui-page-button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}

type PaginationFooterProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
};

export function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = "elementos",
}: PaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="ui-pagination-footer">
      <div className="ui-pagination-footer-info">
        <select
          className="ui-select ui-page-size-select"
          value={pageSize}
          onChange={(event) => {
            onPageSizeChange(Number(event.target.value));
            onPageChange(1);
          }}
          aria-label="Elementos por pagina"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} por pagina
            </option>
          ))}
        </select>
        <span>
          {total === 0 ? `0 ${itemLabel}` : `Mostrando ${from}-${to} de ${total} ${itemLabel}`}
        </span>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
