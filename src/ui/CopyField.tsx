import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** A snippet in monospace with a copy button. Copying uses the local clipboard only. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
  };
  return (
    <figure className="overflow-hidden rounded-md border border-slate-200">
      <figcaption className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
        {label}
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-accent-700 hover:bg-white"
        >
          {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre className="overflow-x-auto bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
        {value}
      </pre>
    </figure>
  );
}
