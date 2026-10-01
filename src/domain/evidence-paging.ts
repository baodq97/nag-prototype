/**
 * The 1-based page that first holds a record with `fromSeq <= seq <= toSeq`, given the records in
 * the order the table shows them. Returns 1 when no record falls in the range.
 */
export function pageForRange(
  sorted: readonly { seq: number }[],
  fromSeq: number,
  toSeq: number,
  pageSize: number,
): number {
  if (pageSize < 1) return 1;
  const index = sorted.findIndex((r) => r.seq >= fromSeq && r.seq <= toSeq);
  return index < 0 ? 1 : Math.floor(index / pageSize) + 1;
}
