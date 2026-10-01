import { describe, expect, it } from 'vitest';
import { pipelineStages, policyBundles } from '../seed/runtime';
import { BREACH_EFFECT, FALLBACK_EFFECT, blastRadius, breachTotals, stageHealth } from './health';
import type { PipelineStage } from './types';

const stage = (p50Ms: number, p95Ms: number, p99Ms: number): PipelineStage => ({
  id: 's',
  name: 'Stage',
  budgetMs: 20,
  p50Ms,
  p95Ms,
  p99Ms,
  breaches24h: 1,
  breaches7d: 4,
});

describe('stageHealth', () => {
  it('marks only the percentiles above the budget', () => {
    expect(stageHealth(stage(5, 15, 20)).over).toEqual([]);
    expect(stageHealth(stage(5, 21, 30)).over).toEqual(['p95', 'p99']);
    expect(stageHealth(stage(25, 30, 40)).over).toEqual(['p50', 'p95', 'p99']);
  });

  it('marks the seeded stages whose tail is over budget', () => {
    const over = pipelineStages.map(stageHealth).filter((s) => s.over.length > 0);
    expect(over.map((s) => [s.id, s.over])).toEqual([
      ['class-b', ['p99']],
      ['class-c', ['p99']],
    ]);
  });
});

describe('breachTotals', () => {
  it('sums the counters over all stages', () => {
    expect(breachTotals([stage(1, 1, 1), stage(1, 1, 1)])).toEqual({ last24h: 2, last7d: 8 });
    expect(breachTotals([])).toEqual({ last24h: 0, last7d: 0 });
  });
});

describe('blastRadius', () => {
  it('lists per class the breach behaviours its bundles declare', () => {
    const radius = blastRadius(policyBundles);
    expect(radius.map((r) => [r.class, r.behaviours.map((b) => b.breach)])).toEqual([
      ['A', ['fail-closed']],
      ['B', ['quarantine', 'fail-open']],
      ['C', ['quarantine']],
    ]);
    expect(radius[1]!.behaviours[1]).toEqual({
      breach: 'fail-open',
      effect: BREACH_EFFECT['fail-open'],
      bundleIds: ['PB-12'],
    });
  });

  it('leaves out bundles without a class', () => {
    const ids = blastRadius(policyBundles).flatMap((r) => r.behaviours.flatMap((b) => b.bundleIds));
    expect(ids).not.toContain('PB-13');
  });
});

describe('fallback wording', () => {
  it('says bypass creates no evidence and leaves a gap', () => {
    expect(FALLBACK_EFFECT.bypass).toContain('create no evidence records');
    expect(FALLBACK_EFFECT.bypass).toContain('gap');
    expect(FALLBACK_EFFECT['hard-stop']).toContain('refused');
  });
});
