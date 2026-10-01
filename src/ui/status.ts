// The one status registry: every status key's word, icon, chip variant and one plain sentence
// describing it. Every chip on every screen reads it, so a key looks the same everywhere.

import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleMinus,
  CircleX,
  Clock,
  Hourglass,
  Info,
  type LucideIcon,
  OctagonX,
  Split,
  TriangleAlert,
  Unplug,
} from 'lucide-react';

export type ChipVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export const CHIP_CLASSES: Record<ChipVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  info: 'bg-accent-50 text-accent-800 ring-accent-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

/** The icon a chip shows when its status key is not in the registry. */
export const VARIANT_ICON: Record<ChipVariant, LucideIcon> = {
  success: CircleCheck,
  danger: CircleX,
  warning: TriangleAlert,
  info: Info,
  neutral: CircleMinus,
};

export interface StatusInfo {
  label: string;
  icon: LucideIcon;
  variant: ChipVariant;
  description: string;
}

type Entry = [variant: ChipVariant, description: string, icon?: LucideIcon, label?: string];

const REGISTRY: Record<string, Entry> = {
  passing: ['success', 'The latest run of this check passed.'],
  failing: ['danger', 'The latest run of this check failed and needs a fix.'],
  overdue: ['danger', 'The fix is past its due date.', Clock],
  'due-soon': ['warning', 'The fix is due within the next 14 days.', Hourglass],
  'needs-remediation': ['warning', 'A linked test fails and the fix is not yet overdue.'],
  connected: ['success', 'The source is connected and sending heartbeats.'],
  error: ['danger', 'The source stopped sending data and needs a fix.', OctagonX],
  'not-connected': ['neutral', 'The source is available but has not been connected.', Unplug],
  approved: ['success', 'Every required approver has signed this version.'],
  draft: ['neutral', 'This version is still being written and is not approved.', CircleDashed],
  covered: ['success', 'NAG checks this duty and its linked tests pass.'],
  'needs-attention': ['warning', 'A linked control has a failing test that needs a fix.'],
  shared: [
    'info',
    'NAG and the customer split this duty: NAG does part, you keep the rest.',
    Split,
  ],
  outside: ['neutral', 'NAG does not cover this duty; it stays fully with the customer.'],
  partial: ['warning', 'Only part of the duty is covered.'],
  customer: ['info', 'The customer carries this duty.'],
  verified: ['success', 'All three integrity layers check out for this range.'],
  loaded: ['success', 'The bundle is loaded and applies to traffic.'],
  rejected: ['danger', 'The item was refused and does not apply.', Ban],
  primary: ['info', 'The first reviewer in the escalation chain holds the item.', CircleDot],
  secondary: ['warning', 'The item moved to the second reviewer after a timeout.', CircleDot],
  manager: ['danger', 'The item escalated to the manager after two timeouts.', CircleDot],
  expired: ['neutral', 'The time to decide ran out and the default decision applied.', Clock],
  high: ['danger', 'High severity: handle first.'],
  medium: ['warning', 'Medium severity.'],
  low: ['neutral', 'Low severity.'],
  open: ['warning', 'Still open and waiting for action.'],
  'in-treatment': ['info', 'A treatment is under way.'],
  accepted: ['success', 'Accepted by the responsible person.'],
  closed: ['neutral', 'Closed; no further action.'],
  'not-ready': ['neutral', 'Not ready for the auditor yet.', CircleDashed],
  flagged: ['danger', 'The auditor flagged this item for follow-up.'],
  ready: ['info', 'Ready for the auditor to review.'],
  'not-applicable': ['neutral', 'Does not apply here.'],
  'in-place': ['success', 'The measure is in place.'],
  'in-progress': ['warning', 'Work on this measure is under way.', Hourglass],
  active: ['danger', 'The kill switch is active and AI traffic is stopped.'],
  inactive: ['success', 'The kill switch is off and traffic flows.'],
  success: ['success', 'The call ended successfully.'],
  cancelled: ['warning', 'The call was cancelled before it ended.'],
  abandoned: ['neutral', 'The call was left without an outcome.'],
  runtime: ['info', 'Content generated from runtime evidence.'],
  template: ['neutral', 'Content comes from a template.'],
  current: ['success', 'The review is up to date.'],
  'review-overdue': ['danger', 'The scheduled review is past due.', Clock],
  'renewal-expired': ['danger', 'The renewal date has passed.', Clock, 'Expired'],
  'under-remediation': ['danger', 'A known problem is being fixed.'],
  'half-open': ['warning', 'The breaker lets a few test requests through.'],
  'hard-stop': ['info', 'Requests fail when NAG is unreachable.'],
  bypass: ['warning', 'Requests skip NAG when it is unreachable.'],
};

/** "needs-remediation" → "Needs remediation". */
export function humanize(status: string): string {
  const label = REGISTRY[status]?.[3];
  if (label) return label;
  const text = status.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function variantOf(status: string): ChipVariant {
  return REGISTRY[status]?.[0] ?? 'neutral';
}

/** Word, icon, variant and description of a status key; unknown keys get a neutral entry. */
export function statusInfo(status: string): StatusInfo {
  const [variant, description, icon, label] = REGISTRY[status] ?? ['neutral', ''];
  return {
    label: label ?? humanize(status),
    icon: icon ?? VARIANT_ICON[variant],
    variant,
    description,
  };
}

/** Every key the registry knows, for the registry's own tests. */
export const STATUS_KEYS = Object.keys(REGISTRY);
