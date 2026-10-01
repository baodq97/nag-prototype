import { useMemo, useState } from 'react';
import {
  NOW,
  classifierConfig,
  currentUserId,
  escalationFor,
  personName,
  quarantine,
  quarantineSummary,
  tenant,
} from '../../data';
import { ABOUT_TO_ESCALATE_HOURS, isAboutToEscalate, nextDeadline } from '../../domain/escalation';
import { bandLine, bandRanges } from '../../domain/classifier';
import { checkJustification } from '../../domain/justification';
import type { QuarantineItem } from '../../domain/types';
import { sessionNow, updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card, Stat } from '../../ui/Card';
import { DataTable, type Column, type Facet } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { TextArea } from '../../ui/Field';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { byNextDeadline, fmtBandRange, fmtBelowRange, fmtMinutes, fmtNextAt } from './format';

const TH = 'px-3 py-2 text-left text-xs font-semibold text-slate-700';
const TD = 'px-3 py-2 align-top text-sm text-slate-800';

function ClassifierCard() {
  const { modelVersion, releaseThreshold, belowRelease } = classifierConfig;
  // Highest band first, as a reader scans a severity list.
  const rows = bandRanges(classifierConfig).reverse();
  return (
    <Card title="Classifier" actions={<StubLabel what="Classifier" />}>
      <p className="mb-3 text-sm text-slate-700">
        Model version <span className="font-mono text-xs">{modelVersion}</span>. The classifier only
        scores; the band follows from the score. A band includes its lower bound and excludes its
        upper bound.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem]">
          <caption className="sr-only">Classifier bands with score range and routing</caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className={TH}>
                Band
              </th>
              <th scope="col" className={TH}>
                Score range
              </th>
              <th scope="col" className={TH}>
                Routing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((b) => (
              <tr key={b.band}>
                <th scope="row" className={TD}>
                  <StatusChip status={b.band} />
                </th>
                <td className={`${TD} whitespace-nowrap tabular-nums`}>
                  {fmtBandRange(b.min, b.max)}
                </td>
                <td className={TD}>{b.routing}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className={`${TD} font-medium`}>
                Released
              </th>
              <td className={`${TD} whitespace-nowrap tabular-nums`}>
                {fmtBelowRange(releaseThreshold)}
              </td>
              <td className={TD}>{belowRelease}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        Escalation is the same for every band: business hours only, from the primary reviewer to the
        secondary reviewer to the manager, then expiry.
      </p>
    </Card>
  );
}

const terminalDecision = () =>
  tenant.quarantineTerminalDecision === 'reject' ? 'rejected' : 'approved';

const expiryEvent = () =>
  `Expired after ${tenant.quarantineExpiryBusinessHours} business hours – ${terminalDecision()} by tenant policy`;

const NEXT_LEVEL = {
  primary: 'secondary reviewer',
  secondary: 'manager',
  manager: 'expiry',
} as const;

function EscalationInfo({ item, compact = false }: { item: QuarantineItem; compact?: boolean }) {
  const esc = escalationFor(item);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-700">
        {fmtMinutes(esc.businessMinutes)}
        {compact ? ' elapsed' : ' business time elapsed'}
      </span>
      {esc.nextAt && esc.level !== 'expired' ? (
        <span className="text-xs text-slate-600">
          {compact
            ? `→ ${NEXT_LEVEL[esc.level]} ${fmtNextAt(esc.nextAt, tenant.timeZone)}`
            : `Next: ${NEXT_LEVEL[esc.level]} at ${fmtDateTime(esc.nextAt)}`}
        </span>
      ) : (
        <span className="text-xs text-slate-600">{expiryEvent()}</span>
      )}
    </div>
  );
}

