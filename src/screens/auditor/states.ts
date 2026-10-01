import { documentReview, documents, getItems, policies, policyRenewal } from '../../data';
import type { Audit, AuditItemState, FrameworkId, ReviewState } from '../../domain/types';

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

/** An approved document or policy that has passed its review or renewal date. */
export interface StaleRecord {
  kind: 'Document' | 'Policy';
  id: string;
  name: string;
  state: ReviewState;
  /** "Next review" or "Renewal". */
  dateLabel: string;
  date: string;
}

/**
 * The documents and policies that cover an item of this framework and are past their date.
 * The state comes from the review selectors; nothing is derived here.
 */
export function staleRecords(framework: FrameworkId): StaleRecord[] {
  const covers = (ids: string[]) => getItems(ids).some((i) => i.framework === framework);
  const docs = documents
    .filter((d) => covers(d.frameworkItemIds) && documentReview(d) !== 'current')
    .map((d): StaleRecord => ({
      kind: 'Document',
      id: d.id,
      name: d.name,
      state: documentReview(d),
      dateLabel: 'Next review',
      date: d.nextReview,
    }));
  const pols = policies
    .filter((p) => covers(p.frameworkItemIds) && policyRenewal(p) !== 'current')
    .map((p): StaleRecord => ({
      kind: 'Policy',
      id: p.id,
      name: p.name,
      state: policyRenewal(p),
      dateLabel: 'Renewal',
      date: p.renewalDate,
    }));
  return [...docs, ...pols];
}
