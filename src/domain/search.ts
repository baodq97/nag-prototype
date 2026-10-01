import type { SearchEntry } from './types';

/** Lower is better: exact name, name prefix, word prefix, then anywhere in name or ID. */
function rank(entry: SearchEntry, q: string): number | null {
  const label = entry.label.toLowerCase();
  if (label === q || entry.id.toLowerCase() === q) return 0;
  if (label.startsWith(q)) return 1;
  if (label.split(/[\s\-/(.]+/).some((w) => w.startsWith(q))) return 2;
  if (label.includes(q) || entry.id.toLowerCase().includes(q)) return 3;
  return null;
}

export function search(entries: SearchEntry[], query: string, limit = 10): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .flatMap((entry) => {
      const r = rank(entry, q);
      return r === null ? [] : [{ entry, r }];
    })
    .sort((a, b) => a.r - b.r || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map((x) => x.entry);
}
