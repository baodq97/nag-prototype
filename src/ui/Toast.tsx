import { CircleCheck } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { TOAST_MS, ToastContext } from './useToast';

/** Holds the one visible toast for the console; a new toast replaces the current one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const show = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="fixed right-6 bottom-6 z-[60]">
        {toast && (
          <p
            key={toast.id}
            data-testid="toast"
            className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
          >
            <CircleCheck size={16} aria-hidden className="text-emerald-300" />
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
