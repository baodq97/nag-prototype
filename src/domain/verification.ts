import type { EvidenceRecord, LayerResult, RangeVerification } from './types';

export const RANGE_SIZE = 50;

// The seed carries the outcome; this reads it the way a verifier would, without real
// cryptography: the chain must be unbroken, leaves must be contiguous per batch, and every
// record must carry an anchor.

function chainLayer(records: EvidenceRecord[], before?: EvidenceRecord): LayerResult {
  let prev = before;
  for (const r of records) {
    if (prev && r.seq !== prev.seq + 1) {
      return { layer: 'L1', ok: false, message: `gap detected at seq ${prev.seq + 1}` };
    }
    if (prev && r.prevHash !== prev.hash) {
      return { layer: 'L1', ok: false, message: `hash link broken at seq ${r.seq}` };
    }
    prev = r;
  }
  return { layer: 'L1', ok: true, message: 'hash chain verified' };
}

function merkleLayer(records: EvidenceRecord[]): LayerResult {
  const batches = new Map<number, EvidenceRecord[]>();
  for (const r of records) batches.set(r.batchId, [...(batches.get(r.batchId) ?? []), r]);
  for (const [batchId, leaves] of batches) {
    const roots = new Set(leaves.map((l) => l.merkleRoot));
    const contiguous = leaves.every(
      (l, i) => i === 0 || l.leafIndex === leaves[i - 1]!.leafIndex + 1,
    );
    if (roots.size !== 1 || !contiguous) {
      return { layer: 'L2', ok: false, message: `Merkle batch ${batchId} does not match its root` };
    }
  }
  return { layer: 'L2', ok: true, message: `${batches.size} Merkle batch(es) match their roots` };
}

function anchorLayer(records: EvidenceRecord[]): LayerResult {
  const missing = records.find((r) => !r.anchor.token);
  return missing
    ? { layer: 'L3', ok: false, message: `no timestamp anchor at seq ${missing.seq}` }
    : { layer: 'L3', ok: true, message: 'timestamp anchors present (stub authority)' };
}

/** Verification per range of sequence numbers, each with its three layers. */
export function verifyRanges(records: EvidenceRecord[], size = RANGE_SIZE): RangeVerification[] {
  const sorted = [...records].sort((a, b) => a.seq - b.seq);
  if (sorted.length === 0) return [];
  const last = sorted[sorted.length - 1]!.seq;
  const result: RangeVerification[] = [];
  for (let from = 1; from <= last; from += size) {
    const to = Math.min(last, from + size - 1);
    const inRange = sorted.filter((r) => r.seq >= from && r.seq <= to);
    const before = [...sorted].reverse().find((r) => r.seq < from);
    const layers = [chainLayer(inRange, before), merkleLayer(inRange), anchorLayer(inRange)];
    result.push({ fromSeq: from, toSeq: to, ok: layers.every((l) => l.ok), layers });
  }
  return result;
}
