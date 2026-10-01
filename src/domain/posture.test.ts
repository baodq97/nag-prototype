import { describe, expect, it } from 'vitest';
import { NOW, frameworkItems, tenant } from '../seed/base';
import { controls, tests } from '../seed/catalogue';
import {
  attentionBucket,
  attentionCounts,
  controlPostureByFramework,
  controlTestStatus,
  pct,
  postureTrend,
  testPassingPct,
  testStatusAt,
} from './posture';
import type { ComplianceTest } from './types';

const tz = tenant.timeZone;

function test(over: Partial<ComplianceTest>): ComplianceTest {
  return {
    id: 'T',
    name: 'T',
    description: '',
    ownerId: 'p',
    status: 'failing',
    failingEntities: [],
    dueDate: '2026-10-01',
    lastRunAt: NOW,
    slaDays: 7,
    integrationId: 'i',
    frameworkItemIds: [],
    remediation: [],
    history: [],
    comments: [],
    ...over,
  };
}

describe('attention buckets', () => {
  it('puts each failing test in one bucket by due date', () => {
    expect(attentionBucket(test({ dueDate: '2026-09-29' }), NOW, tz)).toBe('overdue');
    expect(attentionBucket(test({ dueDate: '2026-09-30' }), NOW, tz)).toBe('due-soon');
    expect(attentionBucket(test({ dueDate: '2026-10-14' }), NOW, tz)).toBe('due-soon');
    expect(attentionBucket(test({ dueDate: '2026-10-15' }), NOW, tz)).toBe('needs-remediation');
    expect(attentionBucket(test({ status: 'passing' }), NOW, tz)).toBeNull();
  });
});

describe('status over time', () => {
  it('is failing between failingSince and fixedAt', () => {
    const t = test({
      status: 'passing',
      failingSince: '2026-09-10T00:00:00.000Z',
      fixedAt: '2026-09-20T00:00:00.000Z',
    });
    expect(testStatusAt(t, '2026-09-09T00:00:00.000Z')).toBe('passing');
    expect(testStatusAt(t, '2026-09-15T00:00:00.000Z')).toBe('failing');
    expect(testStatusAt(t, '2026-09-21T00:00:00.000Z')).toBe('passing');
  });

  it('agrees with the seeded status at "now" for every test', () => {
    for (const t of tests) expect(testStatusAt(t, NOW)).toBe(t.status);
  });
});

it('returns 0 % for an empty set', () => {
  expect(pct(0, 0)).toBe(0);
});

// The figures on the posture overview, checked against the seeded fixture.
describe('posture figures from the seed', () => {
  it('% tests passing', () => {
    const passing = tests.filter((t) => t.status === 'passing').length;
    expect([passing, tests.length]).toEqual([31, 44]);
    expect(testPassingPct(tests)).toBe(70);
  });

  it('needs-attention counts', () => {
    expect(attentionCounts(tests, NOW, tz)).toEqual({
      overdue: 4,
      'due-soon': 5,
      'needs-remediation': 4,
    });
  });

  it('% controls passing per framework', () => {
    expect(controlPostureByFramework(controls, tests, frameworkItems)).toEqual([
      { framework: 'eu-ai-act', passing: 16, total: 27, pct: 59 },
      { framework: 'iso-42001', passing: 12, total: 22, pct: 55 },
    ]);
  });

  it('x/y tests passing for a control', () => {
    const byId = new Map(tests.map((t) => [t.id, t]));
    // CTL-10 maps TST-018 (passing) and TST-019 (failing).
    expect(controlTestStatus(controls[9]!, byId)).toEqual({ passing: 1, total: 2, ok: false });
  });

  it('30-day trend ends at today and matches the current figure', () => {
    const trend = postureTrend(tests, NOW);
    expect(trend).toHaveLength(30);
    expect(trend.at(-1)).toEqual({ date: '2026-09-30', passingPct: 70 });
    expect(trend[0]).toEqual({ date: '2026-09-01', passingPct: 100 });
  });
});
