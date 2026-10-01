import { describe, expect, it } from 'vitest';
import { NOW, tenant } from '../seed/base';
import {
  appliesTo,
  attentionFor,
  coverageStatus,
  dateChip,
  datesForPath,
  dutyLabel,
  incidentClock,
  owedBy,
  rowOwedBy,
  strictestClock,
} from './aiact';
import type { ApplicationDate, ArticleRow, Duty } from './types';

const must: Duty = { kind: 'must' };
const onlyIf: Duty = { kind: 'only-if', condition: 'it is high-risk' };
const na: Duty = { kind: 'not-applicable' };

const row = (over: Partial<ArticleRow>) => ({
  group: 'B' as const,
  riskTiers: ['high' as const],
  provider: must,
  deployer: na,
  ...over,
});

describe('coverageStatus', () => {
  it.each([
    ['control', [true, true], 2, 'covered'],
    ['control', [true, false], 2, 'needs-attention'],
    ['control', [true], 0, 'shared'],
    ['control', [], 0, 'shared'],
    ['supports', [true], 1, 'shared'],
    ['supports', [], 0, 'shared'],
    ['supports', [false], 1, 'needs-attention'],
    ['outside', [false], 0, 'outside'],
    ['outside', [], 0, 'outside'],
  ] as const)('%s with controls %j and %i tests is %s', (role, oks, tests, expected) => {
    expect(coverageStatus(role, [...oks], tests)).toBe(expected);
  });
});

describe('attentionFor', () => {
  const failing = new Set(['T2', 'T4']);
  const isFailing = (id: string) => failing.has(id);

  it('names the first failing control and its first failing test', () => {
    const controls = [
      { id: 'C1', testIds: ['T1'] },
      { id: 'C2', testIds: ['T3', 'T4', 'T2'] },
      { id: 'C3', testIds: ['T2'] },
    ];
    expect(attentionFor(controls, isFailing)).toEqual({ controlId: 'C2', testId: 'T4' });
  });

  it('prefers a failing test that is linked to the row itself', () => {
    const controls = [
      { id: 'C1', testIds: ['T4'] },
      { id: 'C2', testIds: ['T1', 'T2'] },
    ];
    expect(attentionFor(controls, isFailing, ['T2'])).toEqual({ controlId: 'C2', testId: 'T2' });
    expect(attentionFor(controls, isFailing, ['T1'])).toEqual({ controlId: 'C1', testId: 'T4' });
  });

  it('is undefined while every linked control passes, or none is linked', () => {
    expect(attentionFor([{ id: 'C1', testIds: ['T1', 'T3'] }], isFailing)).toBeUndefined();
    expect(attentionFor([], isFailing)).toBeUndefined();
  });
});

describe('duties', () => {
  it('labels each kind of duty', () => {
    expect(dutyLabel(must)).toBe('Must');
    expect(dutyLabel(onlyIf)).toBe('Only if it is high-risk');
    expect(dutyLabel(na)).toBe('Not applicable');
  });

  it('lists who owes a row and filters by role', () => {
    expect(owedBy(row({}))).toEqual(['provider']);
    expect(owedBy(row({ provider: na, deployer: onlyIf }))).toEqual(['deployer']);
    expect(rowOwedBy(row({}), 'provider')).toBe(true);
    expect(rowOwedBy(row({}), 'deployer')).toBe(false);
    expect(rowOwedBy(row({}), 'both')).toBe(true);
    expect(rowOwedBy(row({ provider: na }), 'both')).toBe(false);
  });
});

describe('appliesTo', () => {
  const high = { riskTier: 'high' as const, transparency: false, roles: ['deployer' as const] };

  it('needs a matching risk tier and a role that owes the row', () => {
    expect(appliesTo(row({ deployer: must }), high)).toBe(true);
    expect(appliesTo(row({ deployer: onlyIf }), high)).toBe(true);
    expect(appliesTo(row({}), high)).toBe(false);
    expect(appliesTo(row({ deployer: must, riskTiers: ['minimal'] }), high)).toBe(false);
  });

  it('adds transparency rows for a system with a transparency trigger', () => {
    const t = row({ group: 'T', riskTiers: ['transparency'], deployer: must });
    expect(appliesTo(t, high)).toBe(false);
    expect(appliesTo(t, { ...high, transparency: true })).toBe(true);
    expect(
      appliesTo(row({ deployer: must, riskTiers: ['minimal'] }), { ...high, transparency: true }),
    ).toBe(false);
  });

  it('applies nothing to a system outside the Act', () => {
    expect(appliesTo(row({ deployer: must }), { ...high, riskTier: null })).toBe(false);
  });
});

describe('application dates', () => {
  const both: ApplicationDate[] = [
    { date: '2027-12-02', path: 'annex-iii' },
    { date: '2028-08-02', path: 'annex-i' },
  ];

  it('shows both high-risk dates in general and only the system path date for a system', () => {
    expect(datesForPath(both)).toEqual(both);
    expect(datesForPath(both, 'annex-iii').map((d) => d.date)).toEqual(['2027-12-02']);
    expect(datesForPath(both, 'annex-i').map((d) => d.date)).toEqual(['2028-08-02']);
    expect(datesForPath([{ date: '2025-02-02' }], 'annex-i')).toEqual([{ date: '2025-02-02' }]);
    expect(datesForPath([both[1]!], 'annex-iii')).toEqual([both[1]]);
  });

  it('says "Applies now" on the day of now and "From" the day after', () => {
    expect(dateChip('2026-09-30', NOW, tenant.timeZone)).toEqual({
      appliesNow: true,
      label: 'Applies now',
    });
    expect(dateChip('2025-02-02', NOW, tenant.timeZone).label).toBe('Applies now');
    expect(dateChip('2026-10-01', NOW, tenant.timeZone)).toEqual({
      appliesNow: false,
      label: 'From 2026-10-01',
    });
  });
});

describe('incident clocks', () => {
  it('gives 2, 10 and 15 days from the day of awareness', () => {
    expect(incidentClock('widespread-or-critical', '2026-09-30')).toEqual({
      kind: 'widespread-or-critical',
      days: 2,
      reportBy: '2026-10-02',
    });
    expect(incidentClock('death', '2026-09-30').reportBy).toBe('2026-10-10');
    expect(incidentClock('serious', '2026-09-30').reportBy).toBe('2026-10-15');
  });

  it('picks the shortest clock when several kinds match', () => {
    expect(strictestClock(['serious', 'death'], '2026-09-30')?.days).toBe(10);
    expect(strictestClock(['serious', 'widespread-or-critical', 'death'], '2026-09-30')?.days).toBe(
      2,
    );
    expect(strictestClock([], '2026-09-30')).toBeNull();
  });
});
