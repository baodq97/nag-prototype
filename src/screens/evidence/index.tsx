import { ArrowRight, ShieldCheck } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authorities, evidence, getTest, ledgerOperations, verification } from '../../data';
import { CODES, getCode } from '../../domain/codes';
import { pageForRange } from '../../domain/evidence-paging';
import { runSummary } from '../../domain/ledger-ops';
import { type VerificationSummary, verificationSummary } from '../../domain/summaries';
import type { EvidenceRecord, RangeVerification } from '../../domain/types';
import { lastVerification } from '../../seed/runtime';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { DataTable, type Column, type Facet, type Sort } from '../../ui/DataTable';
import { sortRows } from '../../ui/sort';
import { Drawer } from '../../ui/Drawer';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { useOpenParam } from '../../ui/useOpenParam';
import { eventType } from './event-types';

const PAGE_SIZE = 50;
const INITIAL_SORT: Sort = { key: 'seq', dir: 'desc' };

/** The page in `?page=N`; a missing or invalid value is page 1 (the table also clamps the top). */
const pageFromParam = (value: string | null) => {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n >= 1 ? n : 1;
};

const short = (value: string, keep = 22) =>
  value.length > keep ? `${value.slice(0, keep)}…` : value;

function EventLabel({ code, size = 14 }: { code: string; size?: number }) {
  const { label, icon: Icon } = eventType(code);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon size={size} aria-hidden className="shrink-0 text-slate-600" />
      {label}
    </span>
  );
}

const columns = (open: (r: EvidenceRecord) => void): Column<EvidenceRecord>[] => [
  {
    key: 'seq',
    header: 'Seq',
    sortValue: (r) => r.seq,
    render: (r) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open(r);
        }}
        aria-label={`Open record ${r.seq}`}
        className="font-mono text-sm font-medium text-accent-700 underline-offset-2 hover:underline"
      >
        {r.seq}
      </button>
    ),
  },
  {
    key: 'timestamp',
    header: 'Timestamp',
    sortValue: (r) => r.timestamp,
    render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.timestamp)}</span>,
  },
  {
    key: 'code',
    header: 'Event type',
    sortValue: (r) => eventType(r.code).label,
    render: (r) => <EventLabel code={r.code} />,
  },
  {
    key: 'endpoint',
    header: 'Endpoint',
    sortValue: (r) => r.endpoint,
    render: (r) => <span className="font-mono text-xs">{r.endpoint}</span>,
  },
  {
    key: 'digest',
    header: 'Keyed digest',
    render: (r) => (
      <span className="font-mono text-xs text-slate-700" title={r.digest}>
        {short(r.digest)}
      </span>
    ),
  },
];

const facets: Facet<EvidenceRecord>[] = [
  { key: 'code', label: 'Event type', value: (r) => eventType(r.code).label },
  { key: 'endpoint', label: 'Endpoint', value: (r) => r.endpoint },
];

