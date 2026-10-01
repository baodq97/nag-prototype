// The one shared set of status chip variants (five), and how domain statuses map onto them.

export type ChipVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export const CHIP_CLASSES: Record<ChipVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  info: 'bg-accent-50 text-accent-800 ring-accent-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const VARIANT_OF: Record<string, ChipVariant> = {
  passing: 'success',
  failing: 'danger',
  overdue: 'danger',
  'due-soon': 'warning',
  'needs-remediation': 'warning',
  connected: 'success',
  error: 'danger',
  'not-connected': 'neutral',
  approved: 'success',
  draft: 'neutral',
  covered: 'success',
  'needs-attention': 'warning',
  shared: 'info',
  outside: 'neutral',
  partial: 'warning',
  customer: 'info',
  verified: 'success',
  loaded: 'success',
  rejected: 'danger',
  primary: 'info',
  secondary: 'warning',
  manager: 'danger',
  expired: 'neutral',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
  open: 'warning',
  'in-treatment': 'info',
  accepted: 'success',
  closed: 'neutral',
  'not-ready': 'neutral',
  flagged: 'danger',
  ready: 'info',
  'not-applicable': 'neutral',
  'in-place': 'success',
  'in-progress': 'warning',
  active: 'danger',
  inactive: 'success',
  success: 'success',
  cancelled: 'warning',
  abandoned: 'neutral',
  runtime: 'info',
  template: 'neutral',
  current: 'success',
  'review-overdue': 'danger',
  'renewal-expired': 'danger',
  'under-remediation': 'danger',
  'half-open': 'warning',
  'hard-stop': 'info',
  bypass: 'warning',
};

/** Statuses whose label is not their humanized key. */
const LABEL_OF: Record<string, string> = {
  'renewal-expired': 'Expired',
};

export function variantOf(status: string): ChipVariant {
  return VARIANT_OF[status] ?? 'neutral';
}

/** "needs-remediation" → "Needs remediation". */
export function humanize(status: string): string {
  const label = LABEL_OF[status];
  if (label) return label;
  const text = status.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
