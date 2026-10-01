import { type ReactNode, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { tests, unlocksFor } from '../../data';
import { INTEGRATION_KIND_LABEL } from '../../domain/integrations';
import { dependentTests, scopeGroups } from '../../domain/summaries';
import type { Integration } from '../../domain/types';
import { useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { fmtDate, fmtDateTime } from '../../ui/format';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { type TabDef, Tabs } from '../../ui/Tabs';
import { useUrlParam } from '../../ui/useUrlParam';
import { ConnectFlow } from './connect-flow';
import { CapabilityTags, ErrorPanel, IconTile } from './parts';
import { ScopeDialog } from './scope-dialog';
import { McpSessions } from './sessions';
import { useIntegration } from './store';
import { plural } from './text';

const TAB_IDS = ['overview', 'resources', 'tests'];

const DemoNote = () => (
  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 ring-inset">
    Demo data
  </span>
);

function Facts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-slate-600">{label}</dt>
          <dd className="break-words text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Overview({ integration }: { integration: Integration }) {
  const { connection, health } = integration;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Connection details" actions={<DemoNote />}>
          <Facts
            items={[
              ['Endpoint', connection.endpoint],
              ['Auth method', connection.authMethod],
              ['Key id', <span className="font-mono text-xs">{connection.keyId}</span>],
              [
                'Last rotated',
                connection.lastRotatedAt ? fmtDate(connection.lastRotatedAt) : 'Not rotated yet',
              ],
            ]}
          />
        </Card>
        <Card title="Health" actions={<DemoNote />}>
          {health ? (
            <Facts
              items={[
                [
                  'Last heartbeat',
                  integration.lastSyncAt ? fmtDateTime(integration.lastSyncAt) : 'Never',
                ],
                ['Events per minute', health.eventsPerMinute],
                ['Error rate', `${health.errorRatePct}%`],
              ]}
            />
          ) : (
            <p className="text-sm text-slate-700">
              Not connected, so there are no health figures yet.
            </p>
          )}
        </Card>
      </div>
      <Card title="Recent activity" actions={<DemoNote />}>
        {integration.activity.length === 0 ? (
          <p className="text-sm text-slate-700">
            No activity yet. Connect the source to see its heartbeats here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100" aria-label="Recent activity">
            {integration.activity.map((a) => (
              <li key={`${a.at}-${a.text}`} className="flex gap-4 py-2 text-sm">
                <span className="w-40 shrink-0 text-slate-600">{fmtDateTime(a.at)}</span>
                <span className="text-slate-900">{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {integration.kind === 'mcp-inspector' && <McpSessions />}
    </div>
  );
}

function Resources({
  integration,
  configure,
}: {
  integration: Integration;
  configure: () => void;
}) {
  const stored = useSession((s) => s.scope);
  const entries = integration.scope.map((e) => ({
    ...e,
    included: stored[`${integration.id}:${e.id}`] ?? e.included,
  }));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700">
          The resources NAG reads from this source. Changes last for this browser session.
        </p>
        <Button onClick={configure}>Configure scope</Button>
      </div>
      {scopeGroups(entries).map((g) => (
        <Card
          key={g.kind}
          title={g.label}
          actions={
            <span className="text-xs text-slate-700">
              {g.included} of {g.total} in scope
            </span>
          }
        >
          <ul className="divide-y divide-slate-100" aria-label={g.label}>
            {g.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900">{e.label}</span>
                <StatusChip variant={e.included ? 'success' : 'neutral'}>
                  {e.included ? 'In scope' : 'Out of scope'}
                </StatusChip>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function AutomatedTests({ integration }: { integration: Integration }) {
  const fed = dependentTests(integration.id, tests);
  return (
    <Card title={`Tests fed by this source (${fed.length})`}>
      {fed.length === 0 ? (
        <p className="text-sm text-slate-700">No tests use this source.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {fed.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link to={`/tests/${t.id}`} className="text-accent-700 hover:underline">
                {t.name}
              </Link>
              <StatusChip status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SidePanel({ integration }: { integration: Integration }) {
  const unlocks = unlocksFor(integration.id);
  return (
    <aside aria-label="About this source" className="flex flex-col gap-4">
      <Card title="About this source">
        <div className="flex items-center gap-3">
          <IconTile kind={integration.kind} size="lg" />
          <div>
            <p className="text-xs text-slate-600">Category</p>
            <p className="font-medium text-slate-900">{INTEGRATION_KIND_LABEL[integration.kind]}</p>
          </div>
        </div>
        <h3 className="mt-4 text-xs font-semibold text-slate-700">Capabilities</h3>
        <div className="mt-1">
          <CapabilityTags name={integration.name} capabilities={integration.capabilities} />
        </div>
        <h3 className="mt-4 text-xs font-semibold text-slate-700">Works with</h3>
        <ul className="mt-1 list-disc pl-5 text-sm text-slate-800">
          {integration.worksWith.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <p className="mt-4 rounded-md bg-accent-50 px-3 py-2 text-sm text-accent-800">
          Connecting this source unlocks {plural(unlocks.tests, 'test', 'tests')} and{' '}
          {plural(unlocks.controls, 'control', 'controls')} across{' '}
          {plural(unlocks.frameworks, 'framework', 'frameworks')}.
        </p>
      </Card>
      <Card title="Help">
        <p className="text-sm text-slate-700">
          The configuration snippet appears in the connect flow and holds a key id, never a secret.
          For anything else, ask the person who runs NAG for your organisation.
        </p>
      </Card>
    </aside>
  );
}

function IntegrationDetail({ integration }: { integration: Integration }) {
  const [param, setTab] = useUrlParam('tab');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const closeScope = useCallback(() => setScopeOpen(false), []);
  const closeConnect = useCallback(() => setConnectOpen(false), []);
  const connected = integration.status !== 'not-connected';
  const tab = TAB_IDS.find((t) => t === param) ?? 'overview';
  const fed = tests.filter((t) => t.integrationId === integration.id);

  const tabs: TabDef[] = [
    { id: 'overview', label: 'Overview', content: <Overview integration={integration} /> },
    {
      id: 'resources',
      label: 'Resources',
      count: integration.scope.length,
      content: <Resources integration={integration} configure={() => setScopeOpen(true)} />,
    },
    {
      id: 'tests',
      label: 'Automated tests',
      count: fed.length,
      content: <AutomatedTests integration={integration} />,
    },
  ];

  return (
    <Page
      title={integration.name}
      demo
      actions={
        connected ? (
          <Button variant="primary" onClick={() => setScopeOpen(true)}>
            Configure scope
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setConnectOpen(true)}>
            Connect
          </Button>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip status={integration.status} />
        <p className="text-sm text-slate-700">{integration.description}</p>
        <Link
          to="/integrations"
          className="ml-auto text-sm font-medium text-accent-700 hover:underline"
        >
          All integrations
        </Link>
      </div>
      <ErrorPanel integration={integration} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs
          tabs={tabs}
          label="Integration sections"
          value={tab}
          onChange={(id) => setTab(id === 'overview' ? null : id)}
        />
        <SidePanel integration={integration} />
      </div>
      {scopeOpen && <ScopeDialog integration={integration} onClose={closeScope} />}
      {connectOpen && <ConnectFlow initialId={integration.id} onClose={closeConnect} />}
    </Page>
  );
}

export default function Screen() {
  const { id = '' } = useParams();
  const integration = useIntegration(id);
  if (!integration) {
    return (
      <Page title="Integration not found" demo>
        <p className="text-sm text-slate-700">
          There is no integration with the ID “{id}”.{' '}
          <Link to="/integrations" className="font-medium text-accent-700 hover:underline">
            Back to all integrations
          </Link>
        </p>
      </Page>
    );
  }
  return <IntegrationDetail integration={integration} />;
}
