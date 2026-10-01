import { describe, expect, it } from 'vitest';
import { lastRun, nextRun, runAt, runSummary, zonedInstant } from './ledger-ops';
import type { EvidenceRecord, LedgerSchedule } from './types';

const TZ = 'Europe/Berlin';
const weekly: LedgerSchedule = { name: 'Weekly', weekday: 3, hour: 8, minute: 0 };

function records(seqs: number[], start: string): EvidenceRecord[] {
  return seqs.map((seq, i) => ({
    seq,
    timestamp: new Date(Date.parse(start) + i * 60_000).toISOString(),
    tenantId: 't',
    code: 'NAG-D001',
    endpoint: '/x',
    subjectId: 's',
    digest: 'd',
    prevHash: `h${seq - 1}`,
    hash: `h${seq}`,
    leafIndex: i,
    batchId: 1,
    merkleRoot: 'root',
    anchor: { provider: 'stub', token: `tok${seq}`, anchoredAt: start },
  }));
}

describe('zonedInstant', () => {
  it('turns tenant wall-clock time into UTC, in summer and in winter time', () => {
    expect(zonedInstant('2026-09-30', 8, 0, TZ)).toBe('2026-09-30T06:00:00.000Z');
    expect(zonedInstant('2026-12-02', 8, 0, TZ)).toBe('2026-12-02T07:00:00.000Z');
    expect(zonedInstant('2026-10-25', 8, 0, TZ)).toBe('2026-10-25T07:00:00.000Z');
  });
});

describe('schedule', () => {
  it('finds the last and the next run around a Wednesday morning', () => {
    const now = '2026-09-30T08:00:00.000Z';
    expect(lastRun(weekly, now, TZ)).toBe('2026-09-30T06:00:00.000Z');
    expect(nextRun(weekly, now, TZ)).toBe('2026-10-07T06:00:00.000Z');
  });

  it('counts a run at exactly now as the last one, and looks a week back before it', () => {
    expect(lastRun(weekly, '2026-09-30T06:00:00.000Z', TZ)).toBe('2026-09-30T06:00:00.000Z');
    expect(lastRun(weekly, '2026-09-30T05:59:00.000Z', TZ)).toBe('2026-09-23T06:00:00.000Z');
    expect(nextRun(weekly, '2026-09-30T05:59:00.000Z', TZ)).toBe('2026-09-30T06:00:00.000Z');
  });
});

describe('runAt', () => {
  const start = '2026-09-30T05:00:00.000Z';

  it('verifies only the records held at the run', () => {
    const all = records([1, 2, 3, 5, 6], start);
    const before = runAt(all, '2026-09-30T05:02:00.000Z');
    expect(before.records).toBe(3);
    expect(before.failing).toEqual([]);
    expect(runSummary(before)).toBe('Passed: 1 range');
    const after = runAt(all, '2026-09-30T06:00:00.000Z');
    expect(after.records).toBe(5);
    expect(after.failing.map((r) => r.layers[0]!.message)).toEqual(['gap detected at seq 4']);
    expect(runSummary(after)).toBe('Failed: 1 range (seq 1–6)');
  });

  it('names every failing range', () => {
    const seqs = Array.from({ length: 120 }, (_, i) => i + 1).filter((s) => s !== 10 && s !== 60);
    const run = runAt(records(seqs, start), '2026-10-01T00:00:00.000Z');
    expect(run.ranges).toHaveLength(3);
    expect(runSummary(run)).toBe('Failed: 2 ranges (seq 1–50, seq 51–100)');
  });
});
