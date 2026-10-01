import { Link } from 'react-router';
import { aiSystems, getSystem, NOW, rowsForSystem, tenant } from '../../data';
import {
  COVERAGE_STATUS_LABEL,
  dateChip,
  datesForPath,
  NAG_ROLE_LABEL,
  owedBy,
  ROLE_LABEL,
} from '../../domain/aiact';
import { riskTierLabel, roleLabel } from '../../domain/classification';
import type { AiSystemView, CoverageRow } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { DemoLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { useOpenParam } from '../../ui/useOpenParam';
import { AttentionLine } from '../coverage/AttentionLine';

const DISCOVERY_LABEL = {
  gateway: 'Discovered from gateway traffic',
  manual: 'Registered manually',
} as const;

/** Inline marker for table cells; the page-level label stays the only one with the test id. */
function DemoTag() {
  return (
    <span className="ml-1 inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-900 ring-1 ring-amber-300 ring-inset">
      Demo data
    </span>
  );
}

/** Role filter value on /coverage: "both" when the system holds two roles. */
const coverageRole = (system: AiSystemView) =>
  system.classification.roles.length === 2 ? 'both' : (system.classification.roles[0] ?? 'both');

/** Query string that filters /coverage to what applies to the system. */
function coverageQuery(system: AiSystemView): string {
  const { riskTier } = system.classification;
  const params = new URLSearchParams({ system: system.id, role: coverageRole(system) });
  if (riskTier) params.set('risk', riskTier);
  return params.toString();
}

const facets: Facet<AiSystemView>[] = [
  {
    key: 'discovery',
    label: 'Discovery',
    value: (s) => s.discovery,
    format: (v) => (v === 'gateway' ? DISCOVERY_LABEL.gateway : DISCOVERY_LABEL.manual),
  },
];

function ArticleItem({ row, system }: { row: CoverageRow; system: AiSystemView }) {
  const { path, roles } = system.classification;
  const owed = owedBy(row)
    .filter((r) => roles.includes(r))
    .map((r) => ROLE_LABEL[r])
    .join(' and ');
  return (
    <li className="rounded-md border border-slate-200 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <Link
            to={`/coverage?${coverageQuery(system)}#${row.id}`}
            className="font-medium text-accent-700 hover:underline"
          >
            {row.article}
          </Link>{' '}
          <span className="text-slate-900">{row.title}</span>
        </span>
        <StatusChip status={row.status}>{COVERAGE_STATUS_LABEL[row.status]}</StatusChip>
      </div>
      <p className="mt-1 text-xs text-slate-700">
        Owed by {owed} · {NAG_ROLE_LABEL[row.nagRole]}
      </p>
      {row.note && <p className="mt-1 text-xs text-slate-700">{row.note}</p>}
      {row.attention && <AttentionLine attention={row.attention} />}
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700">
        {datesForPath(row.dates, path).map((d) => (
          <li key={`${d.date}-${d.path ?? ''}`}>
            {d.date} · {dateChip(d.date, NOW, tenant.timeZone).label}
          </li>
        ))}
      </ul>
    </li>
  );
}

function SystemDrawerBody({ system }: { system: AiSystemView }) {
  const { classification, signals } = system;
  const rows = rowsForSystem(system.id);
  return (
    <>
      <p className="text-sm text-slate-700">{system.description}</p>

      <section aria-labelledby="sys-classification">
        <h3 id="sys-classification" className="text-sm font-semibold text-slate-900">
          Classification
        </h3>
        <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-800">
          <li>{riskTierLabel(classification.riskTier)}</li>
          <li>{roleLabel(classification.roles)}</li>
          <li>{`Transparency trigger: ${classification.transparency ? 'Yes' : 'No'}`}</li>
        </ul>
      </section>

      <section aria-labelledby="sys-reasoning">
        <h3 id="sys-reasoning" className="text-sm font-semibold text-slate-900">
          Reasoning
        </h3>
        <ol className="mt-1 flex flex-col gap-2">
          {classification.reasoning.map((line) => (
            <li key={line.step} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">
                {line.step} <span className="font-normal text-slate-700">· {line.answer}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-700">{line.reason}</p>
            </li>
          ))}
        </ol>
      </section>

      {signals.length > 0 && (
        <section aria-labelledby="sys-signals">
          <h3
            id="sys-signals"
            className="flex items-center gap-2 text-sm font-semibold text-slate-900"
          >
            Signals <DemoLabel />
          </h3>
          <ul className="mt-1 flex flex-col gap-2">
            {signals.map((s) => (
              <li key={`${s.kind}-${s.observedAt}`} className="text-sm text-slate-800">
                <p>{s.text}</p>
                {s.quarantineSummary && (
                  <p className="text-xs text-slate-700">
                    Matches quarantined item: {s.quarantineSummary}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">
            A signal does not change the risk tier. Only a person who reviews the answers can do
            that.
          </p>
        </section>
      )}

      <section aria-labelledby="sys-articles">
        <h3 id="sys-articles" className="text-sm font-semibold text-slate-900">
          Applicable articles ({rows.length})
        </h3>
        <ul className="mt-1 flex flex-col gap-2">
          {rows.map((row) => (
            <ArticleItem key={row.id} row={row} system={system} />
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <Link
            to={`/coverage?${coverageQuery(system)}`}
            className="font-medium text-accent-700 hover:underline"
          >
            View on Article coverage
          </Link>
        </p>
      </section>
    </>
  );
}

export default function Screen() {
  const [openId, setOpen] = useOpenParam();
  const open = openId ? getSystem(openId) : undefined;
  const systems = aiSystems();

  const columns: Column<AiSystemView>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (s) => s.name,
      render: (s) => (
        <button
          type="button"
          onClick={() => setOpen(s.id)}
          className="text-left font-medium text-accent-700 hover:underline"
        >
          {s.name}
        </button>
      ),
    },
    {
      key: 'endpoint',
      header: 'Endpoint',
      sortValue: (s) => s.endpoint ?? '',
      render: (s) =>
        s.endpoint ? <code className="text-xs">{s.endpoint}</code> : 'Registered manually',
    },
    {
      key: 'risk',
      header: 'Risk tier',
      sortValue: (s) => riskTierLabel(s.classification.riskTier),
      render: (s) => riskTierLabel(s.classification.riskTier),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (s) => roleLabel(s.classification.roles),
      render: (s) => roleLabel(s.classification.roles),
    },
    {
      key: 'discovery',
      header: 'Discovery',
      sortValue: (s) => s.discovery,
      render: (s) =>
        s.discovery === 'gateway' ? (
          <>
            {DISCOVERY_LABEL.gateway}
            <DemoTag />
          </>
        ) : (
          DISCOVERY_LABEL.manual
        ),
    },
    {
      key: 'signals',
      header: 'Open signals',
      sortValue: (s) => s.signals.length,
      render: (s) =>
        s.signals.length === 0 ? (
          'None'
        ) : (
          <>
            {s.signals.map((sig) => (
              <span key={`${sig.kind}-${sig.observedAt}`} className="block">
                {sig.text}
              </span>
            ))}
            <DemoTag />
          </>
        ),
    },
  ];

  return (
    <Page
      title="AI systems"
      demo
      description="The AI systems in this tenant's inventory. Each risk tier and role below is the result of replaying the answers a person recorded, not a stored value."
    >
      <p className="text-sm text-slate-700">
        This is orientation to support compliance readiness, not legal advice.
      </p>
      <p className="text-sm text-slate-700">
        Discovery, drift alerts and modification flags are seeded examples (demo data); no runtime
        is connected.
      </p>
      <DataTable
        label="AI systems"
        rows={systems}
        columns={columns}
        facets={facets}
        rowKey={(s) => s.id}
        searchText={(s) => `${s.name} ${s.endpoint ?? ''} ${s.description}`}
        onRowClick={(s) => setOpen(s.id)}
      />
      <Drawer open={Boolean(open)} title={open?.name ?? ''} onClose={() => setOpen(null)}>
        {open && <SystemDrawerBody system={open} />}
      </Drawer>
    </Page>
  );
}
