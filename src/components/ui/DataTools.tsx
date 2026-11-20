import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";

export interface SortOption<T> {
  id: string;
  label: string;
  cmp: (a: T, b: T) => number;
}

interface TableOptions<T> {
  /** text a row is searched against (lower-cased automatically) */
  searchText?: (row: T) => string;
  sorts?: SortOption<T>[];
  defaultSort?: string;
  /** extra predicate coming from filter controls */
  filter?: (row: T) => boolean;
  /** change this value whenever filters change so the page resets to 1 */
  resetKey?: string;
  pageSize?: number;
}

/** Client-side search + sort + filter + pagination over an already-fetched list */
export function useTable<T>(items: T[] | null | undefined, opts: TableOptions<T> = {}) {
  const { searchText, sorts = [], defaultSort, filter, resetKey = "", pageSize: initialSize = 10 } = opts;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(defaultSort ?? sorts[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  useEffect(() => {
    setPage(1);
  }, [search, sort, resetKey, pageSize]);

  const processed = useMemo(() => {
    let rows = items ?? [];
    const q = search.trim().toLowerCase();
    if (q && searchText) rows = rows.filter((r) => searchText(r).toLowerCase().includes(q));
    if (filter) rows = rows.filter(filter);
    const s = sorts.find((x) => x.id === sort);
    if (s) rows = [...rows].sort(s.cmp);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, sort, resetKey]);

  const pageCount = Math.max(1, Math.ceil(processed.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = useMemo(() => processed.slice((current - 1) * pageSize, current * pageSize), [processed, current, pageSize]);

  return { rows, total: processed.length, all: processed, page: current, setPage, pageCount, pageSize, setPageSize, search, setSearch, sort, setSort, sorts };
}

type TableState<T> = ReturnType<typeof useTable<T>>;

const controlCls =
  "min-h-10 rounded-sm border border-line-strong bg-surface px-3 text-base text-text outline-offset-0 transition-colors duration-100 ease-out hover:border-text focus:border-brand sm:text-sm pointer-coarse:min-h-11";

/** Search box + sort dropdown + slot for filter controls */
export function TableToolbar<T>({ table, placeholder = "Rechercher…", searchable = true, children }: { table: TableState<T>; placeholder?: string; searchable?: boolean; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      {searchable && (
        <div className="relative min-w-0 sm:w-72">
          <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="table-search" className="sr-only">
            {placeholder}
          </label>
          <input id="table-search" type="search" value={table.search} onChange={(e) => table.setSearch(e.target.value)} placeholder={placeholder} className={`${controlCls} w-full pl-11`} />
        </div>
      )}
      {children}
      {table.sorts.length > 0 && (
        <div className="flex items-center gap-3 sm:ml-auto">
          <label htmlFor="table-sort" className="text-sm text-muted">
            Trier
          </label>
          <select id="table-sort" value={table.sort} onChange={(e) => table.setSort(e.target.value)} className={`${controlCls} cursor-pointer`}>
            {table.sorts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** Compact labelled select used for filters inside <TableToolbar> */
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${controlCls} min-w-36 cursor-pointer`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function pageWindow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(count - 1, page + 1); p++) out.push(p);
  if (page < count - 2) out.push("…");
  out.push(count);
  return out;
}

export function Pagination<T>({ table, sizes = [6, 10, 20, 50] }: { table: TableState<T>; sizes?: number[] }) {
  const { page, pageCount, total, pageSize, setPage, setPageSize } = table;
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nav =
    "flex size-10 cursor-pointer items-center justify-center rounded-sm border border-line font-mono text-sm transition-colors duration-100 ease-out hover:border-line-strong hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:size-11";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-line pt-6 sm:flex-row">
      <p className="text-sm text-muted tabular-nums">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center gap-2">
        <button className={nav} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Page précédente">
          <CaretLeft size={16} />
        </button>
        {pageWindow(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-subtle" aria-hidden>
              …
            </span>
          ) : (
            <button key={p} className={`${nav} ${p === page ? "border-primary bg-primary text-on-primary hover:border-primary" : ""}`} onClick={() => setPage(p)} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`}>
              {p}
            </button>
          ),
        )}
        <button className={nav} onClick={() => setPage(page + 1)} disabled={page >= pageCount} aria-label="Page suivante">
          <CaretRight size={16} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="page-size" className="text-sm text-muted">
          Par page
        </label>
        <select id="page-size" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className={`${controlCls} cursor-pointer`}>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}
