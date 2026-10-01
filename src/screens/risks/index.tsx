import { Link } from 'react-router';
import { getControl, getRisk, personName, risks } from '../../data';
import { riskLevel, score } from '../../domain/risk';
import type { Risk, RiskScore } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDate } from '../../ui/format';
import { ObjectDrawer } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';
import { useOpenParam } from '../../ui/useOpenParam';

function ScoreChip({ value }: { value: RiskScore }) {
  const total = score(value);
  const level = riskLevel(total);
  return (
    <StatusChip status={level}>
      <span className="tabular-nums">{total}</span> · {humanize(level)}
    </StatusChip>
  );
}

const facets: Facet<Risk>[] = [
  { key: 'status', label: 'Status', value: (r) => r.status, format: humanize },
  { key: 'treatment', label: 'Treatment', value: (r) => r.treatment, format: humanize },
  { key: 'owner', label: 'Owner', value: (r) => personName(r.ownerId) },
];

function Breakdown({ label, value }: { label: string; value: RiskScore }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="text-xs font-medium text-slate-600">{label} score</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-slate-900">
        <span data-testid={`${label.toLowerCase()}-score`} className="font-semibold tabular-nums">
          {score(value)}
        </span>
        <ScoreChip value={value} />
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Likelihood {value.likelihood} × impact {value.impact} = {score(value)}
      </p>
    </div>
  );
}

export default function Screen() {
  const [openId, setOpen] = useOpenParam();
  const open = openId ? getRisk(openId) : undefined;

  const columns: Column<Risk>[] = [
    {
      key: 'scenario',
      header: 'Scenario',
      sortValue: (r) => r.scenario,
      render: (r) => (
        <button
          type="button"
          onClick={() => setOpen(r.id)}
          className="text-left font-medium text-accent-700 hover:underline"
        >
          {r.scenario}
        </button>
      ),
    },
    {
      key: 'inherent',
      header: 'Inherent',
      sortValue: (r) => score(r.inherent),
      render: (r) => <ScoreChip value={r.inherent} />,
    },
    {
      key: 'treatment',
      header: 'Treatment',
      sortValue: (r) => r.treatment,
      render: (r) => humanize(r.treatment),
    },
    {
      key: 'residual',
      header: 'Residual',
      sortValue: (r) => score(r.residual),
      render: (r) => <ScoreChip value={r.residual} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (r) => personName(r.ownerId),
      render: (r) => personName(r.ownerId),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => <StatusChip status={r.status} />,
    },
  ];

  return (
    <Page title="Risk register">
      <DataTable
        label="risks"
        rows={risks}
        columns={columns}
        facets={facets}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.id} ${r.scenario} ${r.category} ${personName(r.ownerId)}`}
        onRowClick={(r) => setOpen(r.id)}
      />
      <p className="text-xs text-slate-600">
        Each score is likelihood × impact, both on a 1–5 scale. Residual risk is never above
        inherent risk.
      </p>
      <ObjectDrawer
        onClose={() => setOpen(null)}
        object={
          open && {
            id: open.id,
            kind: 'Risk',
            title: open.scenario,
            owner: personName(open.ownerId),
            status: open.status,
            due: { label: 'Due date', value: fmtDate(open.dueDate) },
            frameworkItemIds: open.frameworkItemIds,
            history: open.history,
            comments: open.comments,
          }
        }
      >
        {open && (
          <>
            <p className="text-sm text-slate-700">
              Category: {open.category}. Treatment: {humanize(open.treatment).toLowerCase()}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Breakdown label="Inherent" value={open.inherent} />
              <Breakdown label="Residual" value={open.residual} />
            </div>
            <section aria-label="Linked controls">
              <h3 className="text-sm font-semibold text-slate-900">Linked controls</h3>
              {open.controlIds.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">No controls linked.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1">
                  {open.controlIds.map((id) => (
                    <li key={id} className="text-sm">
                      <Link
                        to={`/controls?open=${id}`}
                        className="font-medium text-accent-700 hover:underline"
                      >
                        {id}
                      </Link>{' '}
                      <span className="text-slate-700">{getControl(id)?.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </ObjectDrawer>
    </Page>
  );
}
