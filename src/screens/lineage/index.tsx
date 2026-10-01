import { useState } from 'react';
import { traceNodes, traces } from '../../data';
import { MAX_DEPTH, layoutTrace, parentLabel } from '../../domain/lineage';
import type { LineageKind, LineageOutcome } from '../../domain/types';
import { Card } from '../../ui/Card';
import { SelectField } from '../../ui/Field';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

/** Width of one level of indent, in px; it holds the connector lines. */
const INDENT = 24;

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

const LINE = 'absolute bg-slate-400';

/** One cell of the left gutter: a vertical line, and on the last cell an elbow into the node. */
function Guide({ elbow, vertical }: { elbow: boolean; vertical: 'none' | 'half' | 'full' }) {
  return (
    <span aria-hidden className="relative self-stretch" style={{ width: INDENT }}>
      {vertical !== 'none' && (
        <span
          className={`${LINE} top-0 w-px ${vertical === 'full' ? 'bottom-0' : 'bottom-1/2'}`}
          style={{ left: INDENT / 2 }}
        />
      )}
      {elbow && <span className={`${LINE} right-0 top-1/2 h-px`} style={{ left: INDENT / 2 }} />}
    </span>
  );
}

function Graph({ traceId }: { traceId: string }) {
  const layout = layoutTrace(traceNodes(traceId));
  // Whether each ancestor-or-self at a depth has a later sibling: decides which lines continue.
  const hasLater: boolean[] = [];
  const rows = layout.nodes.map(({ node, depth }, i) => {
    const next = layout.nodes.slice(i + 1).find((p) => p.depth <= depth);
    const later =
      next !== undefined && next.depth === depth && next.node.parentId === node.parentId;
    hasLater[depth] = later;
    return { node, depth, later, gutter: hasLater.slice(2, depth + 1) };
  });

  return (
    <div
      role="region"
      aria-label="Call graph, one row per call, indented by depth"
      data-testid="call-graph"
      className="rounded-md border border-slate-200 bg-white p-2"
    >
      <ol
        aria-label={`${layout.nodes.length} calls, depth up to ${layout.maxDepth}. The table below lists the same calls.`}
      >
        {rows.map(({ node, depth, later, gutter }) => {
          const style = OUTCOME_STYLE[node.outcome];
          return (
            <li key={node.id} className="flex items-stretch py-0.5" data-depth={depth}>
              {gutter.map((continues, g) => {
                const own = g === gutter.length - 1;
                const vertical = own ? (later ? 'full' : 'half') : continues ? 'full' : 'none';
                return <Guide key={g} elbow={own} vertical={vertical} />;
              })}
              <div
                data-testid="call-node"
                className="min-w-0 rounded-md border-[1.5px] px-2 py-1"
                style={{
                  background: style.fill,
                  borderColor: style.stroke,
                  borderStyle: node.kind === 'rejected' ? 'dashed' : 'solid',
                }}
              >
                <div
                  data-testid="call-label"
                  className="break-words text-[12px] font-semibold leading-4 text-slate-900"
                >
                  {node.label}
                </div>
                <div className="text-[12px] leading-4 text-slate-700">
                  <span className="sr-only">Depth {depth}. </span>
                  {KIND_LABEL[node.kind]} · {style.label}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
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
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const depthOf = new Map(layout.nodes.map((p) => [p.node.id, p.depth]));
  const rejected = nodes.filter((n) => n.kind === 'rejected');
  const reached = Math.max(
    0,
    ...layout.nodes.filter((p) => p.node.kind !== 'rejected').map((p) => p.depth),
  );

  return (
    <Page title="Lineage" demo>
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-fit max-w-full">
            <SelectField
              label="Trace"
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              options={traces.map((t) => ({ value: t.id, label: t.name }))}
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
          <p className="text-sm text-slate-700">
            One row per call, in call order. A call is indented one step for each level of depth,
            and a line joins it to the call that made it.
          </p>
          <Legend />
          <Graph key={traceId} traceId={traceId} />
        </div>
      </Card>
      <Card title="Calls in this trace">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Calls in trace {trace?.name}, in call-graph order</caption>
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
                  <td className="px-2 py-1.5">{parentLabel(node, nodesById)}</td>
                  <td className="px-2 py-1.5">
                    <StatusChip status={node.outcome} />
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {node.durationMs === undefined ? 'Not run' : `${node.durationMs} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