function DecisionChip({ item }: { item: QuarantineItem }) {
  const decision = useSession((s) => s.quarantineDecisions[item.id]);
  if (decision) {
    return (
      <StatusChip variant={decision.decision === 'approved' ? 'success' : 'danger'}>
        {decision.decision === 'approved' ? 'Approved' : 'Rejected'}
      </StatusChip>
    );
  }
  if (escalationFor(item).level === 'expired') {
    return (
      <StatusChip variant={tenant.quarantineTerminalDecision === 'reject' ? 'danger' : 'success'}>
        {terminalDecision() === 'rejected' ? 'Rejected' : 'Approved'} by policy
      </StatusChip>
    );
  }
  return <span className="text-xs text-slate-600">Pending</span>;
}

function EscalationExplanation() {
  return (
    <Card title="How escalation works">
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>
          Time counts only in business hours: 09:00–17:00, Monday to Friday, in the tenant time zone
          ({tenant.timeZone}).
        </li>
        <li>After 4 business hours without a decision, the item goes to the secondary reviewer.</li>
        <li>After 4 more business hours, it goes to the manager.</li>
        <li>
          An item expires after {tenant.quarantineExpiryBusinessHours} business hours. The tenant
          policy then applies its terminal decision: {terminalDecision()}.
        </li>
        <li>
          Scores come from the scoring classifier <StubLabel what="Classifier" />, not from a real
          model.
        </li>
      </ul>
    </Card>
  );
}

const levelOf = (item: QuarantineItem) => escalationFor(item).level;

const deadlineOf = (item: QuarantineItem, decidedIds: ReadonlySet<string>) =>
  nextDeadline(escalationFor(item), decidedIds.has(item.id));

/** The rows the "About to escalate" tile counts: pending items whose next step is close. */
const isMarked = (item: QuarantineItem, decidedIds: ReadonlySet<string>) =>
  deadlineOf(item, decidedIds) !== undefined && isAboutToEscalate(escalationFor(item), NOW, tenant);

function AboutToEscalateMark() {
  return (
    <span data-testid="about-to-escalate">
      <StatusChip variant="warning" description="">
        <span aria-hidden>Escalates soon</span>
        <span className="sr-only">
          About to escalate: next level within {ABOUT_TO_ESCALATE_HOURS} business hour
        </span>
      </StatusChip>
    </span>
  );
}

function buildColumns(
  open: (item: QuarantineItem) => void,
  decidedIds: ReadonlySet<string>,
): Column<QuarantineItem>[] {
  return [
    {
      key: 'id',
      header: 'ID',
      id: true,
      sortValue: (r) => r.id,
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open(r);
          }}
          aria-label={`Open ${r.id}`}
          className="inline-block font-mono text-sm leading-5 font-medium text-accent-700 underline-offset-2 hover:underline"
        >
          {r.id}
        </button>
      ),
    },
    { key: 'summary', header: 'Summary', sortValue: (r) => r.summary, render: (r) => r.summary },
    {
      key: 'score',
      header: 'Score',
      sortValue: (r) => r.score,
      className: 'tabular-nums',
      render: (r) => r.score.toFixed(2),
    },
    {
      key: 'band',
      header: 'Band',
      sortValue: (r) => r.score,
      render: (r) => <StatusChip status={r.band} />,
    },
    {
      key: 'escalation',
      header: 'Escalation',
      sortValue: (r) => escalationFor(r).businessMinutes,
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusChip status={levelOf(r)} />
          <EscalationInfo item={r} compact />
          {isMarked(r, decidedIds) && <AboutToEscalateMark />}
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Decision',
      render: (r) => <DecisionChip item={r} />,
    },
    {
      key: 'actions',
      header: 'Action',
      render: (r) =>
        decidedIds.has(r.id) || levelOf(r) === 'expired' ? null : (
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              open(r);
            }}
            aria-label={`Decide ${r.id}`}
          >
            Decide
          </Button>
        ),
    },
  ];
}

const facets: Facet<QuarantineItem>[] = [
  { key: 'band', label: 'Band', value: (r) => r.band },
  { key: 'level', label: 'Escalation', value: levelOf },
];

