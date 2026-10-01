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
import { RISK_TIER_NAME, RISK_TIER_NUMBER } from '../../domain/classification';
import type {
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
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { useOpenParam } from '../../ui/useOpenParam';

const LINK = 'text-accent-700 hover:underline';

const GROUPS = Object.keys(ARTICLE_GROUPS) as ArticleGroup[];
const ROLES: { value: RoleFilter; label: string }[] = [
  { value: 'provider', label: 'Provider' },
  { value: 'deployer', label: 'Deployer' },
  { value: 'both', label: 'Both' },
];
const RISKS: { value: RiskTier; label: string }[] = [
  { value: 'prohibited', label: 'Prohibited' },
  { value: 'high', label: 'High' },
  { value: 'transparency', label: 'Transparency' },
  { value: 'minimal', label: 'Minimal' },
];
const NAG_ROLES = Object.keys(NAG_ROLE_LABEL) as NagRole[];
const STATUSES = Object.keys(COVERAGE_STATUS_LABEL) as CoverageStatus[];

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

function Dates({ dates, list = true }: { dates: ApplicationDate[]; list?: boolean }) {
  if (dates.length === 0) return <span className="text-slate-600">–</span>;
  return (
    <ul className={list ? 'flex flex-col gap-1' : 'flex flex-col gap-2'}>
      {dates.map((d) => {
        const chip = dateChip(d.date, NOW, tenant.timeZone);
        return (
          <li key={`${d.date}-${d.path ?? ''}`} className="text-sm">
            <span className="tabular-nums">{d.date}</span>{' '}
            <StatusChip variant={chip.appliesNow ? 'success' : 'neutral'}>{chip.label}</StatusChip>
            {!list && d.note && (
              <span className="mt-0.5 block text-xs text-slate-600">{d.note}</span>
            )}
          </li>
        );
      })}
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
            <ul className="flex flex-col gap-0.5">
              {row.riskTiers.map((t) => (
                <li key={t}>
                  Risk tier {RISK_TIER_NUMBER[t]} · {RISK_TIER_NAME[t]}
                </li>
              ))}
            </ul>
          )}
        </Field>
      </dl>
      {row.outsideReason && (
        <Section title="Why NAG does not cover this">{row.outsideReason}</Section>
      )}
      <Section title="What NAG does">{row.nagDoes}</Section>
      <Section title="What stays with you">{row.customerKeeps}</Section>
      <Section title="Application dates">
        <Dates dates={dates} list={false} />
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
    <Page
      title="Article coverage"
      description="For each EU AI Act article: who owes the duty, what NAG does, what stays with you, and the tests and controls behind it. This is orientation to support compliance readiness, not legal advice."
    >
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
          <FilterSelect
            label="Status"
            value={filters.status ?? ''}
            options={STATUSES.map((s) => ({ value: s, label: COVERAGE_STATUS_LABEL[s] }))}
            onChange={(v) => setParam('status', v)}
          />
          {filtering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    for (const k of ['group', 'role', 'risk', 'nag', 'status', 'q']) next.delete(k);
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Coverage by article</caption>
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['Article', 'Provider', 'Deployer', "NAG's role", 'Dates', 'Status'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  id={row.id}
                  className={`scroll-mt-20 ${highlighted === row.id ? 'bg-accent-50' : ''}`}
                >
                  <td className="max-w-sm px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => setOpen(row.id)}
                      className="font-medium whitespace-nowrap text-accent-700 hover:underline"
                    >
                      {row.article}
                    </button>
                    <span className="block text-xs text-slate-700">{row.title}</span>
                    {row.outsideReason && (
                      <span className="mt-1 block text-xs text-slate-600">{row.outsideReason}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">{dutyLabel(row.provider)}</td>
                  <td className="px-3 py-2 align-top">{dutyLabel(row.deployer)}</td>
                  <td className="px-3 py-2 align-top">
                    <span className="flex flex-col items-start gap-1">
                      {NAG_ROLE_LABEL[row.nagRole]}
                      {row.nagRole === 'control' && <ContinuousEvidence />}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Dates dates={datesOf(row)} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <StatusChip status={row.status}>{COVERAGE_STATUS_LABEL[row.status]}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
