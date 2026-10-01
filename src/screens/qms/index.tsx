import { useState } from 'react';
import { itemRefs, personName, qmsTemplates } from '../../data';
import { approveStep, canApproveStep, nextStep } from '../../domain/approval';
import type { ApprovalStep, QmsTemplate } from '../../domain/types';
import { sessionNow, updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { fmtDate } from '../../ui/format';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const approvedCount = (chain: ApprovalStep[]) => chain.filter((s) => s.approvedAt).length;

function progressLabel(chain: ApprovalStep[]): string {
  const n = approvedCount(chain);
  return n === chain.length ? 'Fully approved' : n === 0 ? 'Not started' : 'In progress';
}

function Progress({ chain }: { chain: ApprovalStep[] }) {
  const n = approvedCount(chain);
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden
        className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"
        title={`${n} of ${chain.length}`}
      >
        <div className="h-full bg-accent-600" style={{ width: `${(n / chain.length) * 100}%` }} />
      </div>
      <span className="text-xs text-slate-700 tabular-nums">
        {n} of {chain.length} approved
      </span>
    </div>
  );
}

function Chain({ template, chain }: { template: QmsTemplate; chain: ApprovalStep[] }) {
  const approve = (index: number) =>
    updateSession((s) => {
      const current = s.qmsChains[template.id];
      if (!current || !canApproveStep(current, index)) return s;
      return {
        ...s,
        qmsChains: { ...s.qmsChains, [template.id]: approveStep(current, index, sessionNow()) },
      };
    });

  return (
    <ol className="flex flex-col gap-3" aria-label="Approval chain">
      {chain.map((step, i) => {
        const done = Boolean(step.approvedAt);
        const enabled = canApproveStep(chain, i);
        const waitingFor = chain[i - 1]?.role;
        const noteId = `${template.id}-step-${i}-note`;
        return (
          <li key={step.role} className="rounded-md border border-slate-200 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {i + 1}. {step.role}
                </p>
                <p className="text-sm text-slate-700">{personName(step.personId)}</p>
                <p className="text-xs text-slate-600">
                  {step.approvedAt ? `Approved ${fmtDate(step.approvedAt)}` : 'Not approved yet'}
                </p>
              </div>
              {done ? (
                <StatusChip status="approved" />
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!enabled}
                  aria-describedby={enabled ? undefined : noteId}
                  aria-label={`Approve ${step.role}`}
                  onClick={() => approve(i)}
                >
                  Approve
                </Button>
              )}
            </div>
            {!done && !enabled && (
              <p id={noteId} className="mt-2 text-xs text-slate-600">
                Disabled: {waitingFor ?? 'the previous step'} must approve first.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Screen() {
  const chains = useSession((s) => s.qmsChains);
  const [openId, setOpenId] = useState<string | null>(null);
  const chainOf = (t: QmsTemplate) => chains[t.id] ?? t.chain;
  const open = qmsTemplates.find((t) => t.id === openId);

  const columns: Column<QmsTemplate>[] = [
    {
      key: 'title',
      header: 'Template',
      sortValue: (t) => t.title,
      render: (t) => (
        <button
          type="button"
          onClick={() => setOpenId(t.id)}
          className="text-left font-medium text-accent-700 hover:underline"
        >
          {t.title}
        </button>
      ),
    },
    {
      key: 'refs',
      header: 'ISO/IEC 42001',
      sortValue: (t) => itemRefs(t.frameworkItemIds),
      render: (t) => itemRefs(t.frameworkItemIds),
    },
    {
      key: 'version',
      header: 'Version',
      sortValue: (t) => t.version,
      render: (t) => <span className="tabular-nums">v{t.version}</span>,
    },
    {
      key: 'approval',
      header: 'Approval progress',
      sortValue: (t) => approvedCount(chainOf(t)),
      render: (t) => <Progress chain={chainOf(t)} />,
    },
  ];

  const facets: Facet<QmsTemplate>[] = [
    { key: 'approval', label: 'Approval', value: (t) => progressLabel(chainOf(t)) },
    { key: 'version', label: 'Version', value: (t) => t.version },
  ];

  const nextIdx = open ? nextStep(chainOf(open)) : -1;
  const nextRole = open && nextIdx >= 0 ? chainOf(open)[nextIdx]?.role : undefined;

  return (
    <Page
      title="QMS library"
      description="Thirteen quality management templates mapped to ISO/IEC 42001. Each one is approved in order: the drafter, then the Compliance Lead, then the CEO."
    >
      <DataTable
        label="templates"
        rows={qmsTemplates}
        columns={columns}
        facets={facets}
        rowKey={(t) => t.id}
        searchText={(t) => `${t.title} ${itemRefs(t.frameworkItemIds)} ${t.version}`}
        onRowClick={(t) => setOpenId(t.id)}
      />
      <Drawer
        open={open !== undefined}
        onClose={() => setOpenId(null)}
        title={open?.title ?? ''}
        subtitle={open && `QMS template · ${open.id} · v${open.version}`}
      >
        {open && (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-medium text-slate-600">ISO/IEC 42001</dt>
                <dd className="text-sm text-slate-900">{itemRefs(open.frameworkItemIds)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Progress</dt>
                <dd>
                  <Progress chain={chainOf(open)} />
                </dd>
              </div>
            </dl>
            <p className="text-sm text-slate-700">
              {nextRole
                ? `Next step: ${nextRole}. Only that step can be approved now.`
                : 'Every step is approved.'}
            </p>
            <Chain template={open} chain={chainOf(open)} />
          </>
        )}
      </Drawer>
    </Page>
  );
}
