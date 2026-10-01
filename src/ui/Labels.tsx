import { FlaskConical, Plug } from 'lucide-react';
import { useId } from 'react';

export const DEMO_TOOLTIP = 'Values on this screen are seeded demo data. No runtime is connected.';

/** Persistent label on every screen that shows runtime behaviour. */
export function DemoLabel() {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={id}
        data-testid="demo-label"
        className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 ring-inset"
      >
        <FlaskConical aria-hidden size={12} />
        Demo data
      </span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute top-full left-0 z-30 mt-1 w-64 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {DEMO_TOOLTIP}
      </span>
    </span>
  );
}

/** Marks something that is not real in this prototype, e.g. the timestamp authority. */
export function StubLabel({ what }: { what?: string }) {
  return (
    <span
      data-testid="stub-label"
      title={what ? `${what} is a stub in this prototype` : 'Stub in this prototype'}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 ring-inset"
    >
      <Plug aria-hidden size={11} />
      Stub
    </span>
  );
}
