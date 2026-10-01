import { Link, useParams } from 'react-router';
import { getIntegration, tests, unlocksFor } from '../../data';
import type { Integration, ScopeEntry } from '../../domain/types';
import { updateSession, useSession } from '../../session/store';
import { Card } from '../../ui/Card';
import { Toggle } from '../../ui/Field';
import { fmtDateTime } from '../../ui/format';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function ScopeToggle({ integrationId, entry }: { integrationId: string; entry: ScopeEntry }) {
  const key = `${integrationId}:${entry.id}`;
  // A boolean (or undefined) held in the state, so this selector is stable.
  const stored = useSession((s) => s.scope[key]);
  const included = stored ?? entry.included;
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <Toggle
        label={entry.label}
        checked={included}
        onChange={(next) => updateSession((s) => ({ ...s, scope: { ...s.scope, [key]: next } }))}
      />
      <span className="text-xs text-slate-600">{included ? 'Included' : 'Excluded'}</span>
    </li>
  );
}

function IntegrationDetail({ integration }: { integration: Integration }) {
  const unlocks = unlocksFor(integration.id);
  const fed = tests.filter((t) => t.integrationId === integration.id);

  return (
    <Page
      title={integration.name}
      demo
      description={integration.description}
      actions={
        <Link to="/integrations" className="text-sm font-medium text-accent-700 hover:underline">
          All integrations
        </Link>
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={integration.status} />
          <span className="text-sm text-slate-700">
            {integration.lastSyncAt
              ? `Last sync ${fmtDateTime(integration.lastSyncAt)}`
              : 'Not synced yet'}
          </span>
        </div>
        {integration.errorMessage && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-800">
            {integration.errorMessage}
          </p>
        )}
        <h2 className="mt-4 text-sm font-semibold text-slate-900">Capabilities</h2>
        <ul className="mt-1 flex flex-wrap gap-1" aria-label="Capabilities">
          {integration.capabilities.map((c) => (
            <li
              key={c}
              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200 ring-inset"
            >
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-md bg-accent-50 px-3 py-2 text-sm text-accent-800">
          Connecting this source unlocks {plural(unlocks.tests, 'test', 'tests')} and{' '}
          {plural(unlocks.controls, 'control', 'controls')} across{' '}
          {plural(unlocks.frameworks, 'framework', 'frameworks')}.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Scope">
          <p className="text-xs text-slate-600">
            Choose what NAG reads from this source. Changes last for this browser session.
          </p>
          <ul className="mt-2 divide-y divide-slate-100" aria-label="Scope">
            {integration.scope.map((entry) => (
              <ScopeToggle key={entry.id} integrationId={integration.id} entry={entry} />
            ))}
          </ul>
        </Card>
        <Card title={`Tests fed by this source (${fed.length})`}>
          {fed.length === 0 ? (
            <p className="text-sm text-slate-600">No tests use this source.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {fed.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/tests/${t.id}`} className="text-accent-700 hover:underline">
                    {t.name}
                  </Link>
                  <StatusChip status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}

export default function Screen() {
  const { id = '' } = useParams();
  const integration = getIntegration(id);
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
