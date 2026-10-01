import { describe, expect, it } from 'vitest';
import type { EvidenceRecord } from './types';
import { verifyRanges } from './verification';

function chain(seqs: number[]): EvidenceRecord[] {
  return seqs.map((seq, i) => ({
    seq,
    timestamp: '2026-09-30T08:00:00.000Z',
    tenantId: 't',
    eventType: 'request.allowed',
    endpoint: '/x',
    subjectId: 's',
    digest: 'd',
    prevHash: `h${seq - 1}`,
    hash: `h${seq}`,
    leafIndex: i % 4,
    batchId: Math.floor(i / 4),
    merkleRoot: `root${Math.floor(i / 4)}`,
    anchor: { provider: 'stub', token: `tok${seq}`, anchoredAt: '2026-09-30T08:00:00.000Z' },
  }));
}

describe('verifyRanges', () => {
  it('verifies an intact chain on all three layers', () => {
    const result = verifyRanges(chain([1, 2, 3, 4, 5, 6]), 3);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.ok)).toBe(true);
    expect(result[0]!.layers.map((l) => l.layer)).toEqual(['L1', 'L2', 'L3']);
  });

  it('reports a sequence gap in its range only', () => {
    const result = verifyRanges(chain([1, 2, 3, 4, 6, 7, 8, 9]), 3);
    expect(result.map((r) => r.ok)).toEqual([true, false, true]);
    expect(result[1]!.layers[0]!.message).toBe('gap detected at seq 5');
  });

  it('finds a gap at the start of a range from the record before it', () => {
    const result = verifyRanges(chain([1, 2, 3, 5, 6]), 3);
    expect(result[1]!.layers[0]!.message).toBe('gap detected at seq 4');
  });

  it('reports a broken hash link, a bad batch and a missing anchor', () => {
    const records = chain([1, 2, 3]);
    records[1]!.prevHash = 'other';
    records[2]!.merkleRoot = 'different';
    records[2]!.anchor.token = '';
    const [range] = verifyRanges(records, 3);
    expect(range!.layers.map((l) => l.message)).toEqual([
      'hash link broken at seq 2',
      'Merkle batch 0 does not match its root',
      'no timestamp anchor at seq 3',
    ]);
  });

  it('returns nothing for no records', () => {
    expect(verifyRanges([])).toEqual([]);
  });
});
