import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import { controlStatus, controlsForTest, getIntegration, getTest, personName } from '../../data';
import type { ComplianceTest } from '../../domain/types';
import { addTask } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Drawer } from '../../ui/Drawer';
import { fmtDate, fmtDateTime } from '../../ui/format';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { Tabs } from '../../ui/Tabs';
import { TaskList } from '../../ui/ObjectDrawer';
import { testFrameworkStatus } from './helpers';

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function RemediationDrawer({
  test,
  open,
  onClose,
}: {
  test: ComplianceTest;
  open: boolean;
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const create = () => {
    const assignee = personName(test.ownerId);
    const task = addTask(test.id, `Remediate: ${test.name}`, assignee);
    setConfirmation(`Task ${task.id} created and assigned to ${assignee}.`);
  };
  return (
    <Drawer open={open} onClose={onClose} title="Remediate" subtitle={`${test.id} · ${test.name}`}>
      <p className="text-sm text-slate-700">
        Work through these steps, then wait for the next run to confirm the test passes.
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-slate-900">
        {test.remediation.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        <div>
          <Button variant="primary" onClick={create}>
            Create task
          </Button>
        </div>
        {confirmation && (
          <p role="status" className="text-sm text-emerald-800">
            {confirmation} You can find it on the Tasks tab.
          </p>
        )}
      </div>
    </Drawer>
  );
}

function TestDetail({ test }: { test: ComplianceTest }) {
  const [remediating, setRemediating] = useState(false);
  const integration = getIntegration(test.integrationId);
  const linked = controlsForTest(test.id);
  const byFramework = testFrameworkStatus(test);

  return (
    <Page
      title={test.name}
      demo
      description={test.description}
      actions={
        <>
          <Link to="/tests" className="text-sm font-medium text-accent-700 hover:underline">
            All tests
          </Link>
          <Button variant="primary" onClick={() => setRemediating(true)}>
            Remediate
          </Button>
        </>
      }
    >
      <Card>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Meta label="Status">
            <StatusChip status={test.status} />
          </Meta>
          <Meta label="Owner">{personName(test.ownerId)}</Meta>
          <Meta label="Last run">{fmtDateTime(test.lastRunAt)}</Meta>
          <Meta label="SLA">{test.slaDays} days to fix</Meta>
          <Meta label="Due date">{fmtDate(test.dueDate)}</Meta>
          <Meta label="Source integration">
            {integration ? (
              <Link
                to={`/integrations/${integration.id}`}
                className="text-accent-700 hover:underline"
              >
                {integration.name}
              </Link>
            ) : (
              '–'
            )}
          </Meta>
          {test.failingSince && <Meta label="Failing since">{fmtDate(test.failingSince)}</Meta>}
        </dl>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Failing entities (${test.failingEntities.length})`}>
          {test.failingEntities.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing is failing.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-slate-900">
              {test.failingEntities.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Status by framework">
          <ul className="flex flex-col gap-2" aria-label="Status by framework">
            {byFramework.map((r) => (
              <li key={r.framework} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium text-slate-900">{r.framework}</span>
                  <span className="block text-xs text-slate-600">{r.refs}</span>
                  <span className="block text-xs text-slate-600">
                    {r.total === 0
                      ? 'No linked control for this framework'
                      : `${r.passing}/${r.total} linked controls passing`}
                  </span>
                </span>
                {r.total === 0 ? (
                  <StatusChip variant="neutral">No control</StatusChip>
                ) : (
                  <StatusChip status={r.passing === r.total ? 'passing' : 'failing'} />
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={`Linked controls (${linked.length})`}>
          {linked.length === 0 ? (
            <p className="text-sm text-slate-600">No control uses this test yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {linked.map((c) => {
                const s = controlStatus(c);
                return (
                  <li key={c.id} className="text-sm">
                    <Link
                      to={`/controls?open=${c.id}`}
                      className="font-medium text-accent-700 hover:underline"
                    >
                      {c.id} {c.name}
                    </Link>
                    <span className="block text-xs text-slate-600">
                      {s.passing}/{s.total} tests passing
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <Tabs
          label="Test activity"
          tabs={[
            {
              id: 'history',
              label: 'History',
              content:
                test.history.length === 0 ? (
                  <p className="text-sm text-slate-600">No history yet.</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {[...test.history].reverse().map((h, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-slate-900">{h.text}</span>
                        <span className="block text-xs text-slate-600">
                          {h.actor} · {fmtDateTime(h.at)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ),
            },
            { id: 'tasks', label: 'Tasks', content: <TaskList objectId={test.id} /> },
            {
              id: 'comments',
              label: 'Comments',
              content:
                test.comments.length === 0 ? (
                  <p className="text-sm text-slate-600">No comments yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {test.comments.map((c, i) => (
                      <li key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                        <p>{c.text}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {c.author} · {fmtDateTime(c.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ),
            },
          ]}
        />
      </Card>

      {remediating && <RemediationDrawer test={test} open onClose={() => setRemediating(false)} />}
    </Page>
  );
}

export default function Screen() {
  const { id = '' } = useParams();
  const test = getTest(id);
  if (!test) {
    return (
      <Page title="Test not found" demo>
        <p className="text-sm text-slate-700">
          There is no test with the ID “{id}”.{' '}
          <Link to="/tests" className="font-medium text-accent-700 hover:underline">
            Back to all tests
          </Link>
        </p>
      </Page>
    );
  }
  return <TestDetail key={test.id} test={test} />;
}
