import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  ARTICLE_GROUPS,
  NOW,
  articleRows,
  getArticleRow,
  getControl,
  getSystem,
  getTest,
  tenant,
} from '../../data';
import {
  COVERAGE_STATUS_LABEL,
  INCIDENT_CLOCK_DAYS,
  INCIDENT_KIND_LABEL,
  NAG_ROLE_LABEL,
  type RoleFilter,
  dateChip,
  datesForPath,
  dutyLabel,
  rowOwedBy,
} from '../../domain/aiact';
import { riskTierLabel } from '../../domain/classification';
import { COVERAGE_ORDER, coverageByGroup, coverageCounts } from '../../domain/summaries';
import type {
  AnnexPath,
  ApplicationDate,
  ArticleGroup,
  CoverageRow,
  CoverageStatus,
  NagRole,
  RiskTier,
} from '../../domain/types';
import { Button } from '../../ui/Button';
import { Drawer } from '../../ui/Drawer';
import { StubLabel } from '../../ui/Labels';
import { fmtDate } from '../../ui/format';
import { Page } from '../../ui/Page';
import { RiskTierChip } from '../../ui/RiskTierChip';
import { statusInfo } from '../../ui/status';
import { StatusChip } from '../../ui/StatusChip';
import { SummaryStrip } from '../../ui/SummaryStrip';
import { useOpenParam } from '../../ui/useOpenParam';
import { AttentionLine } from './AttentionLine';

const LINK = 'text-accent-700 hover:underline';

const GROUPS = Object.keys(ARTICLE_GROUPS) as ArticleGroup[];
const ROLES: { value: RoleFilter; label: string }[] = [
  { value: 'provider', label: 'Provider' },
  { value: 'deployer', label: 'Deployer' },
  { value: 'both', label: 'Both' },
];
const RISKS: { value: RiskTier; label: string }[] = (
  ['prohibited', 'high', 'transparency', 'minimal'] as const
).map((value) => ({ value, label: riskTierLabel(value) }));
const PATH_LABEL: Record<AnnexPath, string> = { 'annex-i': 'Annex I', 'annex-iii': 'Annex III' };
const NAG_ROLES = Object.keys(NAG_ROLE_LABEL) as NagRole[];
const STATUSES = COVERAGE_ORDER;

const CLOCK_KINDS = ['widespread-or-critical', 'death', 'serious'] as const;

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  allowed.find((a) => a === value);

interface Filters {
  group?: ArticleGroup;
  role?: RoleFilter;
  risk?: RiskTier;
  nag?: NagRole;
  status?: CoverageStatus;
  q: string;
}

function matches(row: CoverageRow, f: Filters): boolean {
  const q = f.q.trim().toLowerCase();
  return (
    (!f.group || row.group === f.group) &&
    (!f.role || rowOwedBy(row, f.role)) &&
    (!f.risk || row.riskTiers.includes(f.risk)) &&
    (!f.nag || row.nagRole === f.nag) &&
    (!f.status || row.status === f.status) &&
    (!q || `${row.article} ${row.title}`.toLowerCase().includes(q))
  );
}

function ContinuousEvidence() {
  return (
    <span className="inline-flex items-center rounded-md bg-accent-50 px-1.5 py-0.5 text-xs font-medium text-accent-800 ring-1 ring-accent-200 ring-inset">
      Continuous evidence
    </span>
  );
}

const appliesNow = (date: string) => dateChip(date, NOW, tenant.timeZone).appliesNow;

/** The path a date belongs to, when the row has dates for more than one. */
const pathNote = (d: ApplicationDate, all: ApplicationDate[]) =>
  d.path && all.length > 1 ? ` (${PATH_LABEL[d.path]})` : '';