function Pair({
  label,
  className,
  identifier = false,
  children,
}: {
  label: ReactNode;
  className?: string;
  /** Identifiers (hashes, roots, tokens) may break anywhere; prose wraps at spaces only. */
  identifier?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-900 ${identifier ? 'break-all' : ''}`}>
        {children}
      </dd>
    </div>
  );
}

function Layer({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="flex flex-col gap-2">{children}</dl>
    </section>
  );
}

function RecordDetail({ record }: { record: EvidenceRecord }) {
  return (
    <>
      <p className="text-sm text-slate-700">
        {eventType(record.code).label} on{' '}
        <span className="font-mono text-xs">{record.endpoint}</span> at{' '}
        {fmtDateTime(record.timestamp)}. Only a keyed digest is kept, never the content.
      </p>
      <Layer title="Event type">
        <Pair label="Label">{eventType(record.code).label}</Pair>
        <Pair label="Full name">{getCode(record.code).label}</Pair>
        <Pair identifier label="Code ID">
          <span className="font-mono text-xs">{record.code}</span>
        </Pair>
        <Pair label="Kind">{getCode(record.code).kind === 'decision' ? 'Decision' : 'Error'}</Pair>
      </Layer>
      <Layer title="L1 · Hash chain">
        <Pair identifier label="Previous hash">
          <span className="font-mono text-xs">{record.prevHash}</span>
        </Pair>
        <Pair identifier label="Own hash">
          <span className="font-mono text-xs">{record.hash}</span>
        </Pair>
      </Layer>
      <Layer title="L2 · Merkle batch">
        <Pair label="Leaf index">{record.leafIndex}</Pair>
        <Pair identifier label="Batch">
          {record.batchId}
        </Pair>
        <Pair identifier label="Merkle root">
          <span className="font-mono text-xs">{record.merkleRoot}</span>
        </Pair>
      </Layer>
      <Layer
        title={
          <>
            L3 · Timestamp anchor <StubLabel what="External timestamp authority" />
          </>
        }
      >
        <Pair label="Provider">{record.anchor.provider}</Pair>
        <Pair identifier label="Token">
          <span className="font-mono text-xs">{record.anchor.token}</span>
        </Pair>
        <Pair label="Anchored at">{fmtDateTime(record.anchor.anchoredAt)}</Pair>
      </Layer>
    </>
  );
}

function VerificationResults({
  ranges,
  searchFor,
}: {
  ranges: RangeVerification[];
  /** The URL search string that opens the table page holding the range, with no filters. */
  searchFor: (range: { fromSeq: number; toSeq: number }) => string;
}) {
  return (
    <div className="mt-3 overflow-x-auto border-t border-slate-100 pt-2">
      <h3 className="sr-only">Verification result per range and layer</h3>
      <div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-600">
            <tr>
              <th scope="col" className="px-2 py-1.5 font-medium">
                Range
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                Result
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                L1 hash chain
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                L2 Merkle batches
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                L3 anchors
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranges.map((r) => (
              <tr key={r.fromSeq} data-testid={`range-${r.fromSeq}`}>
                <th scope="row" className="px-2 py-1.5 font-mono text-sm font-medium">
                  <Link
                    to={{ search: searchFor(r) }}
                    className="text-accent-700 underline-offset-2 hover:underline"
                  >
                    {r.fromSeq}–{r.toSeq}
                  </Link>
                </th>
                <td className="px-2 py-1.5">
                  {r.ok ? (
                    <StatusChip status="verified">Verified</StatusChip>
                  ) : (
                    <StatusChip status="gap" />
                  )}
                </td>
                {r.layers.map((l) => (
                  <td
                    key={l.layer}
                    className={`px-2 py-1.5 text-xs ${l.ok ? 'text-slate-700' : 'font-semibold text-red-700'}`}
                  >
                    {l.message}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const two = (n: number) => String(n).padStart(2, '0');

function OperationsCard() {
  const { schedule, lastRun, nextRunAt } = useMemo(() => ledgerOperations(), []);
  const { authorities: list, failover } = authorities();
  const failing = lastRun.failing.flatMap((r) => r.layers.filter((l) => !l.ok));
  return (
    <Card title="Operations">
      <dl className="grid gap-x-6 gap-y-2 lg:grid-cols-4">
        <Pair label="Schedule">
          {schedule.name}, every {WEEKDAYS[schedule.weekday]} {two(schedule.hour)}:
          {two(schedule.minute)} tenant time
        </Pair>
        <Pair label="Next run">{fmtDateTime(nextRunAt)}</Pair>
        <Pair label="Last run">
          {fmtDateTime(lastRun.at)}, {lastRun.records} records covered
        </Pair>
        <Pair label="Last run result">
          <StatusChip variant={lastRun.failing.length > 0 ? 'danger' : 'success'}>
            {runSummary(lastRun)}
          </StatusChip>
          {failing.length > 0 && (
            <ul className="mt-1 text-xs font-semibold text-red-700">
              {failing.map((l) => (
                <li key={`${l.layer}-${l.message}`}>
                  {l.layer}: {l.message}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-1 block text-xs text-slate-600">
            Computed by the same verification as Verify, over the records held at the run time.
          </span>
        </Pair>
        <Pair
          className="lg:col-span-4"
          label={
            <>
              Timestamp authorities <StubLabel what="The timestamp authorities" />
            </>
          }
        >
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                {a.name}
                <StatusChip variant={a.role === 'active' ? 'success' : 'neutral'}>
                  {a.role === 'active' ? 'Active' : 'Standby'}
                </StatusChip>
              </li>
            ))}
          </ul>
          <span className="mt-1 block text-xs text-slate-600">
            Last failover {fmtDateTime(failover.at)}: {failover.from} → {failover.to}.{' '}
            {failover.reason}
          </span>
        </Pair>
      </dl>
    </Card>
  );
}

function CodesCard() {
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-900">
        Event types
        <span className="ml-2 text-xs font-normal text-slate-600">
          {CODES.length} types; some do not occur in this demo&apos;s records
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-600">
            <tr>
              <th scope="col" className="px-2 py-1 font-medium">
                Event type
              </th>
              <th scope="col" className="px-2 py-1 font-medium">
                Full name
              </th>
              <th scope="col" className="px-2 py-1 font-medium">
                Kind
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CODES.map((c) => (
              <tr key={c.id} data-testid={`code-${c.id}`}>
                <th scope="row" className="px-2 py-1 font-medium">
                  <EventLabel code={c.id} size={12} />
                </th>
                <td className="px-2 py-1">{c.label}</td>
                <td className="px-2 py-1">{c.kind === 'decision' ? 'Decision' : 'Error'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function IntegrityCard({
  summary,
  ranAt,
  rerun,
  searchFor,
  children,
}: {
  summary: VerificationSummary;
  ranAt: string;
  rerun: boolean;
  searchFor: (range: { fromSeq: number; toSeq: number }) => string;
  children?: ReactNode;
}) {
  const { gap } = summary;
  const test = getTest(lastVerification.integrityTestId);
  return (
    <Card title="Last integrity check" className={gap ? 'border-red-200' : ''}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {gap ? <StatusChip status="gap" /> : <StatusChip status="verified">Verified</StatusChip>}
        {gap ? (
          <Link
            to={{ search: searchFor(gap) }}
            data-testid="verification-line"
            className="text-sm font-semibold text-accent-700 underline-offset-2 hover:underline"
          >
            {summary.line}
          </Link>
        ) : (
          <span data-testid="verification-line" className="text-sm font-semibold text-slate-900">
            {summary.line}
          </span>
        )}
        <span className="text-xs text-slate-600">
          {rerun ? 'Re-run' : 'Ran'} {fmtDateTime(ranAt)}. Seeded results; no cryptographic check
          runs in the browser.
        </span>
      </div>
      {gap && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <h3 className="text-xs font-medium text-slate-600">Next steps</h3>
          <ul
            data-testid="gap-next-steps"
            className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-accent-700"
          >
            <li>
              <Link
                to={{ search: searchFor(gap) }}
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                Review records {gap.fromSeq}–{gap.toSeq}
                <ArrowRight size={12} aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                to={`/tests/${lastVerification.integrityTestId}`}
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                Failing test {lastVerification.integrityTestId}
                {test ? `: ${test.name}` : ''}
                <ArrowRight size={12} aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                to="/runtime-health"
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                Runtime health
                <ArrowRight size={12} aria-hidden />
              </Link>
            </li>
          </ul>
        </div>
      )}
      {children}
    </Card>
  );
}

export default function EvidenceScreen() {
  const [open, setOpen] = useOpenParam();
  const [results, setResults] = useState<RangeVerification[] | null>(null);
  const [ranAt, setRanAt] = useState<string>(lastVerification.at);
  const [sort, setSort] = useState<Sort>(INITIAL_SORT);
  const [params, setParams] = useSearchParams();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const summary = useMemo(() => verificationSummary(results ?? verification()), [results]);
  const selected = useMemo(() => evidence.find((r) => String(r.seq) === open) ?? null, [open]);
  const closeDrawer = useCallback(() => setOpen(null), [setOpen]);

  // One columns array for the table and for the range-to-page mapping, so both sort the same way.
  const cols = useMemo(() => columns((r) => setOpen(String(r.seq))), [setOpen]);
  const sorted = useMemo(() => sortRows(evidence, cols, sort), [cols, sort]);

  const page = pageFromParam(params.get('page'));
  const setPage = (next: number) => {
    if (next === page) return;
    if (next > 1) {
      setParams((prev) => {
        const out = new URLSearchParams(prev);
        out.set('page', String(next));
        return out;
      });
      return;
    }
    // A change to the filters or the sort asks for page 1 in the same tick as its own write to
    // the URL, and a second write from the same render would drop the first. Wait for that write
    // to land, then remove only the page.
    setTimeout(() => {
      if (!alive.current) return;
      const out = new URLSearchParams(window.location.search);
      out.delete('page');
      setParams(out, { replace: true });
    }, 0);
  };
  // A link to a range replaces the whole query, so the filters and the open record are cleared.
  const searchFor = (range: { fromSeq: number; toSeq: number }) => {
    const target = pageForRange(sorted, range.fromSeq, range.toSeq, PAGE_SIZE);
    return target > 1 ? `?page=${target}` : '';
  };

  return (
    <Page
      title="Evidence"
      demo
      actions={
        <Button
          variant="primary"
          onClick={() => {
            setResults(verification());
            setRanAt(new Date().toISOString());
          }}
        >
          <ShieldCheck size={14} aria-hidden />
          Verify
        </Button>
      }
    >
      <IntegrityCard summary={summary} ranAt={ranAt} rerun={results !== null} searchFor={searchFor}>
        {results && <VerificationResults ranges={results} searchFor={searchFor} />}
      </IntegrityCard>
      <OperationsCard />
      <CodesCard />
      <DataTable
        label="evidence records"
        rows={evidence}
        columns={cols}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
        onSortChange={setSort}
        urlState
        facets={facets}
        rowKey={(r) => String(r.seq)}
        searchText={(r) =>
          `${r.seq} ${r.code} ${eventType(r.code).label} ${getCode(r.code).label} ${r.endpoint} ${r.digest}`
        }
        onRowClick={(r) => setOpen(String(r.seq))}
        initialSort={INITIAL_SORT}
      />
      <Drawer
        open={selected !== null}
        title={selected ? `Record ${selected.seq}` : 'Record'}
        subtitle="Evidence record"
        onClose={closeDrawer}
      >
        {selected && <RecordDetail record={selected} />}
      </Drawer>
    </Page>
  );
}
