import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';

const CONTROL =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600';

interface FieldProps {
  label: string;
  /** Shown under the control; announced with it. */
  hint?: ReactNode;
  error?: ReactNode;
}

function Frame({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, { hint, error }: FieldProps): string | undefined {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}

export function TextField({
  label,
  hint,
  error,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={CONTROL}
        aria-describedby={describedBy(id, { label, hint, error })}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </Frame>
  );
}

export function TextArea({
  label,
  hint,
  error,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        className={CONTROL}
        aria-describedby={describedBy(id, { label, hint, error })}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </Frame>
  );
}

export function SelectField({
  label,
  hint,
  error,
  options,
  ...rest
}: FieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={CONTROL}
        aria-describedby={describedBy(id, { label, hint, error })}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Frame>
  );
}

/** An on/off switch with a label; `hideLabel` keeps it only as the accessible name. */
export function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hideLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-slate-800 disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-accent-600' : 'bg-slate-400'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4.5' : 'left-0.5'}`}
        />
      </span>
      {hideLabel ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}
