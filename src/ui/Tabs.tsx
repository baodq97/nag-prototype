import { type ReactNode, useId, useState } from 'react';

export interface TabDef {
  id: string;
  label: string;
  /** Shown next to the label, e.g. "Errors 1". */
  count?: number;
  content: ReactNode;
}

/** Tabs with optional counts. Pass `value` and `onChange` to keep the active tab in the URL. */
export function Tabs({
  tabs,
  label,
  initial,
  value,
  onChange,
}: {
  tabs: TabDef[];
  label: string;
  initial?: string;
  value?: string | null;
  onChange?: (id: string) => void;
}) {
  const [local, setLocal] = useState(initial ?? tabs[0]?.id);
  const active = value ?? local;
  const setActive = (id: string) => {
    setLocal(id);
    onChange?.(id);
  };
  const base = useId();
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const selected = t.id === current?.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => {
                const i = tabs.findIndex((x) => x.id === t.id);
                const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                // Focus follows the selection: the old tab now has tabIndex -1.
                const next = tabs[(i + step + tabs.length) % tabs.length]!.id;
                setActive(next);
                document.getElementById(`${base}-tab-${next}`)?.focus();
              }}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${selected ? 'border-accent-600 text-accent-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          role="tabpanel"
          id={`${base}-panel-${current.id}`}
          aria-labelledby={`${base}-tab-${current.id}`}
          className="pt-3"
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
