import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { useDialog } from './useDialog';

/** A panel that slides over the right side of the screen. */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            {subtitle && <p className="text-xs font-medium text-slate-600">{subtitle}</p>}
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            data-close
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="flex flex-col gap-4 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
