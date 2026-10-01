import { latencyProfiles, policyBundles } from '../../data';
import { bundleLoad, fitsProfile } from '../../domain/bundles';
import type { LatencyProfile, PolicyBundle } from '../../domain/types';
import { Card } from '../../ui/Card';
import { DataTable, type Column, type Facet } from '../../ui/DataTable';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

function Fit({ bundle, profile }: { bundle: PolicyBundle; profile: LatencyProfile }) {
  if (bundle.budgetMs === undefined) return <span className="text-slate-600">No budget</span>;
  return fitsProfile(bundle, profile) ? (
    <StatusChip variant="success">Fits</StatusChip>
  ) : (
    <StatusChip variant="warning">Over {profile.budgetMs} ms</StatusChip>
  );
}

const columns: Column<PolicyBundle>[] = [
  {
    key: 'name',
    header: 'Name',
    sortValue: (b) => b.name,
    render: (b) => (
      <div>
        <p className="font-medium text-slate-900">{b.name}</p>
        <p className="text-xs text-slate-600">
          {b.id} · v{b.version}
        </p>
      </div>
    ),
  },
  {
    key: 'art5',
    header: 'Art. 5',
    sortValue: (b) => (b.article5 ? 0 : 1),
    render: (b) => (b.article5 ? <StatusChip variant="info">Art. 5</StatusChip> : <span>–</span>),
  },
  {
    key: 'class',
    header: 'Class',
    sortValue: (b) => b.class ?? 'Z',
    render: (b) => b.class ?? <span className="text-slate-600">Not declared</span>,
  },
  {
    key: 'budget',
    header: 'Budget (ms)',
    sortValue: (b) => b.budgetMs ?? Number.MAX_SAFE_INTEGER,
    className: 'tabular-nums',
    render: (b) => b.budgetMs ?? <span className="text-slate-600">Not declared</span>,
  },
  {
    key: 'breach',
    header: 'Breach behaviour',
    sortValue: (b) => b.breach,
    render: (b) => <span className="font-mono text-xs">{b.breach}</span>,
  },
  {
    key: 'load',
    header: 'Load state',
    render: (b) => {
      const load = bundleLoad(b);
      return load.state === 'loaded' ? (
        <StatusChip status="loaded">Loaded</StatusChip>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <StatusChip status="rejected">Rejected at load</StatusChip>
          <span className="text-xs text-slate-600">{load.reason}</span>
        </div>
      );
    },
  },
  ...latencyProfiles.map((p): Column<PolicyBundle> => ({
    key: `fit-${p.id}`,
    header: `${p.name} (${p.budgetMs} ms)`,
    render: (b) => <Fit bundle={b} profile={p} />,
  })),
];

const facets: Facet<PolicyBundle>[] = [
  { key: 'class', label: 'Class', value: (b) => b.class ?? 'Not declared' },
  { key: 'breach', label: 'Breach behaviour', value: (b) => b.breach },
  { key: 'art5', label: 'Art. 5', value: (b) => (b.article5 ? 'Art. 5 bundles' : 'Other bundles') },
];

export default function PolicyBundlesScreen() {
  return (
    <Page
      title="Policy bundles"
      demo
      description="Each bundle declares a class and a latency budget. A bundle without both is rejected when it is loaded."
    >
      <Card>
        <p className="text-sm text-slate-700">
          Budgets are configured values, not measured latency. No runtime is connected, so the fit
          columns compare each bundle&apos;s configured budget with the total budget of a profile:{' '}
          {latencyProfiles.map((p) => `${p.name} ${p.budgetMs} ms`).join(', ')}.
        </p>
      </Card>
      <DataTable
        label="policy bundles"
        rows={policyBundles}
        columns={columns}
        facets={facets}
        rowKey={(b) => b.id}
        searchText={(b) => `${b.id} ${b.name} ${b.description} ${b.class ?? ''} ${b.breach}`}
      />
    </Page>
  );
}
