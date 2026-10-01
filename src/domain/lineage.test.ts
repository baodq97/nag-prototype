import { describe, expect, it } from 'vitest';
import { MAX_DEPTH, depths, isDepthAllowed, layoutTrace } from './lineage';
import type { LineageNode } from './types';

const n = (id: string, parentId: string | null): LineageNode => ({
  id,
  traceId: 'T',
  parentId,
  kind: 'agent',
  label: id,
  outcome: 'success',
  startedAt: '2026-09-30T08:00:00.000Z',
  durationMs: 1,
});

describe('depth limit', () => {
  it('allows depth 1 to 10 and rejects 11', () => {
    expect(MAX_DEPTH).toBe(10);
    expect(isDepthAllowed(1)).toBe(true);
    expect(isDepthAllowed(10)).toBe(true);
    expect(isDepthAllowed(11)).toBe(false);
    expect(isDepthAllowed(0)).toBe(false);
  });

  it('computes depth from parent links', () => {
    const chain = Array.from({ length: 11 }, (_, i) => n(`c${i + 1}`, i ? `c${i}` : null));
    const d = depths(chain);
    expect(d.get('c1')).toBe(1);
    expect(d.get('c10')).toBe(10);
    expect(d.get('c11')).toBe(11);
  });

  it('treats a missing parent as a root and refuses cycles', () => {
    expect(depths([n('x', 'gone')]).get('x')).toBe(1);
    expect(() => depths([n('a', 'b'), n('b', 'a')])).toThrow(/Cycle/);
  });
});

it('lays a trace out by depth and depth-first order', () => {
  const layout = layoutTrace([n('r', null), n('a', 'r'), n('b', 'r'), n('a1', 'a')]);
  expect(layout.nodes.map((p) => [p.node.id, p.depth, p.row])).toEqual([
    ['r', 1, 0],
    ['a', 2, 1],
    ['a1', 3, 2],
    ['b', 2, 3],
  ]);
  expect(layout.edges).toContainEqual({ from: 'a', to: 'a1' });
  expect(layout.edges).toHaveLength(3);
  expect(layout.maxDepth).toBe(3);
  expect(layoutTrace([]).maxDepth).toBe(0);
});
