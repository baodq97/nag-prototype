import { type ReactNode, useId, useState } from 'react';

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({
  tabs,
  label,
  initial,
}: {
  tabs: TabDef[];
  label: string;
  initial?: string;
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
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
                if (step) setActive(tabs[(i + step + tabs.length) % tabs.length]!.id);
              }}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${selected ? 'border-accent-600 text-accent-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              {t.label}
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
