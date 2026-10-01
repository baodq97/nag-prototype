import { Link, useSearchParams } from 'react-router';
import { FRAMEWORK_NAMES, itemRefs, personName, tests } from '../../data';
import type { ComplianceTest, FrameworkId } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDate } from '../../ui/format';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';
import { testFrameworks } from './helpers';

const columns: Column<ComplianceTest>[] = [
  {
    key: 'name',
    header: 'Name',
    sortValue: (t) => t.name.toLowerCase(),
    render: (t) => (
      <Link to={`/tests/${t.id}`} className="font-medium text-accent-700 hover:underline">
        {t.name}
      </Link>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    sortValue: (t) => personName(t.ownerId),
    render: (t) => personName(t.ownerId),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (t) => t.status,
    render: (t) => <StatusChip status={t.status} />,
  },
  {
    key: 'failing',
    header: 'Failing entities',
    sortValue: (t) => t.failingEntities.length,
    render: (t) => <span className="tabular-nums">{t.failingEntities.length}</span>,
  },
  {
    key: 'due',
    header: 'Due date',
    sortValue: (t) => t.dueDate,
    render: (t) => <span className="whitespace-nowrap">{fmtDate(t.dueDate)}</span>,
  },
  {
    key: 'frameworks',
    header: 'Frameworks',
    render: (t) => <span className="text-xs text-slate-700">{itemRefs(t.frameworkItemIds)}</span>,
  },
];

const facets: Facet<ComplianceTest>[] = [
  { key: 'status', label: 'Status', value: (t) => t.status, format: humanize },
  { key: 'owner', label: 'Owner', value: (t) => personName(t.ownerId) },
  {
    key: 'framework',
    label: 'Framework',
    value: (t) => testFrameworks(t),
    format: (v) => FRAMEWORK_NAMES[v as FrameworkId],
  },
];

const searchText = (t: ComplianceTest) =>
  `${t.id} ${t.name} ${personName(t.ownerId)} ${t.status} ${itemRefs(t.frameworkItemIds)}`;

export default function Screen() {
  const [params] = useSearchParams();
  return (
    <Page
      title="Tests"
      demo
      description="Automated checks that feed your controls. Open a test to see what is failing and how to fix it."
    >
      <DataTable
        key={params.get('q') ?? ''}
        label="tests"
        rows={tests}
        columns={columns}
        facets={facets}
        rowKey={(t) => t.id}
        searchText={searchText}
        initialQuery={params.get('q') ?? ''}
        initialSort={{ key: 'status', dir: 'asc' }}
      />
    </Page>
  );
}
