import { daysUntil } from './time';
import type { ComplianceDocument, Policy, ReviewState } from './types';

/**
 * Whether an approved item has passed its date: a date before today has passed, a date of
 * today has not. Drafts are not judged on their dates and always read as current.
 */
function passed(
  status: 'draft' | 'approved',
  date: string,
  now: string,
  timeZone: string,
): boolean {
  return status === 'approved' && daysUntil(date, now, timeZone) < 0;
}

/** "Review overdue" once an approved document's next review date has passed. */
export function documentReviewState(
  doc: Pick<ComplianceDocument, 'status' | 'nextReview'>,
  now: string,
  timeZone: string,
): ReviewState {
  return passed(doc.status, doc.nextReview, now, timeZone) ? 'review-overdue' : 'current';
}

/** "Expired" once an approved policy's renewal date has passed. */
export function policyRenewalState(
  policy: Pick<Policy, 'status' | 'renewalDate'>,
  now: string,
  timeZone: string,
): ReviewState {
  return passed(policy.status, policy.renewalDate, now, timeZone) ? 'renewal-expired' : 'current';
}

/** The label each state shows wherever it appears: tables, drawers, filters and search. */
export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  current: 'Current',
  'review-overdue': 'Review overdue',
  'renewal-expired': 'Expired',
};
