import { useState } from 'react';
import { currentUserId, escalationFor, personName, quarantine, tenant } from '../../data';
import { checkJustification } from '../../domain/justification';
import type { QuarantineItem } from '../../domain/types';
import { sessionNow, updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { DataTable, type Column, type Facet } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { TextArea } from '../../ui/Field';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { fmtAge, fmtMinutes } from './format';

const terminalDecision = () =>
  tenant.quarantineTerminalDecision === 'reject' ? 'rejected' : 'approved';

const expiryEvent = () =>
  `Expired after ${tenant.quarantineExpiryBusinessHours} business hours – ${terminalDecision()} by tenant policy`;

const NEXT_LEVEL = {
  primary: 'secondary reviewer',
  secondary: 'manager',
  manager: 'expiry',
} as const;

function EscalationInfo({ item }: { item: QuarantineItem }) {
  const esc = escalationFor(item);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-700">
        {fmtMinutes(esc.businessMinutes)} business time elapsed
      </span>
      {esc.nextAt && esc.level !== 'expired' ? (
        <span className="text-xs text-slate-600">
          Next: {NEXT_LEVEL[esc.level]} at {fmtDateTime(esc.nextAt)}
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

const levelOf = (item: QuarantineItem) => escalationFor(item).level;

function buildColumns(open: (item: QuarantineItem) => void): Column<QuarantineItem>[] {
  return [
    {
      key: 'id',
      header: 'ID',
      sortValue: (r) => r.id,
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open(r);
          }}
          aria-label={`Open ${r.id}`}
          className="font-mono text-sm font-medium text-accent-700 underline-offset-2 hover:underline"
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
      key: 'age',
      header: 'Age',
      sortValue: (r) => -Date.parse(r.receivedAt),
      className: 'whitespace-nowrap',
      render: (r) => fmtAge(r.receivedAt),
    },
    {
      key: 'escalation',
      header: 'Escalation',
      sortValue: (r) => escalationFor(r).businessMinutes,
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusChip status={levelOf(r)} />
          <EscalationInfo item={r} />
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Decision',
      render: (r) => <DecisionChip item={r} />,
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
          <dd className="tabular-nums">{item.score.toFixed(2)}</dd>
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

  return (
    <Page
      title="Quarantine queue"
      demo
      description="Items held back for a human decision. Each needs a written justification before it can be approved or rejected."
    >
      <Card title="How escalation works">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Time counts only in business hours: 09:00–17:00, Monday to Friday, in the tenant time
            zone ({tenant.timeZone}).
          </li>
          <li>
            After 4 business hours without a decision, the item goes to the secondary reviewer.
          </li>
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
      <DataTable
        label="quarantine items"
        rows={quarantine}
        columns={buildColumns((r) => setSelectedId(r.id))}
        facets={facets}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.id} ${r.summary} ${r.band} ${levelOf(r)}`}
        onRowClick={(r) => setSelectedId(r.id)}
      />
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
