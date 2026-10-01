import { X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/** One filter as a row of toggle chips, each with its count, plus Clear when one is chosen. */
export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {options.map((o) => {
        const pressed = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(pressed ? null : o.value)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${pressed ? 'bg-accent-700 text-white ring-accent-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'}`}
          >
            {o.label}
            <span className={pressed ? 'text-white' : 'text-slate-600'}>{o.count}</span>
          </button>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-accent-700 hover:underline"
        >
          <X size={12} aria-hidden />
          Clear
        </button>
      )}
    </div>
  );
}
