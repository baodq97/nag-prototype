import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Present when the column can be sorted. */
  sortValue?: (row: T) => string | number;
  className?: string;
}

export interface Sort {
  key: string;
  dir: 'asc' | 'desc';
}

/** Rows in the order the table shows them; no sort or an unsortable column keeps the order. */
export function sortRows<T>(rows: T[], columns: Column<T>[], sort: Sort | undefined): T[] {
  const col = columns.find((c) => c.key === sort?.key);
  if (!col?.sortValue || !sort) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = col.sortValue!(a);
    const y = col.sortValue!(b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}
