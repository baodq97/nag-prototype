import type { ReactNode } from 'react';
import { DemoLabel } from './Labels';
import { useRouteDef } from './useRouteDef';

/**
 * Every console screen: one h1, the route's one-line purpose, at most one "Demo data" badge and
 * at most one primary action on the right, then content. A screen's own description, if any,
 * follows the header as supporting text.
 */
export function Page({
  title,
  description,
  demo = false,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Forces the badge on a screen whose route entry does not set it. */
  demo?: boolean;
  /** The screen's primary action; keep it to one primary button. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const route = useRouteDef();
  const showDemo = demo || route?.demo === true;
  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-6 py-5">
      <title>{`${title} · NAG`}</title>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {showDemo && <DemoLabel />}
          </div>
          {route && (
            <p data-testid="page-purpose" className="mt-1 text-sm text-slate-700">
              {route.purpose}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {description && <div className="-mt-2 max-w-3xl text-xs text-slate-600">{description}</div>}
      {children}
    </div>
  );
}
