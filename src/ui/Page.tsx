import type { ReactNode } from 'react';
import { DemoLabel } from './Labels';

/** Every console screen: one h1, an optional demo-data label, actions, then content. */
export function Page({
  title,
  description,
  demo = false,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Screens that show runtime behaviour carry the persistent demo-data label. */
  demo?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-6 py-5">
      <title>{`${title} · NAG`}</title>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {demo && <DemoLabel />}
          </div>
          {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
