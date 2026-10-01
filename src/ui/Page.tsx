import type { ReactNode } from 'react';
import { DemoLabel } from './Labels';
import { useRouteDef } from './useRouteDef';

/**
 * Every console screen: one h1, the route's one-line purpose, at most one "Demo data" badge and
 * at most one primary action on the right, then content. There is no slot for more text under
 * the purpose: a screen explains its content in the body, next to that content.
 */
export function Page({
  title,
  demo = false,
  actions,
  children,
}: {
  title: string;
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
      {children}
    </div>
  );
}
