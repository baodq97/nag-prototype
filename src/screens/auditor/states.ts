import type { Audit, AuditItemState } from '../../domain/types';

/** The five evidence states, in the order the tracker shows them. */
export const STATE_ORDER: AuditItemState[] = [
  'not-ready',
  'flagged',
  'ready',
  'accepted',
  'not-applicable',
];

export function countStates(audit: Audit): Record<AuditItemState, number> {
  const counts: Record<AuditItemState, number> = {
    'not-ready': 0,
    flagged: 0,
    ready: 0,
    accepted: 0,
    'not-applicable': 0,
  };
  for (const r of audit.requests) counts[r.state] += 1;
  return counts;
}
