import { type ReactNode, useId } from 'react';

/**
 * Wraps a trigger so hover or keyboard focus shows a short description. The wrapper itself takes
 * focus, so put no button or link inside it. Hidden tooltips take no space, so they never widen
 * the page.
 */
export function Tooltip({
  content,
  children,
  className = '',
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <span tabIndex={0} aria-describedby={id} className={`inline-flex rounded-full ${className}`}>
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute hidden top-full left-0 z-30 mt-1 w-64 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal whitespace-normal text-white shadow-lg group-focus-within:block group-hover:block"
      >
        {content}
      </span>
    </span>
  );
}
