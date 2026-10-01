import { getPolicy, itemRefs, personName, policies, policyRenewal } from '../../data';
import { REVIEW_STATE_LABEL } from '../../domain/review';
import type { Policy, ReviewState } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDate } from '../../ui/format';
import { ObjectDrawer } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';
import { useOpenParam } from '../../ui/useOpenParam';

const approvers = (p: Policy) => p.approverIds.map(personName).join(', ');

/** What the status reads: "Expired" replaces "Approved" once the renewal date has passed. */
const shownStatus = (p: Policy) => {
  const renewal = policyRenewal(p);
  return renewal === 'current' ? p.status : renewal;
};
const statusLabel = (s: string) =>
  s in REVIEW_STATE_LABEL ? REVIEW_STATE_LABEL[s as ReviewState] : humanize(s);

const facets: Facet<Policy>[] = [
  { key: 'status', label: 'Status', value: shownStatus, format: statusLabel },
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
      sortValue: shownStatus,
      render: (p) => <StatusChip status={shownStatus(p)} />,
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
        searchText={(p) =>
          `${p.id} ${p.name} ${statusLabel(shownStatus(p))} ${personName(p.ownerId)} ${approvers(p)}`
        }
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
            status: shownStatus(open),
            due: { label: 'Renewal', value: fmtDate(open.renewalDate) },
            frameworkItemIds: open.frameworkItemIds,
            history: open.history,
            comments: open.comments,
          }
        }
      >
        {open && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-medium text-slate-600">Version</dt>
                <dd className="text-sm text-slate-900">v{open.version}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Approvers</dt>
                <dd className="text-sm text-slate-900">{approvers(open)}</dd>
              </div>
            </dl>
            <p className="text-xs text-slate-600">
              Covers {itemRefs(open.frameworkItemIds) || 'no framework items'}.
            </p>
          </div>
        )}
      </ObjectDrawer>
    </Page>
  );
}
