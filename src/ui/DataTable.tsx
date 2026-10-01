import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { Button } from './Button';
import { type Column, type Sort, sortRows } from './sort';

export type { Column, Sort };

export interface Facet<T> {
  key: string;
  label: string;
  /** One value or several (e.g. frameworks); the row matches if any equals the choice. */
  value: (row: T) => string | string[];
  /** Display label for a value; defaults to the value. */
  format?: (value: string) => string;
}

interface Props<T> {
  /** Plural noun for the rows, used in labels and the empty state: "tests". */
  label: string;
  rows: T[];
  columns: Column<T>[];
  facets: Facet<T>[];
  rowKey: (row: T) => string;
  /** Text the filter box matches against. */
  searchText: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialQuery?: string;
  initialSort?: Sort;
  toolbar?: ReactNode;
  /** Opt-in paging: rows per page. Without it the table shows every row. */
  pageSize?: number;
  /** The current page (1-based) when paging; out-of-range values show page 1. */
  page?: number;
  /** Called with the new page; with 1 whenever the filter text, a facet or the sort changes. */
  onPageChange?: (page: number) => void;
  onSortChange?: (sort: Sort) => void;
  /** Changing this value clears the filter text and the facets. */
  resetKey?: string | number;
}

const asList = (v: string | string[]) => (Array.isArray(v) ? v : [v]);

/** The console table: text filter, facet filters, column sorting, opt-in paging and an empty state. */
export function DataTable<T>({
  label,
  rows,
  columns,
  facets,
  rowKey,
  searchText,
  onRowClick,
  initialQuery = '',
  initialSort,
  toolbar,
  pageSize,
  page = 1,
  onPageChange,
  onSortChange,
  resetKey,
}: Props<T>) {
  const [query, setQuery] = useState(initialQuery);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort);
  const [seenResetKey, setSeenResetKey] = useState(resetKey);
  const base = useId();

  // A new reset key clears the filters during render, so no effect and no extra page change.
  if (resetKey !== seenResetKey) {
    setSeenResetKey(resetKey);
    setQuery('');
    setChosen({});
  }

  const options = useMemo(
    () =>
      Object.fromEntries(
        facets.map((f) => [f.key, [...new Set(rows.flatMap((r) => asList(f.value(r))))].sort()]),
      ),
    [facets, rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (!q || searchText(r).toLowerCase().includes(q)) &&
        facets.every((f) => !chosen[f.key] || asList(f.value(r)).includes(chosen[f.key]!)),
    );
    return sortRows(filtered, columns, sort);
  }, [rows, query, chosen, facets, columns, sort, searchText]);

  const pages = pageSize ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
  const current = Number.isInteger(page) && page >= 1 && page <= pages ? page : 1;
  const first = pageSize ? (current - 1) * pageSize : 0;
  const shown = pageSize ? visible.slice(first, first + pageSize) : visible;

  const toFirstPage = () => onPageChange?.(1);
  const filtering = query !== '' || Object.values(chosen).some(Boolean);
  const clear = () => {
    setQuery('');
    setChosen({});
    toFirstPage();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        <label className="relative" htmlFor={`${base}-q`}>
          <span className="sr-only">Filter {label}</span>
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-slate-500"
          />
          <input
            id={`${base}-q`}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              toFirstPage();
            }}
            placeholder={`Filter ${label}…`}
            className="w-56 rounded-md border border-slate-300 py-1 pr-2 pl-7 text-sm placeholder:text-slate-500 focus:border-accent-600 focus:ring-1 focus:ring-accent-600 focus:outline-none"
          />
        </label>
        {facets.map((f) => (
          <label key={f.key} className="flex items-center gap-1 text-sm text-slate-700">
            <span>{f.label}</span>
            <select
              value={chosen[f.key] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setChosen((c) => ({ ...c, [f.key]: value }));
                toFirstPage();
              }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">All</option>
              {options[f.key]?.map((o) => (
                <option key={o} value={o}>
                  {f.format ? f.format(o) : o}
                </option>
              ))}
            </select>
          </label>
        ))}
        {filtering && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-xs text-slate-600" aria-live="polite">
          {visible.length} of {rows.length} {label}
        </span>
        {toolbar}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {columns.map((c) => {
                const dir = sort?.key === c.key ? sort.dir : undefined;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-3 py-2 font-medium ${c.className ?? ''}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next: Sort = { key: c.key, dir: dir === 'asc' ? 'desc' : 'asc' };
                          setSort(next);
                          onSortChange?.(next);
                          toFirstPage();
                        }}
                        className="inline-flex items-center gap-1 hover:text-slate-900"
                      >
                        {c.header}
                        {dir === 'asc' ? (
                          <ArrowUp size={12} aria-hidden />
                        ) : dir === 'desc' ? (
                          <ArrowDown size={12} aria-hidden />
                        ) : (
                          <ArrowUpDown size={12} aria-hidden className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 align-top ${c.className ?? ''}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">No {label} match these filters</p>
            <p className="text-xs text-slate-600">Change the filter text or choose “All”.</p>
            {filtering && (
              <Button size="sm" onClick={clear}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
      {pageSize && visible.length > 0 && (
        <nav
          aria-label={`Pages of ${label}`}
          className="flex items-center gap-3 border-t border-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          <span>
            Page {current} of {pages}
          </span>
          <span className="text-xs text-slate-600">
            {first + 1}–{first + shown.length} of {visible.length}
          </span>
          <span className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={current <= 1}
              onClick={() => onPageChange?.(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={current >= pages}
              onClick={() => onPageChange?.(current + 1)}
            >
              Next
            </Button>
          </span>
        </nav>
      )}
    </div>
  );
}
