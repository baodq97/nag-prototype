import type { LucideIcon } from 'lucide-react';
import { CHIP_CLASSES, type ChipVariant } from './status';

export interface SummaryTile {
  /** The filter value this tile sets. */
  key: string;
  label: string;
  /** A number, or a ready-made figure such as "82%". */
  value: number | string;
  icon?: LucideIcon;
  tone?: ChipVariant;
}

/**
 * Two to five headline numbers above a table. Activating a tile sets its filter; activating the
 * active tile clears it. The screen keeps the filter in the URL.
 */
export function SummaryStrip({
  label,
  tiles,
  active,
  onSelect,
}: {
  label: string;
  tiles: SummaryTile[];
  active?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        const pressed = active === t.key;
        const body = (
          <>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              {Icon && (
                <span
                  className={`rounded p-0.5 ring-1 ring-inset ${CHIP_CLASSES[t.tone ?? 'neutral']}`}
                >
                  <Icon size={12} aria-hidden />
                </span>
              )}
              {t.label}
            </span>
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">{t.value}</span>
          </>
        );
        const box = `flex w-full flex-col items-start gap-1 rounded-lg border bg-white px-4 py-3 text-left ${pressed ? 'border-accent-600 ring-1 ring-accent-600' : 'border-slate-200'}`;
        return (
          <li key={t.key} data-testid={`tile-${t.key}`}>
            {onSelect ? (
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => onSelect(pressed ? null : t.key)}
                className={`${box} hover:border-accent-600 focus-visible:outline-2 focus-visible:outline-accent-600`}
              >
                {body}
              </button>
            ) : (
              <div className={box}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
