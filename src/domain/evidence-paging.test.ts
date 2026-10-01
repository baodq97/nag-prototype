import { describe, expect, it } from 'vitest';
import { pageForRange } from './evidence-paging';

const records = (seqs: number[]) => seqs.map((seq) => ({ seq }));
// 1..120 ascending, three pages of 50, 50 and 20.
const ascending = records(Array.from({ length: 120 }, (_, i) => i + 1));
const descending = [...ascending].reverse();

describe('pageForRange', () => {
  it('maps the first range to the first page', () => {
    expect(pageForRange(ascending, 1, 50, 50)).toBe(1);
  });

  it('maps the last range to the last page', () => {
    expect(pageForRange(ascending, 101, 120, 50)).toBe(3);
  });

  it('picks the first page that holds a record of a range crossing a page boundary', () => {
    expect(pageForRange(ascending, 41, 60, 50)).toBe(1);
    expect(pageForRange(descending, 41, 60, 50)).toBe(2);
  });

  it('follows the order of the records it is given', () => {
    expect(pageForRange(descending, 1, 50, 50)).toBe(2);
    expect(pageForRange(descending, 101, 120, 50)).toBe(1);
  });

  it('returns 1 when no record falls in the range', () => {
    expect(pageForRange(ascending, 500, 600, 50)).toBe(1);
    expect(pageForRange([], 1, 50, 50)).toBe(1);
  });

  it('skips a missing record inside the range', () => {
    const gap = records([1, 2, 3, 5, 6]);
    expect(pageForRange(gap, 4, 5, 2)).toBe(2);
  });

  it('returns 1 for a page size below 1', () => {
    expect(pageForRange(ascending, 101, 120, 0)).toBe(1);
  });
});
