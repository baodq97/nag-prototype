import { describe, expect, it } from 'vitest';
import { ERASURE_SUBJECTS, MISSING_SEQ, evidence } from '../seed/runtime';
import { erasureLayers, erasureSummary, rangeText } from './erasure';
import { verifyRanges } from './verification';

const ranges = verifyRanges(evidence);

describe('erasureLayers on the seed', () => {
  it('reports the gap at seq 137 for a subject with a record in 101–150', () => {
    const e = erasureLayers(ERASURE_SUBJECTS.withGap, evidence, ranges);
    expect(e.allVerify).toBe(false);
    const failing = e.ranges.find((r) => !r.ok)!;
    expect([failing.fromSeq, failing.toSeq]).toEqual([101, 150]);
    expect(e.ranges.every((r) => r.records > 0)).toBe(true);
    expect(e.records).toBe(e.ranges.reduce((n, r) => n + r.records, 0));

    const summary = erasureSummary(e);
    expect(summary).toContain('in seq 101–150 the hash chain layer fails');
    expect(summary).toContain(`gap detected at seq ${MISSING_SEQ}`);
    expect(summary).toContain('already there before the erasure');
    expect(summary).not.toContain('all 3 layers still verify');

    expect(rangeText(failing)).toBe(
      `seq 101–150 (${failing.records} records): L1 (hash chain) fails: gap detected at seq 137; L2 (Merkle batch) verifies; L3 (timestamp anchor) verifies`,
    );
  });

  it('says all layers verify for a subject whose ranges all verify', () => {
    const e = erasureLayers(ERASURE_SUBJECTS.clean, evidence, ranges);
    expect(e.allVerify).toBe(true);
    expect(e.ranges.some((r) => r.fromSeq === 101)).toBe(false);
    expect(erasureSummary(e)).toBe(
      `${e.records} records remain countable; all 3 layers still verify in every range that holds them`,
    );
  });

  it('reads the same verification result for every range the evidence screen shows', () => {
    const e = erasureLayers(ERASURE_SUBJECTS.withGap, evidence, ranges);
    for (const r of e.ranges) {
      const shown = ranges.find((x) => x.fromSeq === r.fromSeq)!;
      expect(r.layers).toEqual(shown.layers);
    }
  });
});

describe('erasureSummary wording', () => {
  const layer = (ok: boolean) => [
    { layer: 'L1' as const, ok, message: ok ? 'hash chain verified' : 'gap detected at seq 7' },
    { layer: 'L2' as const, ok: true, message: 'ok' },
    { layer: 'L3' as const, ok: true, message: 'ok' },
  ];

  it('uses the singular for one record and the plural for several failing ranges', () => {
    const one = {
      subjectId: 's',
      records: 1,
      ranges: [{ fromSeq: 1, toSeq: 50, ok: true, layers: layer(true), records: 1 }],
      allVerify: true,
    };
    expect(erasureSummary(one)).toMatch(/^1 record remains countable/);
    expect(rangeText(one.ranges[0]!)).toMatch(/^seq 1–50 \(1 record\)/);

    const two = {
      subjectId: 's',
      records: 2,
      ranges: [
        { fromSeq: 1, toSeq: 50, ok: false, layers: layer(false), records: 1 },
        { fromSeq: 51, toSeq: 100, ok: false, layers: layer(false), records: 1 },
      ],
      allVerify: false,
    };
    expect(erasureSummary(two)).toContain('These failures were already there');
  });

  it('returns no ranges for an unknown subject', () => {
    expect(erasureLayers('subj-none', evidence, ranges)).toEqual({
      subjectId: 'subj-none',
      records: 0,
      ranges: [],
      allVerify: true,
    });
  });
});
