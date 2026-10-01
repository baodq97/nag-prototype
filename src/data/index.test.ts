import { describe, expect, it } from 'vitest';
import {
  aiSystems,
  articleRows,
  controls,
  getArticleRow,
  getControl,
  getDocument,
  getPolicy,
  getRisk,
  getSystem,
  getTest,
  itemRefs,
  searchIndex,
} from '.';

const getters: Record<string, (id: string) => unknown> = {
  '/controls': getControl,
  '/documents': getDocument,
  '/policies': getPolicy,
  '/risks': getRisk,
  '/ai-systems': getSystem,
};

/** Whether the page an href opens shows the thing it points at. */
function resolves(href: string): boolean {
  const url = new URL(href, 'http://nag.local');
  if (url.pathname.startsWith('/tests/')) return !!getTest(url.pathname.slice('/tests/'.length));
  if (url.pathname === '/coverage') {
    return !!getArticleRow(url.hash.slice(1));
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

  it('opens framework items without an article row in the filtered controls table', () => {
    expect(searchIndex.find((e) => e.id === 'iso-9.1')?.href).toBe('/controls?q=9.1');
    expect(searchIndex.find((e) => e.id === 'aia-14')?.href).toBe('/coverage#aia-14');
  });

  it('indexes all 57 article rows and the 3 AI systems', () => {
    const ids = (kind: string) => searchIndex.filter((e) => e.kind === kind).map((e) => e.id);
    expect(articleRows()).toHaveLength(57);
    for (const r of articleRows()) expect(ids('article'), r.id).toContain(r.id);
    expect(ids('system')).toEqual(aiSystems().map((s) => s.id));
    expect(searchIndex.find((e) => e.id === 'aia-26-5')?.href).toBe('/coverage#aia-26-5');
    expect(searchIndex.find((e) => e.id === 'sys-router')?.href).toBe(
      '/ai-systems?open=sys-router',
    );
  });
});
