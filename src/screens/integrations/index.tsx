import { Link } from 'react-router';
import { integrations } from '../../data';
import { INTEGRATION_KIND_LABEL } from '../../domain/integrations';
import type { Integration, IntegrationKind } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';

const columns: Column<Integration>[] = [
  {
    key: 'name',
    header: 'Source',
    sortValue: (i) => i.name.toLowerCase(),
    render: (i) => (
      <Link to={`/integrations/${i.id}`} className="font-medium text-accent-700 hover:underline">
        {i.name}
      </Link>
    ),
  },
  {
    key: 'kind',
    header: 'Type',
    sortValue: (i) => i.kind,
    render: (i) => INTEGRATION_KIND_LABEL[i.kind],
  },
  {
    key: 'capabilities',
    header: 'Capabilities',
    render: (i) => (
      <ul className="flex flex-wrap gap-1" aria-label={`Capabilities of ${i.name}`}>
        {i.capabilities.map((c) => (
          <li
            key={c}
            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200 ring-inset"
          >
            {c}
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (i) => i.status,
    render: (i) => (
      <div className="flex flex-col items-start gap-1">
        <StatusChip status={i.status} />
        {i.errorMessage && <span className="max-w-xs text-xs text-red-800">{i.errorMessage}</span>}
      </div>
    ),
  },
  {
    key: 'sync',
    header: 'Last sync',
    sortValue: (i) => i.lastSyncAt ?? '',
    render: (i) => (
      <span className="whitespace-nowrap text-slate-700">
        {i.lastSyncAt ? fmtDateTime(i.lastSyncAt) : 'Never'}
      </span>
    ),
  },
];

const facets: Facet<Integration>[] = [
  { key: 'status', label: 'Status', value: (i) => i.status, format: humanize },
  {
    key: 'kind',
    label: 'Type',
    value: (i) => i.kind,
    format: (kind) => INTEGRATION_KIND_LABEL[kind as IntegrationKind],
  },
];

const searchText = (i: Integration) =>
  `${i.name} ${INTEGRATION_KIND_LABEL[i.kind]} ${i.capabilities.join(' ')} ${i.status} ${i.errorMessage ?? ''}`;

export default function Screen() {
  return (
    <Page
      title="Integrations"
      demo
      description="The sources NAG reads from: three ways of observing traffic, plus identity, ticketing, cloud and code sources. Open one to see what it unlocks."
    >
      <DataTable
        label="integrations"
        rows={integrations}
        columns={columns}
        facets={facets}
        rowKey={(i) => i.id}
        searchText={searchText}
        initialSort={{ key: 'status', dir: 'asc' }}
      />
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <StubLabel what="Model providers" />
        Model providers behind the gateway are stubs: no model is called in this prototype.
      </p>
    </Page>
  );
}