function ItemDetail({ item }: { item: QuarantineItem }) {
  const decision = useSession((s) => s.quarantineDecisions[item.id]);
  const [text, setText] = useState('');
  const check = checkJustification(text);
  const esc = escalationFor(item);

  const decide = (value: 'approved' | 'rejected') =>
    updateSession((s) => ({
      ...s,
      quarantineDecisions: {
        ...s.quarantineDecisions,
        [item.id]: {
          decision: value,
          justification: text.trim(),
          by: personName(currentUserId),
          at: sessionNow(),
        },
      },
    }));

  return (
    <>
      <p className="text-sm text-slate-800">{item.summary}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-slate-600">Score</dt>
          <dd className="tabular-nums">{bandLine(item.score, classifierConfig)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Band</dt>
          <dd>
            <StatusChip status={item.band} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Received</dt>
          <dd>{fmtDateTime(item.receivedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Reviewer level</dt>
          <dd>
            <StatusChip status={esc.level} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Endpoint</dt>
          <dd className="font-mono text-xs">{item.endpoint}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Policy bundle</dt>
          <dd>{item.policyBundleId}</dd>
        </div>
      </dl>
      <EscalationInfo item={item} />
      {decision ? (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
          data-testid="decision"
        >
          <p className="font-medium text-slate-900">
            Decision: {decision.decision === 'approved' ? 'Approved' : 'Rejected'} by {decision.by}{' '}
            on {fmtDateTime(decision.at)}
          </p>
          <p className="mt-1 text-slate-700">Justification: {decision.justification}</p>
        </div>
      ) : esc.level === 'expired' ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-900">{expiryEvent()}</p>
          <p className="mt-1 text-slate-700">No reviewer decision is needed any more.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <TextArea
            label="Justification"
            value={text}
            onChange={(e) => setText(e.target.value)}
            hint={`${check.message}. At least 20 characters are needed to decide.`}
            placeholder="Why do you approve or reject this item?"
          />
          <div className="flex gap-2">
            <Button variant="primary" disabled={!check.ok} onClick={() => decide('approved')}>
              Approve
            </Button>
            <Button variant="danger" disabled={!check.ok} onClick={() => decide('rejected')}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default function QuarantineScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = quarantine.find((q) => q.id === selectedId) ?? null;
  const decisions = useSession((s) => s.quarantineDecisions);
  const decidedIds = new Set(Object.keys(decisions));
  const summary = quarantineSummary(decidedIds);
  // Nearest deadline first; no sort is set on the table, so a column header overrides this order.
  const rows = useMemo(
    () => byNextDeadline(quarantine, (q) => deadlineOf(q, new Set(Object.keys(decisions)))),
    [decisions],
  );

  return (
    <Page title="Quarantine queue" demo>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pending" value={summary.pending} />
        <Stat
          label="About to escalate"
          value={summary.aboutToEscalate}
          tone={summary.aboutToEscalate > 0 ? 'warning' : 'default'}
          hint={`Next level within ${ABOUT_TO_ESCALATE_HOURS} business hour`}
        />
        <Stat label="Expired" value={summary.expired} />
      </div>
      <p className="text-sm text-slate-700">
        Each pending item needs a written justification before it can be approved or rejected.
      </p>
      <DataTable
        label="quarantine items"
        rows={rows}
        columns={buildColumns((r) => setSelectedId(r.id), decidedIds)}
        facets={facets}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.id} ${r.summary} ${r.band} ${levelOf(r)}`}
        onRowClick={(r) => setSelectedId(r.id)}
      />
      <details
        className="group rounded-lg border border-slate-200 bg-white"
        data-testid="how-it-works"
      >
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-900">
          How it works
        </summary>
        <div className="flex flex-col gap-4 border-t border-slate-200 p-4">
          <EscalationExplanation />
          <ClassifierCard />
        </div>
      </details>
      <Drawer
        open={selected !== null}
        title={selected ? `Quarantine item ${selected.id}` : 'Quarantine item'}
        subtitle="Quarantine queue"
        onClose={() => setSelectedId(null)}
      >
        {selected && <ItemDetail key={selected.id} item={selected} />}
      </Drawer>
    </Page>
  );
}
