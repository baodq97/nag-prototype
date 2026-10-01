import { Link } from 'react-router';
import {
  FRAMEWORK_NAMES,
  NOW,
  deployment,
  detectionQuality,
  personName,
  postureSummary,
  reviewCounts,
  tenant,
  tests,
} from '../../data';
import { testStrip } from '../../domain/summaries';
import { Card, Stat } from '../../ui/Card';
import { fmtDate } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { TrendChart } from './TrendChart';

const summary = postureSummary();
const review = reviewCounts();
const failing = tests
  .filter((t) => t.status === 'failing')
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

// The same figures as the strip on the tests screen; each one links to the tests it counts.
const strip = testStrip(tests, NOW, tenant.timeZone);
type Tone = 'default' | 'danger' | 'warning';
const tone = (n: number, t: Tone): Tone => (n > 0 ? t : 'default');
const figures: {
  tile: string;
  label: string;
  value: string | number;
  tone: Tone;
  hint: string;
}[] = [
  {
    tile: 'passing',
    label: 'Tests passing',
    value: `${strip.passingPct}%`,
    tone: 'default' as const,
    hint: `${summary.passing} of ${summary.total} tests`,
  },
  {
    tile: 'overdue',
    label: 'Overdue',
    value: strip.overdue,
    tone: tone(strip.overdue, 'danger'),
    hint: 'Failing, past the due date',
  },
  {
    tile: 'needs-remediation',
    label: 'Needs remediation',
    value: strip.needsRemediation,
    tone: tone(strip.needsRemediation, 'warning'),
    hint: 'Failing, due in more than 14 days',
  },
  {
    tile: 'due-soon',
    label: 'Due soon',
    value: strip.dueSoon,
    tone: tone(strip.dueSoon, 'warning'),
    hint: 'Failing, due within 14 days',
  },
];

export default function Screen() {
  const { byFramework, trend } = summary;
  return (
    <Page title="Posture overview" demo>
      <Link
        to="/onboarding"
        className="w-fit rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        <StatusChip variant="info">{deployment().label}</StatusChip>
      </Link>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((f) => (
          <Link
            key={f.tile}
            to={`/tests?tile=${f.tile}`}
            aria-label={`${f.label} ${f.value}: show these tests`}
            className="rounded-lg hover:ring-1 hover:ring-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            <Stat label={f.label} value={f.value} tone={f.tone} hint={f.hint} />
          </Link>
        ))}
      </section>
      <p className="-mt-2 text-xs text-slate-600">
        This view supports compliance readiness and does not replace your own assessment.
      </p>

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
        title="Documents and policies"
        actions={
          <span className="flex gap-3 text-sm font-medium">
            <Link to="/documents" className="text-accent-700 hover:underline">
              Documents
            </Link>
            <Link to="/policies" className="text-accent-700 hover:underline">
              Policies
            </Link>
          </span>
        }
      >
        {review.documentsOverdue === 0 && review.policiesExpired === 0 ? (
          <p className="text-sm text-slate-900">
            Every approved document and policy is within its review or renewal date.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm text-slate-900">
            {review.documentsOverdue > 0 && (
              <li className="flex items-center gap-2">
                <StatusChip status="review-overdue" />
                {review.documentsOverdue} {review.documentsOverdue === 1 ? 'document' : 'documents'}{' '}
                past the next review date
              </li>
            )}
            {review.policiesExpired > 0 && (
              <li className="flex items-center gap-2">
                <StatusChip status="renewal-expired" />
                {review.policiesExpired} {review.policiesExpired === 1 ? 'policy' : 'policies'} past
                the renewal date
              </li>
            )}
          </ul>
        )}
      </Card>

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
