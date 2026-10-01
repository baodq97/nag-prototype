import { describe, expect, it } from 'vitest';
import { bandFor, bandLine, bandRanges } from './classifier';
import type { ClassifierConfig } from './types';

const config: ClassifierConfig = {
  modelVersion: 'test',
  releaseThreshold: 0.5,
  bands: [
    { band: 'medium', min: 0.6, routing: 'm' },
    { band: 'low', min: 0.5, routing: 'l' },
    { band: 'high', min: 0.85, routing: 'h' },
  ],
  belowRelease: 'r',
};

describe('bandFor', () => {
  it('puts each edge in the band it opens', () => {
    expect(bandFor(0.5, config)).toBe('low');
    expect(bandFor(0.5999, config)).toBe('low');
    expect(bandFor(0.6, config)).toBe('medium');
    expect(bandFor(0.8499, config)).toBe('medium');
    expect(bandFor(0.85, config)).toBe('high');
    expect(bandFor(1, config)).toBe('high');
  });

  it('releases scores below the threshold', () => {
    expect(bandFor(0.4999, config)).toBeNull();
    expect(bandFor(0, config)).toBeNull();
  });

  it('rejects scores outside [0, 1]', () => {
    expect(() => bandFor(1.01, config)).toThrow(RangeError);
    expect(() => bandFor(-0.1, config)).toThrow(RangeError);
    expect(() => bandFor(Number.NaN, config)).toThrow(RangeError);
  });
});

describe('bandRanges', () => {
  it('lists the bands from the lowest up, each running to the next bound', () => {
    expect(bandRanges(config).map((b) => [b.band, b.min, b.max])).toEqual([
      ['low', 0.5, 0.6],
      ['medium', 0.6, 0.85],
      ['high', 0.85, 1],
    ]);
  });
});

describe('bandLine', () => {
  it('shows the score next to the lower bound of its band', () => {
    expect(bandLine(0.77, config)).toBe('0.77 ≥ 0.60 (medium)');
    expect(bandLine(0.85, config)).toBe('0.85 ≥ 0.85 (high)');
    expect(bandLine(0.42, config)).toBe('0.42 < 0.50 (released)');
  });
});
