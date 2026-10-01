import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary:
    'bg-accent-600 text-white hover:bg-accent-700 disabled:bg-slate-300 disabled:text-slate-600',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 disabled:text-slate-500',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-300 disabled:text-slate-600',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-500',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: 'sm' | 'md';
}

export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: Props) {
  const sizing = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
