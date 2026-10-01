import { useEffect, useRef } from 'react';

/**
 * Closes on Escape and moves focus into the dialog when it opens: to the first field ("first",
 * for forms) or to the element marked `data-dialog-heading` ("heading", for drawers, so no chip
 * or tooltip trigger gets focus on its own).
 */
export function useDialog(
  open: boolean,
  onClose: () => void,
  focus: 'first' | 'heading' = 'first',
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const target =
      focus === 'heading'
        ? ref.current?.querySelector<HTMLElement>('[data-dialog-heading]')
        : ref.current?.querySelector<HTMLElement>(
            'input, textarea, select, button:not([data-close]), [tabindex="0"]',
          );
    (target ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose, focus]);
  return ref;
}
