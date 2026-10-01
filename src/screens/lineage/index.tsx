import { useState } from 'react';
import { traceNodes, traces } from '../../data';
import { MAX_DEPTH, layoutTrace } from '../../domain/lineage';
import type { LineageKind, LineageOutcome } from '../../domain/types';
import { Card } from '../../ui/Card';
import { SelectField } from '../../ui/Field';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const BOX_W = 200;
const BOX_H = 40;
const COL_GAP = 240;
const ROW_GAP = 52;
const PAD = 12;

const OUTCOME_STYLE: Record<LineageOutcome, { fill: string; stroke: string; label: string }> = {
  success: { fill: '#ecfdf5', stroke: '#047857', label: 'Success' },
  error: { fill: '#fef2f2', stroke: '#b91c1c', label: 'Error' },
  cancelled: { fill: '#fffbeb', stroke: '#b45309', label: 'Cancelled' },
  abandoned: { fill: '#f1f5f9', stroke: '#475569', label: 'Abandoned' },
};

const KIND_LABEL: Record<LineageKind, string> = {
  agent: 'Agent',
  llm: 'Model call',
  'mcp-tool': 'MCP tool call',
  rejected: 'Rejected call',
};

const clip = (text: string, max = 27) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function Graph({ traceId }: { traceId: string }) {
  const layout = layoutTrace(traceNodes(traceId));
  const pos = new Map(
    layout.nodes.map((p) => [
      p.node.id,
      { x: PAD + (p.depth - 1) * COL_GAP, y: PAD + p.row * ROW_GAP },
    ]),
  );
  const width = PAD * 2 + (layout.maxDepth - 1) * COL_GAP + BOX_W;
  const height = PAD * 2 + (layout.nodes.length - 1) * ROW_GAP + BOX_H;

  return (
    <div
      role="region"
      aria-label="Call graph, scrolls sideways"
      tabIndex={0}
      className="overflow-x-auto rounded-md border border-slate-200 bg-white"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Call graph with ${layout.nodes.length} calls and a depth of ${layout.maxDepth}. The table below lists the same calls.`}
      >
        {layout.edges.map((e) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + BOX_W;
          const y1 = a.y + BOX_H / 2;
          const x2 = b.x;
          const y2 = b.y + BOX_H / 2;
          const mid = x1 + (x2 - x1) / 2;
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={`M${x1} ${y1} H${mid} V${y2} H${x2}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.5}
            />
          );
        })}
        {layout.nodes.map(({ node }) => {
          const p = pos.get(node.id);
          if (!p) return null;
          const style = OUTCOME_STYLE[node.outcome];
          return (
            <g key={node.id} transform={`translate(${p.x} ${p.y})`}>
              <title>{`${node.label} – ${KIND_LABEL[node.kind]}, ${style.label.toLowerCase()}`}</title>
              <rect
                width={BOX_W}
                height={BOX_H}
                rx={6}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1.5}
                strokeDasharray={node.kind === 'rejected' ? '5 3' : undefined}
              />
              <text x={8} y={16} fontSize={12} fontWeight={600} fill="#0f172a">
                {clip(node.label)}
              </text>
              <text x={8} y={32} fontSize={12} fill="#334155">
                {KIND_LABEL[node.kind]} · {style.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
      <ul className="flex flex-wrap items-center gap-3" aria-label="Outcome legend">
        {(Object.keys(OUTCOME_STYLE) as LineageOutcome[]).map((o) => (
          <li key={o} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-3 w-5 rounded-sm border-2"
              style={{ background: OUTCOME_STYLE[o].fill, borderColor: OUTCOME_STYLE[o].stroke }}
            />
            {OUTCOME_STYLE[o].label}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center gap-3" aria-label="Kind legend">
        <li>Agent: an agent step</li>
        <li>Model call: a model request</li>
        <li>MCP tool call: shows its terminal outcome</li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-sm border-2 border-dashed border-red-700"
          />
          Rejected call: dashed outline
        </li>
      </ul>
    </div>
  );
}

export default function LineageScreen() {
  const [traceId, setTraceId] = useState(traces[0]?.id ?? '');
  const trace = traces.find((t) => t.id === traceId);
  const nodes = traceNodes(traceId);
  const layout = layoutTrace(nodes);
  const depthOf = new Map(layout.nodes.map((p) => [p.node.id, p.depth]));
  const rejected = nodes.filter((n) => n.kind === 'rejected');
  const reached = Math.max(
    0,
    ...layout.nodes.filter((p) => p.node.kind !== 'rejected').map((p) => p.depth),
  );

  return (
    <Page
      title="Lineage"
      demo
      description="The call graph of one agent trace: who called whom, and how each call ended. Depth gives the column and a parent link gives each edge."
    >
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-80">
            <SelectField
              label="Trace"
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              options={traces.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))}
            />
          </div>
          <p className="max-w-xl pb-1.5 text-sm text-slate-700">{trace?.description}</p>
        </div>
        <p className="mt-3 text-sm text-slate-700" data-testid="depth-note">
          The deepest accepted call in this trace is at depth {reached}. The depth limit is{' '}
          {MAX_DEPTH}; a call at depth {MAX_DEPTH + 1} or deeper is rejected and drawn as an error
          node.
          {rejected.length > 0 &&
            ` Here, ${rejected.map((n) => `“${n.label}”`).join(', ')} was rejected at depth ${depthOf.get(rejected[0]!.id)}.`}
        </p>
      </Card>
      <Card title="Call graph">
        <div className="flex flex-col gap-3">
          <Legend />
          <Graph key={traceId} traceId={traceId} />
        </div>
      </Card>
      <Card title="Calls in this trace">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Calls in trace {traceId}, in call-graph order</caption>
            <thead className="text-xs text-slate-600">
              <tr>
                {['Call', 'Depth', 'Kind', 'Parent', 'Outcome', 'Duration'].map((h) => (
                  <th key={h} scope="col" className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {layout.nodes.map(({ node, depth }) => (
                <tr key={node.id}>
                  <th scope="row" className="px-2 py-1.5 text-left font-medium text-slate-900">
                    {node.label}
                  </th>
                  <td className="px-2 py-1.5 tabular-nums">{depth}</td>
                  <td className="px-2 py-1.5">{KIND_LABEL[node.kind]}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">
                    {node.parentId ?? 'none (root)'}
                  </td>
                  <td className="px-2 py-1.5">
                    <StatusChip status={node.outcome} />
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{node.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
