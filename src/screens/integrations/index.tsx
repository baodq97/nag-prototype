import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { INTEGRATION_KIND_LABEL } from '../../domain/integrations';
import { type IntegrationTab, integrationTabCounts, integrationTabs } from '../../domain/summaries';
import type { Integration, IntegrationKind } from '../../domain/types';
import { Button } from '../../ui/Button';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { type TabDef, Tabs } from '../../ui/Tabs';
import { useUrlParam } from '../../ui/useUrlParam';
import { ConnectFlow } from './connect-flow';
import { CapabilityTags, ErrorPanel, IconTile } from './parts';
import { ScopeDialog } from './scope-dialog';
import { useIntegrations } from './store';
import { unlocksLine } from './text';

const TAB_IDS: IntegrationTab[] = ['connected', 'available', 'errors'];

const facets: Facet<Integration>[] = [
  {
    key: 'category',
    label: 'Category',
    value: (i) => i.kind,
    format: (kind) => INTEGRATION_KIND_LABEL[kind as IntegrationKind],
  },
];

const searchText = (i: Integration) =>
  `${i.name} ${INTEGRATION_KIND_LABEL[i.kind]} ${i.capabilities.join(' ')} ${i.status}`;

/** The category under a name, in both tabs; nothing when it would only repeat the name. */
function CategoryLine({ integration: i }: { integration: Integration }) {
  const label = INTEGRATION_KIND_LABEL[i.kind];
  if (!label || label.toLowerCase() === i.name.toLowerCase()) return null;
  return <p className="text-xs text-slate-600">{label}</p>;
}

const columns = (configure: (i: Integration) => void): Column<Integration>[] => [
  {
    key: 'name',
    header: 'Source',
    sortValue: (i) => i.name.toLowerCase(),
    render: (i) => (
      <div className="flex items-center gap-3">
        <IconTile kind={i.kind} />
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{i.name}</p>
          <CategoryLine integration={i} />
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (i) => i.status,
    render: (i) => <StatusChip status={i.status} />,
  },
  {
    key: 'capabilities',
    header: 'Capabilities',
    className: 'min-w-48',
    render: (i) => <CapabilityTags name={i.name} capabilities={i.capabilities} />,
  },
  {
    key: 'heartbeat',
    header: 'Last heartbeat',
    sortValue: (i) => i.lastSyncAt ?? '',
    render: (i) => (
      <span className="whitespace-nowrap text-slate-700">
        {i.lastSyncAt ? fmtDateTime(i.lastSyncAt) : 'Never'}
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (i) => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Button size="sm" aria-label={`Configure scope of ${i.name}`} onClick={() => configure(i)}>
          Configure scope
        </Button>
        <Link
          to={`/integrations/${i.id}`}
          aria-label={`Manage ${i.name}`}
          className="rounded-md px-2 py-1 text-xs font-medium text-accent-700 ring-1 ring-accent-200 ring-inset hover:bg-accent-50"
        >
          Manage
        </Link>
      </div>
    ),
  },
];

function ConnectedList({
  rows,
  configure,
  empty,
}: {
  rows: Integration[];
  configure: (i: Integration) => void;
  empty: { title: string; body: string };
}) {
  const failing = rows.filter((i) => i.status === 'error');
  return (
    <div className="flex flex-col gap-4">
      {failing.map((i) => (
        <ErrorPanel key={i.id} integration={i} />
      ))}
      <DataTable
        label="integrations"
        rows={rows}
        columns={columns(configure)}
        facets={facets}
        rowKey={(i) => i.id}
        searchText={searchText}
        problem={(i) => i.status === 'error'}
        urlState
        empty={empty}
      />
    </div>
  );
}

function AvailableGrid({
  rows,
  connect,
}: {
  rows: Integration[];
  connect: (i: Integration) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-700">
        Every source in the catalogue is connected.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Available integrations">
      {rows.map((i) => (
        <li
          key={i.id}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <IconTile kind={i.kind} />
            <div className="min-w-0">
              <h2 className="font-medium text-slate-900">{i.name}</h2>
              <CategoryLine integration={i} />
            </div>
          </div>
          <CapabilityTags name={i.name} capabilities={i.capabilities} />
          <p className="text-sm text-slate-700">{unlocksLine(i.id)}</p>
          <div className="mt-auto flex items-center gap-2">
            <Link
              to={`/integrations/${i.id}`}
              aria-label={`View details of ${i.name}`}
              className="rounded-md px-2 py-1 text-sm font-medium text-accent-700 ring-1 ring-accent-200 ring-inset hover:bg-accent-50"
            >
              View details
            </Link>
            <Button
              variant="primary"
              size="sm"
              aria-label={`Connect ${i.name}`}
              onClick={() => connect(i)}
            >
              Connect
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Screen() {
  const all = useIntegrations();
  const [param, setTab] = useUrlParam('tab');
  const [connectId, setConnectId] = useState<string | null>(null);
  const [scopeId, setScopeId] = useState<string | null>(null);
  const closeConnect = useCallback(() => setConnectId(null), []);
  const closeScope = useCallback(() => setScopeId(null), []);

  const tab = TAB_IDS.find((t) => t === param) ?? 'connected';
  const rows = integrationTabs(all);
  const counts = integrationTabCounts(all);
  const scopeOf = all.find((i) => i.id === scopeId);

  const configure = (i: Integration) => setScopeId(i.id);
  const tabs: TabDef[] = [
    {
      id: 'connected',
      label: 'Connected',
      count: counts.connected,
      content: (
        <ConnectedList
          rows={rows.connected}
          configure={configure}
          empty={{
            title: 'No integration is connected',
            body: 'Connect one from the Available tab.',
          }}
        />
      ),
    },
    {
      id: 'available',
      label: 'Available',
      count: counts.available,
      content: <AvailableGrid rows={rows.available} connect={(i) => setConnectId(i.id)} />,
    },
    {
      id: 'errors',
      label: 'Errors',
      count: counts.errors,
      content: (
        <ConnectedList
          rows={rows.errors}
          configure={configure}
          empty={{
            title: 'No integration is in error',
            body: 'Every connected source sends heartbeats.',
          }}
        />
      ),
    },
  ];

  return (
    <Page title="Integrations" demo>
      <Tabs
        tabs={tabs}
        label="Integration views"
        value={tab}
        onChange={(id) => setTab(id === 'connected' ? null : id)}
      />
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <StubLabel what="Model providers" />
        Model providers behind the gateway are stubs: no model is called in this prototype.
      </p>
      {connectId && <ConnectFlow initialId={connectId} onClose={closeConnect} />}
      {scopeOf && <ScopeDialog integration={scopeOf} onClose={closeScope} />}
    </Page>
  );
}
