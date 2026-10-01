import { describe, expect, it } from 'vitest';
import { NOW, tenant } from '../seed/base';
import { controls, documents, policies, tests } from '../seed/catalogue';
import { trustCategories } from '../seed/governance';
import { evidence } from '../seed/runtime';
import { type ClaimContext, claimStatus, deriveTrust } from './claims';
import type { ComplianceTest, Control, RangeVerification } from './types';
import { verifyRanges } from './verification';

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

const seedContext: ClaimContext = {
  controls: byId(controls),
  tests: byId(tests),
  documents: byId(documents),
  policies: byId(policies),
  ranges: verifyRanges(evidence),
  now: NOW,
  timeZone: tenant.timeZone,
};

const okRange: RangeVerification = { fromSeq: 1, toSeq: 50, ok: true, layers: [] };

function context(over: Partial<ClaimContext> = {}): ClaimContext {
  const test = { id: 'T1', status: 'passing' } as ComplianceTest;
  const control = { id: 'C1', testIds: ['T1'] } as Control;
  return {
    controls: byId([control]),
    tests: byId([test]),
    documents: byId([
      { ...documents[0]!, id: 'D1', status: 'approved', nextReview: '2026-09-30' },
      { ...documents[0]!, id: 'D2', status: 'draft', nextReview: '2027-01-01' },
    ]),
    policies: byId([
      { ...policies[0]!, id: 'P1', status: 'approved', renewalDate: '2026-12-31' },
      { ...policies[0]!, id: 'P2', status: 'approved', renewalDate: '2026-09-29' },
    ]),
    ranges: [okRange],
    now: NOW,
    timeZone: tenant.timeZone,
    ...over,
  };
}

describe('claimStatus', () => {
  it('is in place when every referenced object holds', () => {
    const entry = {
      name: 'x',
      refs: [
        { kind: 'control' as const, id: 'C1' },
        { kind: 'document' as const, id: 'D1' },
        { kind: 'policy' as const, id: 'P1' },
        { kind: 'verification' as const },
      ],
    };
    expect(claimStatus(entry, context())).toEqual({ status: 'in-place', reasons: [] });
  });

  it('is under remediation when a test fails, an item is stale or a draft, or a range fails', () => {
    const failing = context({
      tests: byId([{ id: 'T1', status: 'failing' } as ComplianceTest]),
      ranges: [okRange, { fromSeq: 51, toSeq: 100, ok: false, layers: [] }],
    });
    const entry = {
      name: 'x',
      refs: [
        { kind: 'control' as const, id: 'C1' },
        { kind: 'document' as const, id: 'D2' },
        { kind: 'policy' as const, id: 'P2' },
        { kind: 'verification' as const },
      ],
    };
    expect(claimStatus(entry, failing)).toEqual({
      status: 'under-remediation',
      reasons: [
        'C1: 1 of 1 tests failing',
        'D2 is not approved',
        'P2: renewal date 2026-09-29 has passed',
        'Evidence verification fails in seq 51–100',
      ],
    });
  });

  it('flags overdue documents, unapproved policies and unknown references', () => {
    const ctx = context({
      documents: byId([
        { ...documents[0]!, id: 'D1', status: 'approved', nextReview: '2026-01-01' },
      ]),
      policies: byId([{ ...policies[0]!, id: 'P1', status: 'draft' }]),
    });
    const refs = [
      { kind: 'document' as const, id: 'D1' },
      { kind: 'policy' as const, id: 'P1' },
      { kind: 'control' as const, id: 'C9' },
      { kind: 'document' as const, id: 'D9' },
      { kind: 'policy' as const, id: 'P9' },
    ];
    expect(claimStatus({ name: 'x', refs }, ctx).reasons).toEqual([
      'D1: review overdue since 2026-01-01',
      'P1 is not approved',
      'C9 is not in the console',
      'D9 is not in the console',
      'P9 is not in the console',
    ]);
  });

  it('keeps planned claims in progress and never trusts a claim without references', () => {
    const refs = [{ kind: 'control' as const, id: 'C1' }];
    expect(claimStatus({ name: 'x', refs, planned: true }, context()).status).toBe('in-progress');
    expect(claimStatus({ name: 'x', refs: [], planned: true }, context()).status).toBe(
      'under-remediation',
    );
    expect(claimStatus({ name: 'x', refs: [] }, context()).status).toBe('under-remediation');
  });

  it('lets a failing reference win over the planned flag', () => {
    const failing = context({ tests: byId([{ id: 'T1', status: 'failing' } as ComplianceTest]) });
    const entry = { name: 'x', refs: [{ kind: 'control' as const, id: 'C1' }], planned: true };
    expect(claimStatus(entry, failing)).toEqual({
      status: 'under-remediation',
      reasons: ['C1: 1 of 1 tests failing'],
    });
  });
});

describe('seeded trust page', () => {
  const entries = deriveTrust(trustCategories, seedContext).flatMap((c) => c.entries);
  const status = (name: string) => entries.find((e) => e.name === name)!.status;

  it('gives every entry at least one reference that resolves', () => {
    for (const e of entries) {
      expect(e.refs.length, e.name).toBeGreaterThan(0);
      for (const r of e.refs) {
        if (r.kind === 'verification') continue;
        const list = { control: controls, policy: policies, document: documents }[r.kind];
        expect(
          list.some((x) => x.id === r.id),
          `${e.name} → ${r.id}`,
        ).toBe(true);
      }
    }
  });

  it('does not show the failing claims as in place', () => {
    expect(status('Human review of uncertain output')).toBe('under-remediation');
    expect(status('Prompt-injection screening')).toBe('under-remediation');
    expect(status('Tamper-evident records with three integrity layers')).toBe('under-remediation');
    expect(status('AI policy approved by leadership')).toBe('under-remediation');
    expect(status('MCP server allow-list')).toBe('under-remediation');
    expect(status('Independent timestamp anchoring')).toBe('under-remediation');
    expect(entries.filter((e) => e.status === 'under-remediation')).toHaveLength(6);
  });

  it('names the gap, the failing tests and the passed renewal as reasons', () => {
    const reasons = (name: string) => entries.find((e) => e.name === name)!.reasons;
    expect(reasons('Tamper-evident records with three integrity layers')).toContain(
      'Evidence verification fails in seq 101–150',
    );
    expect(reasons('AI policy approved by leadership')).toEqual([
      'POL-01: renewal date 2026-09-15 has passed',
    ]);
    expect(reasons('Human review of uncertain output')).toEqual(['CTL-10: 1 of 2 tests failing']);
    expect(reasons('MCP server allow-list')).toEqual(['CTL-14: 2 of 2 tests failing']);
  });
});
