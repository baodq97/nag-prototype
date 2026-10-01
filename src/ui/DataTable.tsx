import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { type ReactNode, useCallback, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from './Button';
import { type Column as SortColumn, type Sort, sortRows } from './sort';

export type { Sort };

/** Keeps an object ID on one line; tables built without DataTable put it on their ID cells. */
export const ID_CELL = 'whitespace-nowrap';

export interface Column<T> extends SortColumn<T> {
  /** The column shows an object ID, which must not wrap. */
  id?: boolean;
}

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
  /**
   * Rows with a problem (error, failing, overdue, needs attention) sort above all others until
   * the user picks a column; inside each part the initial sort applies.
   */
  problem?: (row: T) => boolean;
  /**
   * Keeps the filter text in `?q=` and each facet in `?<facet key>=`, so a reload restores
   * them. Leave it off for a second table on the same screen.
   */
  urlState?: boolean;
  /** Shown when there are no rows at all, as opposed to no rows matching the filters. */
  empty?: { title: string; body?: string };
}

/** Placeholder rows while a screen's code loads. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" className="flex flex-col gap-2 px-6 py-5">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div aria-hidden className="h-4 w-96 animate-pulse rounded bg-slate-100" />
      <div aria-hidden className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-12 items-center gap-4 border-b border-slate-100 px-3">
            <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
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
  problem,
  urlState = false,
  empty,
}: Props<T>) {
  const [params, setParams] = useSearchParams();
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [localChosen, setLocalChosen] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort);
  const [userSorted, setUserSorted] = useState(false);
  const [seenResetKey, setSeenResetKey] = useState(resetKey);
  const base = useId();

  const query = urlState ? (params.get('q') ?? '') : localQuery;
  const chosen: Record<string, string> = urlState
    ? Object.fromEntries(facets.map((f) => [f.key, params.get(f.key) ?? '']))
    : localChosen;

  const writeUrl = useCallback(
    (changes: Record<string, string>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const setQuery = (value: string) => (urlState ? writeUrl({ q: value }) : setLocalQuery(value));
  const setFacet = (key: string, value: string) =>
    urlState ? writeUrl({ [key]: value }) : setLocalChosen((c) => ({ ...c, [key]: value }));
  const clearAll = () => {
    if (urlState) writeUrl(Object.fromEntries([['q', ''], ...facets.map((f) => [f.key, ''])]));
    setLocalQuery('');
    setLocalChosen({});
  };

  // A new reset key clears the filters during render, so no effect and no extra page change.
  if (resetKey !== seenResetKey) {
    setSeenResetKey(resetKey);
    setLocalQuery('');
    setLocalChosen({});
  }

  const options = useMemo(
    () =>
      Object.fromEntries(
        facets.map((f) => {
          const counts = new Map<string, number>();
          for (const r of rows) {
            for (const v of new Set(asList(f.value(r)))) counts.set(v, (counts.get(v) ?? 0) + 1);
          }
          return [f.key, [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))];
        }),
      ),
    [facets, rows],
  );

  const visible = (() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (!q || searchText(r).toLowerCase().includes(q)) &&
        facets.every((f) => !chosen[f.key] || asList(f.value(r)).includes(chosen[f.key]!)),
    );
    const sorted = sortRows(filtered, columns, sort);
    if (!problem || userSorted) return sorted;
    return [...sorted.filter(problem), ...sorted.filter((r) => !problem(r))];
  })();

  const pages = pageSize ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
  const current = Number.isInteger(page) && page >= 1 && page <= pages ? page : 1;
  const first = pageSize ? (current - 1) * pageSize : 0;
  const shown = pageSize ? visible.slice(first, first + pageSize) : visible;

  const toFirstPage = () => onPageChange?.(1);
  const filtering = query !== '' || Object.values(chosen).some(Boolean);
  const clear = () => {
    clearAll();
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
                setFacet(f.key, e.target.value);
                toFirstPage();
              }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">All</option>
              {options[f.key]?.map(([o, n]) => (
                <option key={o} value={o}>
                  {f.format ? f.format(o) : o} ({n})
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
                    className={`px-3 py-2 font-medium ${c.id ? ID_CELL : ''} ${c.className ?? ''}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next: Sort = { key: c.key, dir: dir === 'asc' ? 'desc' : 'asc' };
                          setSort(next);
                          setUserSorted(true);
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
                className={`h-12 hover:bg-slate-50 focus-within:bg-accent-50/60 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 align-middle ${c.id ? ID_CELL : ''} ${c.className ?? ''}`}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              {empty?.title ?? `No ${label} yet`}
            </p>
            {empty?.body && <p className="text-xs text-slate-600">{empty.body}</p>}
          </div>
        )}
        {rows.length > 0 && visible.length === 0 && (
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
