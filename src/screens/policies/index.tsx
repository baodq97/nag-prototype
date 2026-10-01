import { getPolicy, itemRefs, personName, policies } from '../../data';
import type { Policy } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDate } from '../../ui/format';
import { ObjectDrawer } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { useOpenParam } from '../../ui/useOpenParam';

const approvers = (p: Policy) => p.approverIds.map(personName).join(', ');

const facets: Facet<Policy>[] = [
  { key: 'status', label: 'Status', value: (p) => p.status },
  { key: 'owner', label: 'Owner', value: (p) => personName(p.ownerId) },
];

export default function Screen() {
  const [openId, setOpen] = useOpenParam();
  const open = openId ? getPolicy(openId) : undefined;

  const columns: Column<Policy>[] = [
    {
      key: 'name',
      header: 'Policy',
      sortValue: (p) => p.name,
      render: (p) => (
        <button
          type="button"
          onClick={() => setOpen(p.id)}
          className="text-left font-medium text-accent-700 hover:underline"
        >
          {p.name}
        </button>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      sortValue: (p) => p.version,
      render: (p) => <span className="tabular-nums">v{p.version}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (p) => personName(p.ownerId),
      render: (p) => personName(p.ownerId),
    },
    { key: 'approvers', header: 'Approvers', render: (p) => approvers(p) },
    {
      key: 'renewal',
      header: 'Renewal date',
      sortValue: (p) => p.renewalDate,
      render: (p) => <span className="whitespace-nowrap">{fmtDate(p.renewalDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      render: (p) => <StatusChip status={p.status} />,
    },
  ];

  return (
    <Page
      title="Policies"
      description="Written policies with their version, approvers and renewal date."
    >
      <DataTable
        label="policies"
        rows={policies}
        columns={columns}
        facets={facets}
        rowKey={(p) => p.id}
        searchText={(p) => `${p.id} ${p.name} ${personName(p.ownerId)} ${approvers(p)}`}
        onRowClick={(p) => setOpen(p.id)}
      />
      <ObjectDrawer
        onClose={() => setOpen(null)}
        object={
          open && {
            id: open.id,
            kind: 'Policy',
            title: open.name,
            owner: personName(open.ownerId),
            status: open.status,
            due: { label: 'Renewal', value: fmtDate(open.renewalDate) },
            frameworkItemIds: open.frameworkItemIds,
            history: open.history,
            comments: open.comments,
          }
        }
      >
        {open && (
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs font-medium text-slate-600">Version</dt>
              <dd className="text-sm text-slate-900">v{open.version}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Approvers</dt>
              <dd className="text-sm text-slate-900">{approvers(open)}</dd>
            </div>
            <div className="col-span-2 text-xs text-slate-600">
              Covers {itemRefs(open.frameworkItemIds) || 'no framework items'}.
            </div>
          </dl>
        )}
      </ObjectDrawer>
    </Page>
  );
}
