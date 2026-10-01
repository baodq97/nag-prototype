import type { EvidenceRecord, LayerId, LayerResult, RangeVerification } from './types';

// What an erasure leaves behind, read from the same range verification the evidence screen
// shows. Key destruction does not touch the records, so any failure found here was already
// reported before the erasure.

export const LAYER_NAMES: Record<LayerId, string> = {
  L1: 'hash chain',
  L2: 'Merkle batch',
  L3: 'timestamp anchor',
};

export interface SubjectRange extends RangeVerification {
  /** Records of the subject inside this range. */
  records: number;
}

export interface ErasureLayers {
  subjectId: string;
  records: number;
  /** Only the ranges that hold a record of the subject. */
  ranges: SubjectRange[];
  allVerify: boolean;
}

export function erasureLayers(
  subjectId: string,
  records: EvidenceRecord[],
  ranges: RangeVerification[],
): ErasureLayers {
  const seqs = records.filter((r) => r.subjectId === subjectId).map((r) => r.seq);
  const held = ranges.flatMap((range) => {
    const n = seqs.filter((s) => s >= range.fromSeq && s <= range.toSeq).length;
    return n === 0 ? [] : [{ ...range, records: n }];
  });
  return {
    subjectId,
    records: seqs.length,
    ranges: held,
    allVerify: held.every((r) => r.ok),
  };
}

const layerText = (l: LayerResult) =>
  `${l.layer} (${LAYER_NAMES[l.layer]}) ${l.ok ? 'verifies' : `fails: ${l.message}`}`;

/** One line per range: "seq 101–150: L1 (hash chain) fails: gap detected at seq 137; …". */
export function rangeText(range: SubjectRange): string {
  return `seq ${range.fromSeq}–${range.toSeq} (${range.records} ${range.records === 1 ? 'record' : 'records'}): ${range.layers.map(layerText).join('; ')}`;
}

/** The sentence the erasure result and the attestation both show. */
export function erasureSummary(e: ErasureLayers): string {
  const countable = `${e.records} ${e.records === 1 ? 'record remains' : 'records remain'} countable`;
  if (e.allVerify) {
    return `${countable}; all 3 layers still verify in every range that holds them`;
  }
  const failing = e.ranges
    .filter((r) => !r.ok)
    .map(
      (r) =>
        `in seq ${r.fromSeq}–${r.toSeq} ${r.layers
          .filter((l) => !l.ok)
          .map((l) => `the ${LAYER_NAMES[l.layer]} layer fails (${l.message})`)
          .join(' and ')}`,
    );
  const before = failing.length === 1 ? 'This failure was' : 'These failures were';
  return `${countable}; ${failing.join('; ')}. ${before} already there before the erasure: key destruction does not change the records`;
}
