import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { useDialog } from './useDialog';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${width} rounded-lg bg-white shadow-xl`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            data-close
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
          >
            <X size={16} aria-hidden />
          </button>
        </header>
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
