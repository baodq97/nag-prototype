import { Link } from 'react-router';
import { FRAMEWORK_NAMES, detectionQuality, personName, postureSummary, tests } from '../../data';
import { Card, Stat } from '../../ui/Card';
import { fmtDate } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { TrendChart } from './TrendChart';

const summary = postureSummary();
const failing = tests
  .filter((t) => t.status === 'failing')
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export default function Screen() {
  const { attention, byFramework, trend, passing, total, passingPct } = summary;
  return (
    <Page
      title="Posture overview"
      demo
      description="Where the tests and controls stand today, and what needs attention first. It supports compliance readiness and does not replace your own assessment."
    >
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Tests passing"
          value={`${passingPct}%`}
          hint={`${passing} of ${total} tests`}
        />
        <Stat
          label="Overdue"
          value={attention.overdue}
          tone={attention.overdue > 0 ? 'danger' : 'default'}
          hint="Failing, past the due date"
        />
        <Stat
          label="Needs remediation"
          value={attention['needs-remediation']}
          tone={attention['needs-remediation'] > 0 ? 'warning' : 'default'}
          hint="Failing, due in more than 14 days"
        />
        <Stat
          label="Due soon"
          value={attention['due-soon']}
          tone={attention['due-soon'] > 0 ? 'warning' : 'default'}
          hint="Failing, due within 14 days"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Tests passing, last 30 days" className="lg:col-span-2">
          <TrendChart points={trend} />
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Controls passing by framework">
            <ul className="flex flex-col gap-3">
              {byFramework.map((f) => (
                <li key={f.framework}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {FRAMEWORK_NAMES[f.framework]}
                    </span>
                    <span className="text-slate-700 tabular-nums">
                      {f.pct}% ({f.passing} of {f.total})
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${FRAMEWORK_NAMES[f.framework]} controls passing`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={f.pct}
                    className="mt-1 h-2 rounded-full bg-slate-100"
                  >
                    <div
                      className="h-2 rounded-full bg-accent-600"
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card
            title={
              <span className="flex items-center gap-2">
                Detection quality <StubLabel what="The classifier" />
              </span>
            }
          >
            <p className="text-sm text-slate-900">
              Recall {detectionQuality.recall.toFixed(2)} on n ={' '}
              {detectionQuality.sampleSize.toLocaleString('en-GB')}, measured{' '}
              {fmtDate(detectionQuality.measuredOn)}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Measured on a labelled sample. It describes that sample, not every future input.
            </p>
          </Card>
        </div>
      </div>

      <Card
        title={`Failing tests that need attention (${failing.length})`}
        actions={
          <Link to="/tests" className="text-sm font-medium text-accent-700 hover:underline">
            All tests
          </Link>
        }
      >
        {failing.length === 0 ? (
          <p className="text-sm text-slate-600">No failing tests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {failing.slice(0, 6).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Link to={`/tests/${t.id}`} className="font-medium text-accent-700 hover:underline">
                  {t.name}
                </Link>
                <StatusChip status="failing" />
                <span className="text-xs text-slate-600">
                  {personName(t.ownerId)} · due {fmtDate(t.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