/** One compact line in the table; "Applies now" only on a date that has passed. */
function DateLine({ dates }: { dates: ApplicationDate[] }) {
  if (dates.length === 0) return <span className="text-slate-600">–</span>;
  return (
    <span className="flex flex-col items-start gap-y-1">
      {dates.map((d) => (
        <span
          key={`${d.date}-${d.path ?? ''}`}
          data-testid="date-line"
          className="flex max-w-full flex-col items-start gap-0.5"
        >
          <span className="whitespace-nowrap">
            <span className="tabular-nums">{fmtDate(d.date)}</span>
            {pathNote(d, dates)}
          </span>
          {appliesNow(d.date) && (
            <span data-testid="applies-now" className="whitespace-nowrap">
              <StatusChip variant="success" description="">
                Applies now
              </StatusChip>
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/** The drawer's full list: date, whether it applies now, and the note a date carries. */
function Dates({ dates }: { dates: ApplicationDate[] }) {
  if (dates.length === 0) return <span className="text-slate-600">–</span>;
  return (
    <ul className="flex flex-col gap-2">
      {dates.map((d) => (
        <li key={`${d.date}-${d.path ?? ''}`} className="text-sm">
          <span className="tabular-nums">{fmtDate(d.date)}</span>
          {pathNote(d, dates)}{' '}
          {appliesNow(d.date) ? (
            <StatusChip variant="success" description="">
              Applies now
            </StatusChip>
          ) : (
            <span className="text-slate-600">Not yet applying</span>
          )}
          {d.note && <span className="mt-0.5 block text-xs text-slate-600">{d.note}</span>}
        </li>
      ))}
    </ul>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-sm text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Linked({ ids, render }: { ids: string[]; render: (id: string) => ReactNode }) {
  if (ids.length === 0) return <p className="text-slate-600">None</p>;
  return (
    <ul className="flex flex-col gap-1">
      {ids.map((id) => (
        <li key={id}>{render(id)}</li>
      ))}
    </ul>
  );
}

function RowDrawerBody({ row, dates }: { row: CoverageRow; dates: ApplicationDate[] }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-3">
        <Field label="Group">{ARTICLE_GROUPS[row.group]}</Field>
        <Field label="Status">
          <StatusChip status={row.status}>{COVERAGE_STATUS_LABEL[row.status]}</StatusChip>
        </Field>
        <Field label="Provider">{dutyLabel(row.provider)}</Field>
        <Field label="Deployer">{dutyLabel(row.deployer)}</Field>
        <Field label="NAG's role">
          <span className="flex flex-wrap items-center gap-2">
            {NAG_ROLE_LABEL[row.nagRole]}
            {row.nagRole === 'control' && <ContinuousEvidence />}
          </span>
        </Field>
        <Field label="Risk tier">
          {row.riskTiers.length === 0 ? (
            '–'
          ) : (
            <ul className="flex flex-col items-start gap-1">
              {row.riskTiers.map((t) => (
                <li key={t}>
                  <RiskTierChip riskTier={t} />
                </li>
              ))}
            </ul>
          )}
        </Field>
      </dl>
      {row.outsideReason && (
        <Section title="Why NAG does not cover this">{row.outsideReason}</Section>
      )}
      {row.note && <Section title="Note">{row.note}</Section>}
      {row.attention && (
        <Section title="Why it needs attention">
          <AttentionLine attention={row.attention} />
        </Section>
      )}
      <Section title="What NAG does">{row.nagDoes}</Section>
      <Section title="What stays with you">{row.customerKeeps}</Section>
      <Section title="Application dates">
        <Dates dates={dates} />
      </Section>
      <Section title={`Linked controls (${row.controlIds.length})`}>
        <Linked
          ids={row.controlIds}
          render={(id) => (
            <Link to={`/controls?open=${id}`} className={LINK}>
              {getControl(id)?.name ?? id}
            </Link>
          )}
        />
      </Section>
      <Section title={`Linked tests (${row.testIds.length})`}>
        <Linked
          ids={row.testIds}
          render={(id) => (
            <Link to={`/tests/${id}`} className={LINK}>
              {getTest(id)?.name ?? id}
            </Link>
          )}
        />
      </Section>
      {row.stub && (
        <Section title="Prototype note">
          <p className="flex flex-wrap items-center gap-2">
            <StubLabel what={row.article} />
            <span>{row.stub}</span>
          </p>
        </Section>
      )}
      {row.id === 'aia-73' && (
        <Section title="Serious incident reporting clocks">
          <p className="mb-1 flex items-center gap-2 text-xs text-slate-600">
            <StubLabel what="Incident reporting" />
            Time to report counts from the day the provider becomes aware.
          </p>
          <ul className="flex flex-col gap-1">
            {CLOCK_KINDS.map((k) => (
              <li key={k}>
                <span className="font-medium tabular-nums">{INCIDENT_CLOCK_DAYS[k]} days</span>
                {' · '}
                {INCIDENT_KIND_LABEL[k]}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

export default function Screen() {
  const { hash, search } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [openId, setOpen] = useOpenParam();

  const system = params.get('system') ? getSystem(params.get('system')!) : undefined;
  const filters: Filters = {
    group: oneOf(params.get('group'), GROUPS),
    role: oneOf(
      params.get('role'),
      ROLES.map((r) => r.value),
    ),
    risk: oneOf(
      params.get('risk'),
      RISKS.map((r) => r.value),
    ),
    nag: oneOf(params.get('nag'), NAG_ROLES),
    status: oneOf(params.get('status'), STATUSES),
    q: params.get('q') ?? '',
  };

  const all = useMemo(() => articleRows(), []);
  const rows = all.filter((r) => matches(r, filters));
  // The strip counts what the other filters leave, so a tile never promises rows that are hidden.
  const counts = coverageCounts(all.filter((r) => matches(r, { ...filters, status: undefined })));
  const groups = coverageByGroup(rows);
  const datesOf = (r: CoverageRow) => datesForPath(r.dates, system?.classification.path);

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const clearSystem = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of ['system', 'role', 'risk']) next.delete(k);
        return next;
      },
      { replace: true },
    );

  // Command search and the AI systems screen link to /coverage#aia-14: open that row's drawer,
  // highlight it and bring it into view. Closing the drawer must not reopen it, so each hash is
  // handled once. Opening keeps the hash, so the row stays highlighted while its drawer is open.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!hash || handled.current === hash) return;
    handled.current = hash;
    const id = decodeURIComponent(hash.slice(1));
    if (!getArticleRow(id)) return;
    const next = new URLSearchParams(search);
    next.set('open', id);
    navigate({ search: `?${next}`, hash }, { replace: true });
    document.getElementById(id)?.scrollIntoView({ block: 'center' });
  }, [hash, search, navigate]);

  const selected = openId ? getArticleRow(openId) : undefined;
  const highlighted = decodeURIComponent(hash.slice(1));
  const filtering = Object.values(filters).some(Boolean);

  return (
    <Page title="Article coverage">
      {system && (
        <p
          className="flex flex-wrap items-center gap-2 rounded-md bg-accent-50 px-3 py-2 text-sm text-accent-900"
          role="status"
        >
          <span>Showing articles for {system.name}</span>
          <Button size="sm" onClick={clearSystem}>
            Clear
          </Button>
        </p>
      )}
      <SummaryStrip
        label="Coverage by status"
        tiles={COVERAGE_ORDER.map((status) => {
          const info = statusInfo(status);
          return {
            key: status,
            label: COVERAGE_STATUS_LABEL[status],
            value: counts[status],
            icon: info.icon,
            tone: info.variant,
          };
        })}
        active={filters.status ?? null}
        onSelect={(key) => setParam('status', key ?? '')}
      />
      <p className="text-xs text-slate-600">
        This is orientation to support compliance readiness, not legal advice.
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
          <label className="flex items-center gap-1 text-sm text-slate-700">
            <span className="sr-only">Search articles</span>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Search articles…"
              className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm placeholder:text-slate-500 focus:border-accent-600 focus:ring-1 focus:ring-accent-600 focus:outline-none"
            />
          </label>
          <FilterSelect
            label="Group"
            value={filters.group ?? ''}
            options={GROUPS.map((g) => ({ value: g, label: ARTICLE_GROUPS[g] }))}
            onChange={(v) => setParam('group', v)}
          />
          <FilterSelect
            label="My role"
            value={filters.role ?? ''}
            options={ROLES}
            onChange={(v) => setParam('role', v)}
          />
          <FilterSelect
            label="Risk tier"
            value={filters.risk ?? ''}
            options={RISKS}
            onChange={(v) => setParam('risk', v)}
          />
          <FilterSelect
            label="NAG's role"
            value={filters.nag ?? ''}
            options={NAG_ROLES.map((r) => ({ value: r, label: NAG_ROLE_LABEL[r] }))}
            onChange={(v) => setParam('nag', v)}
          />
          {filtering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    // The system line names a filter too: clearing leaves no stale "Showing
                    // articles for …" above the full list.
                    for (const k of ['system', 'group', 'role', 'risk', 'nag', 'status', 'q']) {
                      next.delete(k);
                    }
                    return next;
                  },
                  { replace: true },
                )
              }
            >
              Clear filters
            </Button>
          )}
          <span className="ml-auto text-xs text-slate-600" aria-live="polite">
            Showing {rows.length} of {all.length} articles
          </span>
        </div>
        <div>
          {groups.map(({ group, rows: inGroup }, i) => (
            <section key={group} aria-labelledby={`group-${group}`}>
              <h2
                id={`group-${group}`}
                className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900"
              >
                {group}. {ARTICLE_GROUPS[group]}{' '}
                <span className="font-normal text-slate-600">({inGroup.length})</span>
              </h2>
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">{ARTICLE_GROUPS[group]}</caption>
                <colgroup>
                  <col className="w-[27%]" />
                  <col className="w-[13%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className={`bg-white text-xs text-slate-600 ${i === 0 ? '' : 'sr-only'}`}>
                  <tr>
                    {['Article', 'Provider', 'Deployer', "NAG's role", 'Dates', 'Status'].map(
                      (h) => (
                        <th key={h} scope="col" className="px-2 py-1.5 font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inGroup.map((row) => (
                    <tr
                      key={row.id}
                      id={row.id}
                      className={`scroll-mt-20 ${highlighted === row.id ? 'bg-accent-50' : ''}`}
                    >
                      <td className="px-2 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => setOpen(row.id)}
                          className="font-medium whitespace-nowrap text-accent-700 hover:underline"
                        >
                          {row.article}
                        </button>
                        <span className="line-clamp-1 text-xs text-slate-700" title={row.title}>
                          {row.title}
                        </span>
                        {(row.outsideReason ?? row.note) && (
                          <span
                            className="line-clamp-1 text-xs text-slate-600"
                            title={row.outsideReason ?? row.note}
                          >
                            {row.outsideReason ?? row.note}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <span className="line-clamp-3" title={dutyLabel(row.provider)}>
                          {dutyLabel(row.provider)}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <span className="line-clamp-3" title={dutyLabel(row.deployer)}>
                          {dutyLabel(row.deployer)}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <span className="flex flex-col items-start gap-1">
                          {NAG_ROLE_LABEL[row.nagRole]}
                          {row.nagRole === 'control' && <ContinuousEvidence />}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <DateLine dates={datesOf(row)} />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <StatusChip status={row.status}>
                          {COVERAGE_STATUS_LABEL[row.status]}
                        </StatusChip>
                        {row.attention && <AttentionLine attention={row.attention} compact />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No articles match these filters</p>
              <p className="text-xs text-slate-600">Change the search text or choose “All”.</p>
            </div>
          )}
        </div>
      </div>
      <Drawer
        open={selected !== undefined}
        onClose={() => setOpen(null)}
        title={selected ? `${selected.article} ${selected.title}` : ''}
        subtitle={selected && ARTICLE_GROUPS[selected.group]}
      >
        {selected && <RowDrawerBody row={selected} dates={datesOf(selected)} />}
      </Drawer>
    </Page>
  );
}
