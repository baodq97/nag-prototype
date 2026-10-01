import type { LineageNode } from './types';

/** Deepest call allowed in a chain of agents; a root call has depth 1. */
export const MAX_DEPTH = 10;

export function isDepthAllowed(depth: number): boolean {
  return depth >= 1 && depth <= MAX_DEPTH;
}

/** Depth of every node from its parent links; a node with a missing parent counts as a root. */
export function depths(nodes: LineageNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result = new Map<string, number>();
  const depthOf = (node: LineageNode, seen: Set<string>): number => {
    const known = result.get(node.id);
    if (known !== undefined) return known;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (seen.has(node.id)) throw new Error(`Cycle in lineage at ${node.id}`);
    seen.add(node.id);
    const d = parent ? depthOf(parent, seen) + 1 : 1;
    result.set(node.id, d);
    return d;
  };
  for (const n of nodes) depthOf(n, new Set());
  return result;
}

export interface PlacedNode {
  node: LineageNode;
  depth: number;
  /** Row in a depth-first ordering, used as the vertical position. */
  row: number;
}

export interface TraceLayout {
  nodes: PlacedNode[];
  edges: { from: string; to: string }[];
  maxDepth: number;
}

/** Layout input for drawing a trace: depth gives the column, depth-first order the row. */
export function layoutTrace(nodes: LineageNode[]): TraceLayout {
  const d = depths(nodes);
  const ids = new Set(nodes.map((n) => n.id));
  const children = new Map<string | null, LineageNode[]>();
  for (const n of nodes) {
    const key = n.parentId && ids.has(n.parentId) ? n.parentId : null;
    children.set(key, [...(children.get(key) ?? []), n]);
  }
  const placed: PlacedNode[] = [];
  const visit = (n: LineageNode) => {
    placed.push({ node: n, depth: d.get(n.id) ?? 1, row: placed.length });
    for (const c of children.get(n.id) ?? []) visit(c);
  };
  for (const root of children.get(null) ?? []) visit(root);
  return {
    nodes: placed,
    edges: nodes
      .filter((n) => n.parentId && ids.has(n.parentId))
      .map((n) => ({ from: n.parentId as string, to: n.id })),
    maxDepth: Math.max(0, ...placed.map((p) => p.depth)),
  };
}
