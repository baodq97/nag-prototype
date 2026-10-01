import { describe, expect, it } from 'vitest';
import {
  controls,
  coverage,
  getControl,
  getDocument,
  getPolicy,
  getRisk,
  getTest,
  itemRefs,
  searchIndex,
} from '.';

const getters: Record<string, (id: string) => unknown> = {
  '/controls': getControl,
  '/documents': getDocument,
  '/policies': getPolicy,
  '/risks': getRisk,
};

/** Whether the page an href opens shows the thing it points at. */
function resolves(href: string): boolean {
  const url = new URL(href, 'http://nag.local');
  if (url.pathname.startsWith('/tests/')) return !!getTest(url.pathname.slice('/tests/'.length));
  if (url.pathname === '/coverage') {
    return coverage.some((c) => `#${c.frameworkItemId}` === url.hash);
  }
  const open = url.searchParams.get('open');
  if (open) return !!getters[url.pathname]?.(open);
  const q = url.searchParams.get('q')?.toLowerCase();
  if (url.pathname === '/controls' && q) {
    return controls.some((c) => itemRefs(c.frameworkItemIds).toLowerCase().includes(q));
  }
  return false;
}

describe('search index', () => {
  it('sends every result to a page that shows it', () => {
    const broken = searchIndex.filter((e) => !resolves(e.href)).map((e) => `${e.id} → ${e.href}`);
    expect(broken).toEqual([]);
  });

  it('opens articles without a coverage row in the filtered controls table', () => {
    expect(searchIndex.find((e) => e.id === 'aia-9')?.href).toBe('/controls?q=Art.%209');
    expect(searchIndex.find((e) => e.id === 'aia-14')?.href).toBe('/coverage#aia-14');
  });
});
