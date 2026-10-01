import { useState } from 'react';
import { Link } from 'react-router';
import { runtimeHealth } from '../../data';
import { FALLBACK_EFFECT, type Percentile } from '../../domain/health';
import type { FallbackMode } from '../../domain/types';
import { updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Modal } from '../../ui/Modal';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';

const MODES: { value: FallbackMode; label: string; summary: string }[] = [
  {
    value: 'hard-stop',
    label: 'Hard stop',
    summary: 'Refuse AI requests while NAG cannot be reached.',
  },
  {
    value: 'bypass',
    label: 'Bypass',
    summary:
      'Send AI requests to the model unchecked while NAG cannot be reached. No evidence records are created for them.',
  },
];

const MODE_LABEL: Record<FallbackMode, string> = { 'hard-stop': 'Hard stop', bypass: 'Bypass' };

const TH = 'px-3 py-2 text-left text-xs font-semibold text-slate-700';
const TD = 'px-3 py-2 align-top text-sm text-slate-800';

function Latency({ ms, over }: { ms: number; over: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      {ms}
      {over && <StatusChip variant="warning">Over budget</StatusChip>}
    </span>
  );
}

function StageTables() {
  const { stages, totals } = runtimeHealth();
  const percentiles: [Percentile, string, (s: (typeof stages)[number]) => number][] = [
    ['p50', 'p50 (ms)', (s) => s.p50Ms],
    ['p95', 'p95 (ms)', (s) => s.p95Ms],
    ['p99', 'p99 (ms)', (s) => s.p99Ms],
  ];
  return (
    <>
      <Card title="Pipeline stages: latency against budget">
        <p className="mb-3 text-sm text-slate-700">
          <span className="font-medium">Seeded, not measured.</span> The p50, p95 and p99 values are
          fixed demo numbers; no runtime is connected. A value above the configured budget of its
          stage is marked &quot;Over budget&quot;.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem]">
            <caption className="sr-only">
              Pipeline stages with configured latency budget and seeded percentiles
            </caption>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className={TH}>
                  Stage
                </th>
                <th scope="col" className={TH}>
                  Budget (ms)
                </th>
                {percentiles.map(([key, header]) => (
                  <th key={key} scope="col" className={TH}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stages.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className={`${TD} font-medium text-slate-900`}>
                    {s.name}
                  </th>
                  <td className={`${TD} tabular-nums`}>{s.budgetMs}</td>
                  {percentiles.map(([key, , value]) => (
                    <td key={key} className={TD}>
                      <Latency ms={value(s)} over={s.over.includes(key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Budget breaches per stage">
        <p className="mb-3 text-sm text-slate-700">
          How often a stage ran past its budget. Seeded counts, not measured.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem]">
            <caption className="sr-only">Budget breach counters per pipeline stage</caption>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className={TH}>
                  Stage
                </th>
                <th scope="col" className={TH}>
                  Last 24 hours
                </th>
                <th scope="col" className={TH}>
                  Last 7 days
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stages.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className={`${TD} font-medium text-slate-900`}>
                    {s.name}
                  </th>
                  <td className={`${TD} tabular-nums`}>{s.breaches24h}</td>
                  <td className={`${TD} tabular-nums`}>{s.breaches7d}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-300 bg-slate-50">
              <tr>
                <th scope="row" className={`${TD} font-semibold text-slate-900`}>
                  Total
                </th>
                <td className={`${TD} font-semibold tabular-nums`} data-testid="breaches-24h-total">
                  {totals.last24h}
                </td>
                <td className={`${TD} font-semibold tabular-nums`} data-testid="breaches-7d-total">
                  {totals.last7d}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}

function BlastRadius() {
  const { blastRadius } = runtimeHealth();
  return (
    <Card title="Blast radius per check class">
      <p className="mb-3 text-sm text-slate-700">
        What happens to a request when a check of that class fails or runs out of time. The classes
        and breach behaviours are the ones the loaded bundles declare on{' '}
        <Link
          to="/policy-bundles"
          className="font-medium text-accent-700 underline underline-offset-2"
        >
          Policy bundles
        </Link>
        .
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem]">
          <caption className="sr-only">
            Effect on a request per check class and breach behaviour
          </caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className={TH}>
                Class
              </th>
              <th scope="col" className={TH}>
                Breach behaviour
              </th>
              <th scope="col" className={TH}>
                Effect on the request
              </th>
              <th scope="col" className={TH}>
                Bundles
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {blastRadius.flatMap((c) =>
              c.behaviours.length === 0
                ? [
                    <tr key={c.class}>
                      <th scope="row" className={`${TD} font-medium text-slate-900`}>
                        Class {c.class}
                      </th>
                      <td className={TD} colSpan={3}>
                        No loaded bundle declares this class.
                      </td>
                    </tr>,
                  ]
                : c.behaviours.map((b, i) => (
                    <tr key={`${c.class}-${b.breach}`}>
                      <th scope="row" className={`${TD} font-medium text-slate-900`}>
                        {i === 0 ? (
                          `Class ${c.class}`
                        ) : (
                          <span className="sr-only">Class {c.class}</span>
                        )}
                      </th>
                      <td className={TD}>
                        <span className="font-mono text-xs">{b.breach}</span>
                      </td>
                      <td className={TD}>{b.effect}</td>
                      <td className={`${TD} text-xs text-slate-600`}>{b.bundleIds.join(', ')}</td>
                    </tr>
                  )),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Breaker() {
  const { breaker } = runtimeHealth();
  const t = breaker.lastTransition;
  return (
    <Card title="Customer-side circuit breaker" actions={<StubLabel what="The circuit breaker" />}>
      <p className="mb-3 text-sm text-slate-700">
        The breaker sits in the customer&apos;s application and stops calls to NAG after repeated
        failures. This is a stub: the state below is seeded and nothing trips it.
      </p>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-slate-600">State</dt>
          <dd className="mt-1" data-testid="breaker-state">
            <StatusChip status={breaker.state} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Trip threshold</dt>
          <dd className="mt-1 text-slate-900">
            {breaker.tripFailures} failures in {breaker.windowSeconds} seconds
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-600">Last transition</dt>
          <dd className="mt-1 text-slate-900">
            {humanize(t.from)} → {humanize(t.to)}{' '}
            <time dateTime={t.at} className="text-slate-600">
              {fmtDateTime(t.at)}
            </time>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function FallbackChoice() {
  const mode = useSession((s) => s.fallbackMode);
  const [pending, setPending] = useState<FallbackMode | null>(null);

  const confirm = () => {
    if (pending) updateSession((s) => ({ ...s, fallbackMode: pending }));
    setPending(null);
  };

  return (
    <Card title="When NAG is unreachable">
      <p className="mb-3 text-sm text-slate-700">
        Choose what your application does when it cannot reach NAG. Changing the choice asks for
        confirmation. The change lasts for this session only: reloading the page restores the seeded
        choice.
      </p>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">
          Behaviour when NAG is unreachable
        </legend>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-3 text-sm"
            >
              <input
                type="radio"
                name="fallback-mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => {
                  if (m.value !== mode) setPending(m.value);
                }}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-slate-900">{m.label}</span>
                <span className="block text-slate-700">{m.summary}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p
        className="mt-3 flex items-center gap-2 text-sm text-slate-900"
        data-testid="fallback-mode"
      >
        Current choice: <StatusChip status={mode}>{MODE_LABEL[mode]}</StatusChip>
      </p>
      <Modal
        open={pending !== null}
        title="Change behaviour when NAG is unreachable"
        onClose={() => setPending(null)}
        footer={
          <>
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pending === 'bypass' ? 'danger' : 'primary'} onClick={confirm}>
              Confirm change
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-slate-700">
          <p>
            You are changing the choice from <strong>{MODE_LABEL[mode]}</strong> to{' '}
            <strong>{pending ? MODE_LABEL[pending] : ''}</strong>. The effect of each option:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {MODES.map((m) => (
              <li key={m.value}>{FALLBACK_EFFECT[m.value]}</li>
            ))}
          </ul>
          <p>This change lasts for this session only. It is not saved.</p>
        </div>
      </Modal>
    </Card>
  );
}

function Egress() {
  return (
    <Card
      title="What leaves your deployment"
      actions={<StubLabel what="The timestamp authority" />}
    >
      <p className="text-sm text-slate-700" data-testid="egress-statement">
        No request or response content leaves the tenant&apos;s deployment. Only digests of evidence
        records go to the timestamp authority, which is a stub in this prototype. A digest does not
        contain the content it was computed from.
      </p>
    </Card>
  );
}

export default function RuntimeHealthScreen() {
  return (
    <Page
      title="Runtime health"
      demo
      description="Latency budgets, breach counters, what a failed check does to a request, and what your application does when NAG is unreachable."
    >
      <StageTables />
      <BlastRadius />
      <Breaker />
      <FallbackChoice />
      <Egress />
    </Page>
  );
}
