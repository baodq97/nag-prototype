import { type McpSessionView, mcpSessions } from '../../data';
import { getCode } from '../../domain/codes';
import type { McpSessionState } from '../../domain/types';
import { Card } from '../../ui/Card';
import { type Column, DataTable, ID_CELL } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { fmtDateTime } from '../../ui/format';
import { StatusChip } from '../../ui/StatusChip';
import { useOpenParam } from '../../ui/useOpenParam';

/** A terminated session reads as a failure; the shared chip map has no entry for it. */
const SessionState = ({ state }: { state: McpSessionState }) =>
  state === 'terminated' ? (
    <StatusChip variant="danger">Terminated</StatusChip>
  ) : (
    <StatusChip status={state} />
  );

const sessionColumns = (open: (id: string) => void): Column<McpSessionView>[] => [
  {
    key: 'id',
    header: 'Session',
    id: true,
    sortValue: (s) => s.id,
    render: (s) => (
      <button
        type="button"
        onClick={() => open(s.id)}
        className="text-left font-medium text-accent-700 hover:underline"
      >
        {s.id}
      </button>
    ),
  },
  { key: 'client', header: 'Client', sortValue: (s) => s.client, render: (s) => s.client },
  {
    key: 'server',
    header: 'Server',
    sortValue: (s) => s.serverLabel,
    render: (s) => s.serverLabel,
  },
  {
    key: 'started',
    header: 'Started',
    sortValue: (s) => s.startedAt,
    render: (s) => <span className="whitespace-nowrap">{fmtDateTime(s.startedAt)}</span>,
  },
  {
    key: 'last',
    header: 'Last activity',
    sortValue: (s) => s.lastActivityAt,
    render: (s) => <span className="whitespace-nowrap">{fmtDateTime(s.lastActivityAt)}</span>,
  },
  {
    key: 'state',
    header: 'State',
    sortValue: (s) => s.state,
    render: (s) => <SessionState state={s.state} />,
  },
];

export function McpSessions() {
  const [openId, setOpen] = useOpenParam();
  const sessions = mcpSessions();
  const open = sessions.find((s) => s.id === openId);

  return (
    <Card title="Sessions">
      <p className="mb-3 text-xs text-slate-600">
        These are the sessions the inspector saw before it lost its heartbeat. The values are seeded
        demo data.
      </p>
      <DataTable
        label="sessions"
        rows={sessions}
        columns={sessionColumns(setOpen)}
        facets={[]}
        rowKey={(s) => s.id}
        searchText={(s) => `${s.id} ${s.client} ${s.serverLabel} ${s.state}`}
        onRowClick={(s) => setOpen(s.id)}
      />
      <Drawer
        open={open !== undefined}
        title={open ? `Session ${open.id}` : ''}
        subtitle="Tool calls"
        onClose={() => setOpen(null)}
      >
        {open && (
          <>
            <p className="text-sm text-slate-700">
              {open.client} on {open.serverLabel}, {open.state}. Last activity{' '}
              {fmtDateTime(open.lastActivityAt)}.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table aria-label={`Tool calls of ${open.id}`} className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Tool
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Code
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Outcome
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Duration (ms)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {open.calls.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 align-top font-mono text-xs">{c.tool}</td>
                      <td className="px-3 py-2 align-top">
                        {getCode(c.code).label}{' '}
                        <span className={`${ID_CELL} font-mono text-xs text-slate-600`}>
                          {c.code}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusChip status={c.outcome} />
                      </td>
                      <td className="px-3 py-2 text-right align-top tabular-nums">
                        {c.durationMs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Drawer>
    </Card>
  );
}
