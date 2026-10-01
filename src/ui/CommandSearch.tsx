import { Search } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { documentReview, getDocument, getPolicy, policyRenewal, searchIndex } from '../data';
import { search } from '../domain/search';
import type { ReviewState } from '../domain/types';
import { StatusChip } from './StatusChip';
import { useDialog } from './useDialog';
import { humanize } from './status';

/** The review state of a document or policy result; every other kind is always current. */
function reviewOf(entry: { kind: string; id: string }): ReviewState {
  if (entry.kind === 'document') {
    const doc = getDocument(entry.id);
    return doc ? documentReview(doc) : 'current';
  }
  if (entry.kind === 'policy') {
    const policy = getPolicy(entry.id);
    return policy ? policyRenewal(policy) : 'current';
  }
  return 'current';
}

/** Ctrl/Cmd+K search over tests, controls, documents, policies, risks and articles. */
export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const results = useMemo(() => search(searchIndex, query, 12), [query]);
  const close = () => {
    setOpen(false);
    setQuery('');
    setActive(0);
  };
  const ref = useDialog(open, close);
  const listId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    close();
    navigate(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-80 min-w-fit shrink items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm whitespace-nowrap text-slate-600 hover:border-slate-400"
      >
        <Search size={14} aria-hidden className="shrink-0" />
        <span className="whitespace-nowrap">Search tests, controls, documents…</span>
        <kbd className="ml-auto shrink-0 rounded px-1 text-xs whitespace-nowrap text-slate-600 ring-1 ring-slate-300 ring-inset">
          Ctrl K
        </kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]">
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Command search"
            className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-3">
              <Search size={16} aria-hidden className="text-slate-500" />
              <input
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls={listId}
                aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
                aria-label="Search"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
                  if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
                  if (e.key === 'Enter' && results[active]) go(results[active].href);
                }}
                placeholder="Search by name or ID"
                className="w-full py-3 text-base outline-none placeholder:text-slate-500"
              />
            </div>
            <ul
              id={listId}
              role="listbox"
              aria-label="Results"
              className="max-h-96 overflow-y-auto py-1"
            >
              {results.map((r, i) => (
                <li
                  key={`${r.kind}-${r.id}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${i === active ? 'bg-accent-50' : ''}`}
                >
                  <span className="truncate">{r.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
                    {reviewOf(r) !== 'current' && <StatusChip status={reviewOf(r)} />}
                    {humanize(r.kind)} · {r.id}
                  </span>
                </li>
              ))}
            </ul>
            {query && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-600">No matches.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
