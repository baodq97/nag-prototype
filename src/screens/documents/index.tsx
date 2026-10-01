import { Sparkles } from 'lucide-react';
import { documents, getDocument, itemRefs, personName } from '../../data';
import type { ComplianceDocument } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDate } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { ObjectDrawer } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { useOpenParam } from '../../ui/useOpenParam';

const CADENCE: Record<ComplianceDocument['cadence'], string> = {
  quarterly: 'Quarterly',
  'semi-annual': 'Semi-annual',
  annual: 'Annual',
};

const facets: Facet<ComplianceDocument>[] = [
  { key: 'status', label: 'Status', value: (d) => d.status },
  { key: 'cadence', label: 'Cadence', value: (d) => d.cadence },
  { key: 'owner', label: 'Owner', value: (d) => personName(d.ownerId) },
];

export default function Screen() {
  const [openId, setOpen] = useOpenParam();
  const open = openId ? getDocument(openId) : undefined;

  const columns: Column<ComplianceDocument>[] = [
    {
      key: 'name',
      header: 'Document',
      sortValue: (d) => d.name,
      render: (d) => (
        <button
          type="button"
          onClick={() => setOpen(d.id)}
          className="text-left font-medium text-accent-700 hover:underline"
        >
          {d.name}
        </button>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (d) => personName(d.ownerId),
      render: (d) => personName(d.ownerId),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (d) => d.status,
      render: (d) => <StatusChip status={d.status} />,
    },
    {
      key: 'cadence',
      header: 'Renewal cadence',
      sortValue: (d) => d.cadence,
      render: (d) => CADENCE[d.cadence],
    },
    {
      key: 'next',
      header: 'Next review',
      sortValue: (d) => d.nextReview,
      render: (d) => <span className="whitespace-nowrap">{fmtDate(d.nextReview)}</span>,
    },
    {
      key: 'frameworks',
      header: 'Frameworks',
      render: (d) => itemRefs(d.frameworkItemIds),
    },
    {
      key: 'flag',
      header: 'Assistant',
      sortValue: (d) => (d.assistantFlag ? 0 : 1),
      render: (d) =>
        d.assistantFlag ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-900">
            <Sparkles size={12} aria-hidden />
            Flagged
          </span>
        ) : (
          <span className="text-xs text-slate-600">–</span>
        ),
    },
  ];

  return (
    <Page
      title="Documents"
      description="Compliance documents with their renewal cadence and approval status. Some carry a note from the assistant when the evidence does not show what a control needs."
    >
      <DataTable
        label="documents"
        rows={documents}
        columns={columns}
        facets={facets}
        rowKey={(d) => d.id}
        searchText={(d) =>
          `${d.id} ${d.name} ${personName(d.ownerId)} ${itemRefs(d.frameworkItemIds)}`
        }
        onRowClick={(d) => setOpen(d.id)}
      />
      <ObjectDrawer
        onClose={() => setOpen(null)}
        object={
          open && {
            id: open.id,
            kind: 'Document',
            title: open.name,
            owner: personName(open.ownerId),
            status: open.status,
            due: { label: 'Next review', value: fmtDate(open.nextReview) },
            frameworkItemIds: open.frameworkItemIds,
            history: open.history,
            comments: open.comments,
          }
        }
      >
        {open && (
          <>
            <p className="text-sm text-slate-700">
              Renewal cadence: {CADENCE[open.cadence]}. Last reviewed {fmtDate(open.lastReviewed)}.
            </p>
            {open.assistantFlag && (
              <aside
                aria-label="Assistant note"
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  Assistant <StubLabel what="Assistant answer engine" />
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  The evidence does not show what the control needs. {open.assistantFlag}
                </p>
              </aside>
            )}
          </>
        )}
      </ObjectDrawer>
    </Page>
  );
}
