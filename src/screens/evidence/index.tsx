import { ShieldCheck } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authorities, evidence, ledgerOperations, verification } from '../../data';
import { CODES, getCode } from '../../domain/codes';
import { pageForRange } from '../../domain/evidence-paging';
import { runSummary } from '../../domain/ledger-ops';
import type { EvidenceRecord, RangeVerification } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { DataTable, type Column, type Facet, type Sort } from '../../ui/DataTable';
import { sortRows } from '../../ui/sort';
import { Drawer } from '../../ui/Drawer';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const PAGE_SIZE = 50;
const INITIAL_SORT: Sort = { key: 'seq', dir: 'desc' };

/** The page in `?page=N`; a missing or invalid value is page 1 (the table also clamps the top). */
const pageFromParam = (value: string | null) => {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n >= 1 ? n : 1;
};

const short = (value: string, keep = 22) =>
  value.length > keep ? `${value.slice(0, keep)}…` : value;

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
  { key: 'tenant', header: 'Tenant', render: (r) => r.tenantId },
  {
    key: 'code',
    header: 'Code',
    sortValue: (r) => getCode(r.code).label,
    render: (r) => (
      <span className="whitespace-nowrap">
        {getCode(r.code).label} <span className="font-mono text-xs text-slate-600">{r.code}</span>
      </span>
    ),
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
  { key: 'code', label: 'Code', value: (r) => getCode(r.code).label },
  { key: 'endpoint', label: 'Endpoint', value: (r) => r.endpoint },
];

function Pair({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm break-all text-slate-900">{children}</dd>
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
        {getCode(record.code).label} on <span className="font-mono text-xs">{record.endpoint}</span>{' '}
        at {fmtDateTime(record.timestamp)}. Only a keyed digest is kept, never the content.
      </p>
      <Layer title="Code">
        <Pair label="Label">{getCode(record.code).label}</Pair>
        <Pair label="Code ID">
          <span className="font-mono text-xs">{record.code}</span>
        </Pair>
        <Pair label="Kind">{getCode(record.code).kind === 'decision' ? 'Decision' : 'Error'}</Pair>
      </Layer>
      <Layer title="L1 · Hash chain">
        <Pair label="Previous hash">
          <span className="font-mono text-xs">{record.prevHash}</span>
        </Pair>
        <Pair label="Own hash">
          <span className="font-mono text-xs">{record.hash}</span>
        </Pair>
      </Layer>
      <Layer title="L2 · Merkle batch">
        <Pair label="Leaf index">{record.leafIndex}</Pair>
        <Pair label="Batch">{record.batchId}</Pair>
        <Pair label="Merkle root">
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
        <Pair label="Token">
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
  onFollow,
}: {
  ranges: RangeVerification[];
  /** The URL search string of the table page that holds the range, in the current sort. */
  searchFor: (range: RangeVerification) => string;
  /** Called when a range link is followed, to clear the table filters. */
  onFollow: () => void;
}) {
  return (
    <Card title="Verification result per range and layer">
      <p className="mb-3 text-xs text-slate-600">
        Seeded results for this demo. No cryptographic check runs in the browser.
      </p>
      <div className="overflow-x-auto">
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
                    onClick={onFollow}
                    className="text-accent-700 underline-offset-2 hover:underline"
                  >
                    {r.fromSeq}–{r.toSeq}
                  </Link>
                </th>
                <td className="px-2 py-1.5">
                  {r.ok ? (
                    <StatusChip status="verified">Verified</StatusChip>
                  ) : (
                    <StatusChip variant="danger">Gap found</StatusChip>
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
    </Card>
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
      <dl className="flex flex-col gap-2">
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
          label={
            <>
              Timestamp authorities <StubLabel what="The timestamp authorities" />
            </>
          }
        >
          <ul className="flex flex-col gap-1">
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
    <Card title="Codes">
      <p className="mb-2 text-xs text-slate-600">
        Some codes do not occur in this demo&apos;s records.
      </p>
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-slate-600">
          <tr>
            <th scope="col" className="px-2 py-1 font-medium">
              Code ID
            </th>
            <th scope="col" className="px-2 py-1 font-medium">
              Kind
            </th>
            <th scope="col" className="px-2 py-1 font-medium">
              Label
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {CODES.map((c) => (
            <tr key={c.id} data-testid={`code-${c.id}`}>
              <th scope="row" className="px-2 py-1 font-mono text-xs font-medium">
                {c.id}
              </th>
              <td className="px-2 py-1">{c.kind === 'decision' ? 'Decision' : 'Error'}</td>
              <td className="px-2 py-1">{c.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function EvidenceScreen() {
  const [selected, setSelected] = useState<EvidenceRecord | null>(null);
  const [results, setResults] = useState<RangeVerification[] | null>(null);
  const [sort, setSort] = useState<Sort>(INITIAL_SORT);
  const [resetKey, setResetKey] = useState(0);
  const [params, setParams] = useSearchParams();

  // One columns array for the table and for the range-to-page mapping, so both sort the same way.
  const cols = useMemo(() => columns(setSelected), []);
  const sorted = useMemo(() => sortRows(evidence, cols, sort), [cols, sort]);

  const page = pageFromParam(params.get('page'));
  const setPage = (next: number) => {
    if (next === page) return;
    setParams((prev) => {
      const out = new URLSearchParams(prev);
      if (next > 1) out.set('page', String(next));
      else out.delete('page');
      return out;
    });
  };
  const searchFor = (range: RangeVerification) => {
    const target = pageForRange(sorted, range.fromSeq, range.toSeq, PAGE_SIZE);
    return target > 1 ? `?page=${target}` : '';
  };

  return (
    <Page
      title="Evidence"
      demo
      description={
        <>
          Tamper-evident records of runtime events: each one links to the one before it, sits in a
          Merkle batch and is anchored in time. Records hold a keyed digest, never the content.
        </>
      }
      actions={
        <Button variant="primary" onClick={() => setResults(verification())}>
          <ShieldCheck size={14} aria-hidden />
          Verify
        </Button>
      }
    >
      {results && (
        <VerificationResults
          ranges={results}
          searchFor={searchFor}
          onFollow={() => setResetKey((k) => k + 1)}
        />
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <OperationsCard />
        <CodesCard />
      </div>
      <DataTable
        label="evidence records"
        rows={evidence}
        columns={cols}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
        onSortChange={setSort}
        resetKey={resetKey}
        facets={facets}
        rowKey={(r) => String(r.seq)}
        searchText={(r) =>
          `${r.seq} ${r.code} ${getCode(r.code).label} ${r.endpoint} ${r.tenantId} ${r.digest}`
        }
        onRowClick={setSelected}
        initialSort={INITIAL_SORT}
      />
      <Drawer
        open={selected !== null}
        title={selected ? `Record ${selected.seq}` : 'Record'}
        subtitle="Evidence record"
        onClose={() => setSelected(null)}
      >
        {selected && <RecordDetail record={selected} />}
      </Drawer>
    </Page>
  );
}
