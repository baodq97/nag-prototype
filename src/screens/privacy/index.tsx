import { Check, Circle } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  ERASURE_SUBJECTS,
  type ErasureRequestView,
  erasureFor,
  erasureRequests,
  evidence,
  privacyEndpoints,
} from '../../data';
import { erasureSummary, rangeText } from '../../domain/erasure';
import { type ErasureRun, sessionNow, updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ID_CELL } from '../../ui/DataTable';
import { TextField, Toggle } from '../../ui/Field';
import { fmtDate, fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';
import type { ChipVariant } from '../../ui/status';
import { StatusChip } from '../../ui/StatusChip';

const countFor = (subjectId: string) => evidence.filter((r) => r.subjectId === subjectId).length;

const STAGES: ErasureRun['stage'][] = ['confirm', 'key-destroyed', 'countable', 'attested'];

function ContentLogging() {
  const logging = useSession((s) => s.contentLogging);
  return (
    <Card title="Content logging per endpoint">
      <p className="mb-3 text-sm text-slate-700">
        The default is <strong>metadata and keyed digests only</strong>: evidence records never hold
        the content of a request or an answer. Turn content logging on for an endpoint only when you
        have a reason to keep the content.
      </p>
      <ul className="divide-y divide-slate-100">
        {privacyEndpoints.map((ep) => {
          const on = logging[ep.id] ?? ep.contentLogging;
          return (
            <li key={ep.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{ep.name}</p>
                <p className="font-mono text-xs text-slate-600">{ep.path}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  {on ? 'Content and digests' : 'Metadata and keyed digests only'}
                </span>
                <Toggle
                  label={`Content logging for ${ep.name}`}
                  hideLabel
                  checked={on}
                  onChange={(next) =>
                    updateSession((s) => ({
                      ...s,
                      contentLogging: { ...s.contentLogging, [ep.id]: next },
                    }))
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Step({ done, title, children }: { done: boolean; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-accent-600 text-white' : 'border border-slate-400 text-slate-500'}`}
      >
        {done ? <Check size={12} /> : <Circle size={8} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {title}
          <span className="sr-only">{done ? ' (done)' : ' (not done yet)'}</span>
        </p>
        {children && <div className="mt-1 text-sm text-slate-700">{children}</div>}
      </div>
    </li>
  );
}

function ErasureFlow() {
  const erasures = useSession((s) => s.erasures);
  const [subject, setSubject] = useState('');
  const [error, setError] = useState<string | null>(null);
  const index = erasures.findIndex((e) => e.stage !== 'attested');
  const run = index >= 0 ? erasures[index] : undefined;
  const reached = run ? STAGES.indexOf(run.stage) : -1;

  const setStage = (stage: ErasureRun['stage']) =>
    updateSession((s) => ({
      ...s,
      erasures: s.erasures.map((e, i) => (i === index ? { ...e, stage, at: sessionNow() } : e)),
    }));

  const start = () => {
    const id = subject.trim();
    if (!id) {
      setError(`Enter a subject ID, for example ${ERASURE_SUBJECTS.withGap}.`);
      return;
    }
    if (countFor(id) === 0) {
      setError(`No evidence record has the subject ID ${id}. Nothing was started.`);
      return;
    }
    setError(null);
    const at = sessionNow();
    updateSession((s) => ({
      ...s,
      erasures: [...s.erasures, { subjectId: id, stage: 'confirm', startedAt: at, at }],
    }));
    setSubject('');
  };

  const layers = run ? erasureFor(run.subjectId) : undefined;

  return (
    <Card title="Erasure flow">
      <p className="mb-3 text-sm text-slate-700">
        Content is made unreadable by destroying the key that protects it. The evidence records stay
        in place, so the chain can still be counted and checked. This is a technical step in a demo,
        not a legal determination that data has been erased. To try it, use{' '}
        <span className="font-mono">{ERASURE_SUBJECTS.withGap}</span> (a record range with a known
        integrity failure) or <span className="font-mono">{ERASURE_SUBJECTS.clean}</span> (ranges
        that all verify).
      </p>
      {!run && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-64">
            <TextField
              label="Subject ID"
              placeholder="subj-0007"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setError(null);
              }}
              error={error}
            />
          </div>
          <Button variant="primary" className="mt-6" onClick={start}>
            Start erasure
          </Button>
        </div>
      )}
      {run && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-900">
            Subject <span className="font-mono">{run.subjectId}</span>
          </p>
          <ol className="flex flex-col gap-3" aria-label="Erasure stages">
            <Step done={reached >= 0} title="1. Confirm">
              {reached === 0 ? (
                <div className="flex flex-col items-start gap-2">
                  <p>
                    Confirm that the key for the content of {run.subjectId} should be destroyed.
                    This cannot be undone in the demo.
                  </p>
                  <Button variant="danger" onClick={() => setStage('key-destroyed')}>
                    Confirm and destroy key
                  </Button>
                </div>
              ) : (
                'Confirmed.'
              )}
            </Step>
            <Step done={reached >= 1} title="2. Key destroyed">
              {reached >= 1 && (
                <span className="flex items-center gap-2">
                  Key destroyed <StubLabel what="Key management" />
                </span>
              )}
              {reached === 1 && (
                <div className="mt-2">
                  <Button variant="primary" onClick={() => setStage('countable')}>
                    Count remaining records
                  </Button>
                </div>
              )}
            </Step>
            <Step done={reached >= 2} title="3. Records stay countable">
              {reached >= 2 && layers && (
                <div
                  data-testid="countable"
                  data-verify={layers.allVerify ? 'ok' : 'failing'}
                  className={`rounded-md border px-3 py-2 ${layers.allVerify ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}
                >
                  <p>
                    <StatusChip variant={layers.allVerify ? 'success' : 'danger'}>
                      {layers.allVerify ? 'All layers verify' : 'Verification fails'}
                    </StatusChip>{' '}
                    {erasureSummary(layers)}. Results are seeded for this demo.
                  </p>
                  <ul
                    aria-label="Evidence layers per range"
                    className="mt-2 list-disc space-y-1 pl-5 text-xs"
                  >
                    {layers.ranges.map((range) => (
                      <li key={`${range.fromSeq}-${range.toSeq}`}>{rangeText(range)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {reached === 2 && (
                <div className="mt-2">
                  <Button variant="primary" onClick={() => setStage('attested')}>
                    Record attestation
                  </Button>
                </div>
              )}
            </Step>
            <Step done={reached >= 3} title="4. Erasure attestation" />
          </ol>
        </div>
      )}
    </Card>
  );
}

const CLOCK_HEADERS = ['Request', 'Subject', 'Received', 'Due', 'Clock', 'State'];

/** Overdue is a danger; due today or within 2 working days a warning; later is plain. */
const clockVariant = (clock: NonNullable<ErasureRequestView['clock']>): ChipVariant =>
  clock.state === 'overdue'
    ? 'danger'
    : clock.state === 'today' || clock.workingDays <= 2
      ? 'warning'
      : 'neutral';

function ErasureRequests() {
  const erasures = useSession((s) => s.erasures);
  const requests = erasureRequests(sessionNow(), erasures);
  return (
    <Card title="Erasure requests">
      <p className="mb-3 text-sm text-slate-700">
        An erasure request is due five working days (Monday to Friday) after the day it was received
        in tenant time, and at most 30 calendar days after. Public holidays are not modelled. The
        clock stops when the erasure is attested.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table aria-label="Erasure requests" className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {CLOCK_HEADERS.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 align-top">
                  <span className={`font-mono text-xs ${ID_CELL}`}>{r.id}</span>
                  {r.fromSession && (
                    <span className="block text-xs text-slate-600">Started in this session</span>
                  )}
                </td>
                <td className={`px-3 py-2 align-top font-mono text-xs ${ID_CELL}`}>
                  {r.subjectId}
                </td>
                <td className="px-3 py-2 align-top">
                  <time dateTime={r.receivedAt}>{fmtDateTime(r.receivedAt)}</time>
                </td>
                <td className="px-3 py-2 align-top">
                  <time dateTime={r.due}>{fmtDate(r.due)}</time>
                </td>
                <td className="px-3 py-2 align-top">
                  {r.clock ? (
                    <StatusChip variant={clockVariant(r.clock)}>{r.clock.text}</StatusChip>
                  ) : (
                    <span className="text-xs text-slate-600">Stopped</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {r.state === 'completed' && r.completedAt ? (
                    <>
                      <StatusChip variant="success">Completed</StatusChip>
                      <time dateTime={r.completedAt} className="mt-1 block text-xs text-slate-600">
                        {fmtDateTime(r.completedAt)}
                      </time>
                    </>
                  ) : (
                    <StatusChip variant="info">Open</StatusChip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-600">
        The first four requests are seeded for this demo. A request is added when you start an
        erasure above.
      </p>
    </Card>
  );
}

function Attestations() {
  const erasures = useSession((s) => s.erasures);
  const attested = erasures.filter((e) => e.stage === 'attested');
  return (
    <Card title="Erasure attestations">
      {attested.length === 0 ? (
        <p className="text-sm text-slate-600">No erasure has been attested in this session.</p>
      ) : (
        <ul className="divide-y divide-slate-100" aria-label="Erasure attestations">
          {attested.map((e, i) => {
            const layers = erasureFor(e.subjectId);
            return (
              <li
                key={`${e.subjectId}-${i}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
              >
                <StatusChip variant="success">Attested</StatusChip>
                <span className="font-mono">{e.subjectId}</span>
                <span className={layers.allVerify ? 'text-slate-700' : 'text-red-800'}>
                  Key destroyed (stub); {erasureSummary(layers)}.
                </span>
                <time dateTime={e.at} className="text-xs text-slate-600">
                  {fmtDateTime(e.at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-600">
        An attestation records what the system did. It is not legal advice and not a legal
        determination.
      </p>
    </Card>
  );
}

export default function PrivacyScreen() {
  return (
    <Page title="Privacy and erasure" demo>
      <ContentLogging />
      <ErasureFlow />
      <ErasureRequests />
      <Attestations />
    </Page>
  );
}
