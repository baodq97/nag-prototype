import { expect, it } from 'vitest';
import { searchIndex } from '../data';
import { search } from './search';
import type { SearchEntry } from './types';

const e = (id: string, label: string): SearchEntry => ({ kind: 'test', id, label, href: '/' });

it('ranks exact, prefix, word prefix, then substring matches', () => {
  const entries = [
    e('4', 'Data retention schedule'),
    e('3', 'Kill switch runbook'),
    e('2', 'Switch owners'),
    e('1', 'Switch'),
  ];
  expect(search(entries, 'switch').map((x) => x.id)).toEqual(['1', '2', '3']);
  expect(search(entries, 'tent').map((x) => x.id)).toEqual(['4']);
  expect(search(entries, '  ')).toEqual([]);
  expect(search(entries, 'nothing')).toEqual([]);
});

it('finds by ID and honours the limit', () => {
  expect(search([e('CTL-07', 'Log retention')], 'ctl-07')).toHaveLength(1);
  expect(search([e('A', 'x a'), e('B', 'x b')], 'x', 1)).toHaveLength(1);
});

it('finds every kind of object in the seeded index', () => {
  const kinds = new Set(searchIndex.map((s) => s.kind));
  expect([...kinds].sort()).toEqual(['article', 'control', 'document', 'policy', 'risk', 'test']);
  expect(search(searchIndex, 'kill switch')[0]?.label).toBe('Kill switch activation requires MFA');
  expect(search(searchIndex, 'Art. 14')[0]?.id).toBe('aia-14');
});

it('answers within 100 ms over the seeded data', () => {
  const start = performance.now();
  for (const q of ['a', 'risk', 'oversight', 'TST-0', 'zzz']) search(searchIndex, q);
  expect((performance.now() - start) / 5).toBeLessThan(100);
});
