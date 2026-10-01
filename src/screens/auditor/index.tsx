import { Eye } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { FRAMEWORK_NAMES, getAudit, getControl } from '../../data';
import { Card } from '../../ui/Card';
import { Logo } from '../../ui/Logo';
import { StatusChip } from '../../ui/StatusChip';
import { fmtDate } from '../../ui/format';
import { humanize } from '../../ui/status';
import { STATE_ORDER, countStates } from './states';

// A separate, read-only layout for an external auditor: no inputs and no buttons that change
// data. Deliberately not built on DataTable, which has a text filter.
function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <title>{`${title} – NAG auditor view`}</title>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-800 ring-1 ring-accent-200 ring-inset">
            <Eye aria-hidden size={12} />
            Read-only auditor view
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-5xl px-4 py-3 text-xs text-slate-600 sm:px-6">
          This view only shows records. Nothing on this page can be changed from here.
        </p>
      </footer>
    </div>
  );
}

export default function Screen() {
  const { auditId = '' } = useParams();
  const audit = getAudit(auditId);

  if (!audit) {
    return (
      <Frame title="Audit not found">
        <h1 className="text-xl font-semibold">Audit not found</h1>
        <p className="mt-2 text-sm text-slate-700">
          No audit with the reference <span className="font-mono">{auditId}</span> is shared with
          you. Check the link you were given.
        </p>
        <p className="mt-4 text-sm">
          <Link to="/trust" className="font-medium text-accent-700 underline">
            Go to the public trust page
          </Link>
        </p>
      </Frame>
    );
  }

  const counts = countStates(audit);

  return (
    <Frame title={audit.name}>
      <h1 className="text-xl font-semibold">{audit.name}</h1>
      <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-slate-600">Audit firm</dt>
          <dd>{audit.firm}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Audit period</dt>
          <dd>
            {fmtDate(audit.periodStart)} to {fmtDate(audit.periodEnd)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Framework</dt>
          <dd>{FRAMEWORK_NAMES[audit.framework]}</dd>
        </div>
      </dl>

      <ul
        aria-label="Evidence requests by state"
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {STATE_ORDER.map((s) => (
          <li key={s} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-medium text-slate-600">{humanize(s)}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">{counts[s]}</span>
          </li>
        ))}
      </ul>

      <Card title="Evidence tracker" className="mt-5">
        <div className="-mx-4 -my-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Evidence requests for {audit.name}, with the control and the current state of each
            </caption>
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Request
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Control
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  State
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audit.requests.map((r) => {
                const control = getControl(r.controlId);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-2">
                      <span className="mr-1.5 font-mono text-xs text-slate-600">{r.id}</span>
                      {r.request}
                    </td>
                    <td className="px-4 py-2">
                      <span className="mr-1.5 font-mono text-xs text-slate-600">{r.controlId}</span>
                      {control?.name ?? ''}
                    </td>
                    <td className="px-4 py-2">
                      <StatusChip status={r.state} />
                    </td>
                    <td className="px-4 py-2 text-slate-700">{r.note ?? '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Frame>
  );
}
