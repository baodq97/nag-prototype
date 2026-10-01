import { type ReactNode, useEffect, useId, useState } from 'react';

/**
 * Wraps a trigger so hover or keyboard focus shows a short description. The wrapper itself takes
 * focus, so put no button or link inside it. Hidden tooltips take no space, so they never widen
 * the page. Escape hides the tooltip, and the pointer can move onto it without it closing.
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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!open) return;
    // Escape also reaches an open drawer or dialog, which closes as before.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={() => setFocused(false)}
    >
      <span tabIndex={0} aria-describedby={id} className={`inline-flex rounded-full ${className}`}>
        {children}
      </span>
      {/* The padding, not a margin, bridges trigger and tooltip so the pointer can cross it. */}
      <span
        id={id}
        role="tooltip"
        className={`absolute top-full left-0 z-30 w-64 pt-1 ${open ? 'block' : 'hidden'}`}
      >
        <span className="block rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal whitespace-normal text-white shadow-lg">
          {content}
        </span>
      </span>
    </span>
  );
}
