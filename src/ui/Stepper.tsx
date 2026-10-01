import { Check } from 'lucide-react';

/** Numbered steps of a flow; done steps show a check, the current one is marked for assistive tech. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const done = i < current;
        const here = i === current;
        return (
          <li
            key={s}
            aria-current={here ? 'step' : undefined}
            className={`flex items-center gap-1.5 ${here ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-600'}`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ring-1 ring-inset ${done ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : here ? 'bg-accent-700 text-white ring-accent-700' : 'bg-white ring-slate-300'}`}
            >
              {done ? <Check size={11} aria-hidden /> : i + 1}
            </span>
            <span>
              {s}
              {done && <span className="sr-only"> (done)</span>}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-6 bg-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
}
