import { describe, expect, it } from 'vitest';
import { lineage, traceNodes } from '../data';
import { MAX_DEPTH, depths, isDepthAllowed, layoutTrace, parentLabel } from './lineage';
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

describe('parentLabel', () => {
  const a = { ...n('a1', null), label: 'orchestrator' };
  const b = n('b1', 'a1');
  const orphan = n('o1', 'gone');
  const byId = new Map([a, b, orphan].map((x) => [x.id, x]));

  it("returns the parent's label", () => {
    expect(parentLabel(b, byId)).toBe('orchestrator');
  });

  it('returns Root for a call with no parent', () => {
    expect(parentLabel(a, byId)).toBe('Root');
  });

  it('returns Unknown parent, not the id, when the parent is not found', () => {
    expect(parentLabel(orphan, byId)).toBe('Unknown parent');
  });
});

describe('seeded traces', () => {
  const childCount = (id: string) => lineage.filter((x) => x.parentId === id).length;

  it('has no model call or rejected call with children', () => {
    const leaves = lineage.filter((x) => x.kind === 'llm' || x.kind === 'rejected');
    expect(leaves.length).toBeGreaterThan(0);
    for (const x of leaves) expect(childCount(x.id), `${x.traceId} ${x.label}`).toBe(0);
  });

  it('has MCP tool calls as leaves too', () => {
    for (const x of lineage.filter((y) => y.kind === 'mcp-tool')) {
      expect(childCount(x.id), x.label).toBe(0);
    }
  });

  it('gives a rejected call no duration and every other call one', () => {
    for (const x of lineage) {
      if (x.kind === 'rejected') expect(x.durationMs, x.label).toBeUndefined();
      else expect(x.durationMs, x.label).toBeGreaterThan(0);
    }
  });

  it('reaches depth 10 accepted and 11 rejected in both deep traces', () => {
    for (const id of ['TR-91c2', 'TR-b604']) {
      const calls = traceNodes(id);
      const d = depths(calls);
      const accepted = calls.filter((x) => x.kind !== 'rejected');
      expect(Math.max(...accepted.map((x) => d.get(x.id)!)), id).toBe(MAX_DEPTH);
      const rejected = calls.filter((x) => x.kind === 'rejected');
      if (id === 'TR-b604') {
        expect(rejected.map((x) => d.get(x.id))).toEqual([MAX_DEPTH + 1]);
      } else {
        expect(rejected).toHaveLength(0);
      }
    }
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
