import { describe, expect, it } from 'vitest';
import { NOW, tenant } from '../seed/base';
import { documents, policies } from '../seed/catalogue';
import { REVIEW_STATE_LABEL, documentReviewState, policyRenewalState } from './review';

const TZ = 'Europe/Berlin';
// 30 September 2026, 10:00 in Berlin.
const now = '2026-09-30T08:00:00.000Z';

describe('documentReviewState', () => {
  it('is overdue only when the next review date is before today', () => {
    const doc = (nextReview: string) => ({ status: 'approved' as const, nextReview });
    expect(documentReviewState(doc('2026-09-29'), now, TZ)).toBe('review-overdue');
    expect(documentReviewState(doc('2026-09-30'), now, TZ)).toBe('current');
    expect(documentReviewState(doc('2026-10-01'), now, TZ)).toBe('current');
  });

  it('uses the tenant calendar date, not the UTC one', () => {
    // 23:30 UTC on 29 September is already 30 September in Berlin.
    const late = '2026-09-29T23:30:00.000Z';
    expect(documentReviewState({ status: 'approved', nextReview: '2026-09-29' }, late, TZ)).toBe(
      'review-overdue',
    );
  });

  it('never marks a draft', () => {
    expect(documentReviewState({ status: 'draft', nextReview: '2020-01-01' }, now, TZ)).toBe(
      'current',
    );
  });
});

describe('policyRenewalState', () => {
  it('is expired only when the renewal date is before today', () => {
    const pol = (renewalDate: string) => ({ status: 'approved' as const, renewalDate });
    expect(policyRenewalState(pol('2026-09-29'), now, TZ)).toBe('renewal-expired');
    expect(policyRenewalState(pol('2026-09-30'), now, TZ)).toBe('current');
    expect(policyRenewalState({ status: 'draft', renewalDate: '2026-01-01' }, now, TZ)).toBe(
      'current',
    );
  });

  it('labels the states the way every screen shows them', () => {
    expect(REVIEW_STATE_LABEL['review-overdue']).toBe('Review overdue');
    expect(REVIEW_STATE_LABEL['renewal-expired']).toBe('Expired');
  });
});

describe('seeded review state', () => {
  const docState = (name: string) => {
    const d = documents.find((x) => x.name.startsWith(name))!;
    return [d.nextReview, documentReviewState(d, NOW, tenant.timeZone)];
  };

  it('gives the four named items their new state', () => {
    const policy = policies.find((p) => p.name === 'AI policy')!;
    expect([policy.renewalDate, policyRenewalState(policy, NOW, tenant.timeZone)]).toEqual([
      '2026-09-15',
      'renewal-expired',
    ]);
    expect(docState('Model card')).toEqual(['2026-03-12', 'review-overdue']);
    expect(docState('Kill switch runbook')).toEqual(['2026-09-12', 'review-overdue']);
    expect(docState('Serious incident playbook')).toEqual(['2026-09-11', 'review-overdue']);
  });
});
