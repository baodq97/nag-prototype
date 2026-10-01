import { controlTestStatus } from './posture';
import { documentReviewState, policyRenewalState } from './review';
import type {
  ComplianceDocument,
  ComplianceTest,
  Control,
  Policy,
  RangeVerification,
  TrustCategory,
  TrustEntry,
  TrustRef,
  TrustStatus,
} from './types';

/** The console state a public claim is checked against. */
export interface ClaimContext {
  controls: Map<string, Control>;
  tests: Map<string, ComplianceTest>;
  documents: Map<string, ComplianceDocument>;
  policies: Map<string, Policy>;
  ranges: RangeVerification[];
  now: string;
  timeZone: string;
}

export interface ClaimResult {
  status: TrustStatus;
  /** Why the claim is not in place, one line per failing reference; empty when it is. */
  reasons: string[];
}

export interface DerivedEntry extends TrustEntry, ClaimResult {}

export interface DerivedCategory {
  id: string;
  name: string;
  entries: DerivedEntry[];
}

/**
 * What is wrong with one reference; empty when it holds. A control holds only when its tests
 * pass and the documents and policies it links hold too, so a claim cannot read "In place"
 * while the console shows one of them past its date.
 */
function refProblems(ref: TrustRef, ctx: ClaimContext): string[] {
  switch (ref.kind) {
    case 'verification': {
      const failing = ctx.ranges.filter((r) => !r.ok);
      return failing.length === 0
        ? []
        : [
            `Evidence verification fails in ${failing.map((r) => `seq ${r.fromSeq}–${r.toSeq}`).join(', ')}`,
          ];
    }
    case 'control': {
      const control = ctx.controls.get(ref.id);
      if (!control) return [`${ref.id} is not in the console`];
      const s = controlTestStatus(control, ctx.tests);
      return [
        ...(s.ok ? [] : [`${ref.id}: ${s.total - s.passing} of ${s.total} tests failing`]),
        ...control.documentIds.flatMap((id) => refProblems({ kind: 'document', id }, ctx)),
        ...control.policyIds.flatMap((id) => refProblems({ kind: 'policy', id }, ctx)),
      ];
    }
    case 'document': {
      const doc = ctx.documents.get(ref.id);
      if (!doc) return [`${ref.id} is not in the console`];
      if (doc.status !== 'approved') return [`${ref.id} is not approved`];
      return documentReviewState(doc, ctx.now, ctx.timeZone) === 'current'
        ? []
        : [`${ref.id}: review overdue since ${doc.nextReview}`];
    }
    case 'policy': {
      const policy = ctx.policies.get(ref.id);
      if (!policy) return [`${ref.id} is not in the console`];
      if (policy.status !== 'approved') return [`${ref.id} is not approved`];
      return policyRenewalState(policy, ctx.now, ctx.timeZone) === 'current'
        ? []
        : [`${ref.id}: renewal date ${policy.renewalDate} has passed`];
    }
  }
}

/**
 * A claim is "In place" only when every object it references holds; one that does not shows
 * "Under remediation", even when it is marked planned, so the flag cannot hide a failing
 * check. A planned claim whose references all hold stays "In progress". A claim without
 * references can never be in place.
 */
export function claimStatus(entry: TrustEntry, ctx: ClaimContext): ClaimResult {
  if (entry.refs.length === 0) {
    return { status: 'under-remediation', reasons: ['No console object backs this claim'] };
  }
  // A document or policy reached through two references is named once.
  const reasons = [...new Set(entry.refs.flatMap((ref) => refProblems(ref, ctx)))];
  if (reasons.length > 0) return { status: 'under-remediation', reasons };
  return { status: entry.planned ? 'in-progress' : 'in-place', reasons };
}

export function deriveTrust(categories: TrustCategory[], ctx: ClaimContext): DerivedCategory[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    entries: c.entries.map((e) => ({ ...e, ...claimStatus(e, ctx) })),
  }));
}
