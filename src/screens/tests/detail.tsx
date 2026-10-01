import {
  type LucideIcon,
  CircleX,
  Inbox,
  Plug,
  Tag,
  Timer,
  User,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  NOW,
  controlStatus,
  controlsForTest,
  getDocument,
  getIntegration,
  getPolicy,
  getTest,
  integrations,
  personName,
  tenant,
} from '../../data';
import { testCategory } from '../../domain/summaries';
import { daysUntil } from '../../domain/time';
import type { ComplianceTest } from '../../domain/types';
import { addTask, useTasks } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { CopyField } from '../../ui/CopyField';
import { Drawer } from '../../ui/Drawer';
import { fmtDate, fmtDateTime } from '../../ui/format';
import { Modal } from '../../ui/Modal';
import { TaskList } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { Tabs } from '../../ui/Tabs';
import { useToast } from '../../ui/useToast';
import { useUrlParam } from '../../ui/useUrlParam';
import { dueWords, entityTarget, testFrameworkStatus } from './helpers';

const LINK = 'font-medium text-accent-700 hover:underline';

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <li title={label} className="flex items-center gap-1.5 text-sm text-slate-900">
      <Icon size={16} aria-hidden className="shrink-0 text-slate-500" />
      <span className="sr-only">{label}: </span>
      {children}
    </li>
  );
}

function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
      <Inbox size={20} aria-hidden className="text-slate-500" />
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {children && <p className="text-xs text-slate-600">{children}</p>}
    </div>
  );
}

/** A step may carry snippets in backticks; each one is shown below the step with a copy button. */
function splitStep(step: string): { text: string; snippets: string[] } {
  const snippets: string[] = [];
  const text = step.replace(/`([^`]+)`/g, (_, code: string) => {
    snippets.push(code);
    return code;
  });
  return { text, snippets };
}

function RemediationDrawer({ test, onClose }: { test: ComplianceTest; onClose: () => void }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  // Esc closes the confirm dialog only, not the drawer under it.
  const confirmingRef = useRef(false);
  const setConfirm = useCallback((value: boolean) => {
    confirmingRef.current = value;
    setConfirming(value);
  }, []);
  const closeDrawer = useCallback(() => {
    if (!confirmingRef.current) onClose();
  }, [onClose]);

  const assignee = personName(test.ownerId);
  const title = `Remediate: ${test.name}`;
  const create = () => {
    const task = addTask(test.id, title, assignee);
    const message = `Task ${task.id} created and assigned to ${assignee}.`;
    setConfirmation(message);
    setConfirm(false);
    toast(message);
  };

  return (
    <>
      <Drawer
        open
        onClose={closeDrawer}
        title="How to remediate"
        subtitle={`${test.id} · ${test.name}`}
      >
        <p className="text-sm text-slate-700">
          Work through these steps, then wait for the next run to confirm the test passes.
        </p>
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-slate-900">
          {test.remediation.map((step, i) => {
            const { text, snippets } = splitStep(step);
            return (
              <li key={i}>
                {text}
                {snippets.map((code, k) => (
                  <div key={k} className="mt-1.5">
                    <CopyField label={`Step ${i + 1} snippet`} value={code} />
                  </div>
                ))}
              </li>
            );
          })}
        </ol>
        {test.failingEntities.length > 0 && (
          <CopyField label="Failing entities" value={test.failingEntities.join('\n')} />
        )}
        <CopyField label="Task title" value={title} />
        <div className="flex flex-col gap-2">
          <div>
            <Button variant="primary" onClick={() => setConfirm(true)}>
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
      <Modal
        open={confirming}
        onClose={() => setConfirm(false)}
        title="Create a task?"
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={create}>
              Create task
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          This creates the task “{title}” and assigns it to {assignee}.
        </p>
      </Modal>
    </>
  );
}

function FailingEntities({ test }: { test: ComplianceTest }) {
  if (test.failingEntities.length === 0) {
    return (
      <Empty title="Nothing is failing">
        The last run on {fmtDateTime(test.lastRunAt)} found no failing entity.
      </Empty>
    );
  }
  const days = daysUntil(test.dueDate, NOW, tenant.timeZone);
  return (
    <ul
      aria-label="Failing entities"
      className="divide-y divide-slate-100 rounded-lg border border-slate-200"
    >
      {test.failingEntities.map((entity) => {
        const target = entityTarget(entity, test.integrationId);
        return (
          <li
            key={entity}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2 text-slate-900">
              <CircleX size={16} aria-hidden className="shrink-0 text-red-700" />
              <span className="font-medium">{entity}</span>
            </span>
            <span className={`text-xs ${days < 0 ? 'font-medium text-red-800' : 'text-slate-700'}`}>
              Due {fmtDate(test.dueDate)} · {dueWords(days)}
            </span>
            <Link
              to={target.to}
              aria-label={`Open ${target.label} for ${entity}`}
              className={`inline-flex items-center gap-1 text-xs ${LINK}`}
            >
              {target.label}
              <ArrowUpRight size={12} aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The documents and policies of the controls this test feeds: what supports a pass. */
function evidenceFor(test: ComplianceTest) {
  const rows = new Map<
    string,
    { kind: 'Document' | 'Policy'; id: string; name: string; to: string; via: string[] }
  >();
  for (const c of controlsForTest(test.id)) {
    for (const id of c.documentIds) {
      const row = rows.get(id) ?? {
        kind: 'Document' as const,
        id,
        name: getDocument(id)?.name ?? id,
        to: `/documents?open=${id}`,
        via: [],
      };
      row.via.push(c.id);
      rows.set(id, row);
    }
    for (const id of c.policyIds) {
      const row = rows.get(id) ?? {
        kind: 'Policy' as const,
        id,
        name: getPolicy(id)?.name ?? id,
        to: `/policies?open=${id}`,
        via: [],
      };
      row.via.push(c.id);
      rows.set(id, row);
    }
  }
  return [...rows.values()];
}

function TestDetail({ test }: { test: ComplianceTest }) {
  const [remediating, setRemediating] = useState(false);
  const closeRemediation = useCallback(() => setRemediating(false), []);
  const [tab, setTab] = useUrlParam('tab');
  const tasks = useTasks(test.id);
  const integration = getIntegration(test.integrationId);
  const linked = controlsForTest(test.id);
  const byFramework = testFrameworkStatus(test);
  const evidence = evidenceFor(test);
  const history = [...test.history].reverse();

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
            How to remediate
          </Button>
        </>
      }
    >
      <ul
        aria-label="Test facts"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3"
      >
        <li>
          <StatusChip status={test.status} />
        </li>
        <Fact icon={User} label="Owner">
          {personName(test.ownerId)}
        </Fact>
        <Fact icon={Clock} label="Last run">
          {fmtDateTime(test.lastRunAt)}
        </Fact>
        <Fact icon={Timer} label="SLA">
          {test.slaDays} days to fix
        </Fact>
        <Fact icon={Plug} label="Source integration">
          {integration ? (
            <Link to={`/integrations/${integration.id}`} className={LINK}>
              {integration.name}
            </Link>
          ) : (
            '–'
          )}
        </Fact>
        <Fact icon={Tag} label="Category">
          {testCategory(test, integrations)}
        </Fact>
      </ul>

      <Card title="Status by framework">
        <ul aria-label="Status by framework" className="grid gap-3 md:grid-cols-2">
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

      <Tabs
        label="Test details"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'results',
            label: 'Results',
            count: test.failingEntities.length,
            content: (
              <div className="flex flex-col gap-3">
                {test.status === 'failing' && test.failingSince && (
                  <p className="text-sm text-slate-700">
                    Failing since {fmtDate(test.failingSince)}; fix by {fmtDate(test.dueDate)}.
                  </p>
                )}
                <FailingEntities test={test} />
              </div>
            ),
          },
          {
            id: 'evidence',
            label: 'Evidence',
            count: evidence.length,
            content:
              evidence.length === 0 ? (
                <Empty title="No evidence linked yet">
                  No document or policy is attached to the controls this test feeds.
                </Empty>
              ) : (
                <ul aria-label="Linked evidence" className="flex flex-col gap-2">
                  {evidence.map((e) => (
                    <li key={e.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                      <Link to={e.to} className={LINK}>
                        {e.name}
                      </Link>
                      <span className="block text-xs text-slate-600">
                        {e.kind} {e.id} · via {e.via.join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            id: 'history',
            label: 'History',
            count: history.length,
            content:
              history.length === 0 ? (
                <Empty title="No history yet" />
              ) : (
                <ol className="flex flex-col gap-2">
                  {history.map((h, i) => (
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
          {
            id: 'tasks',
            label: 'Tasks',
            count: tasks.length,
            content: <TaskList objectId={test.id} />,
          },
          {
            id: 'controls',
            label: 'Controls',
            count: linked.length,
            content:
              linked.length === 0 ? (
                <Empty title="No control uses this test yet" />
              ) : (
                <ul aria-label="Linked controls" className="flex flex-col gap-2">
                  {linked.map((c) => {
                    const s = controlStatus(c);
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                      >
                        <span>
                          <Link to={`/controls?open=${c.id}`} className={LINK}>
                            {c.id} {c.name}
                          </Link>
                          <span className="block text-xs text-slate-600">
                            {s.passing}/{s.total} tests passing
                          </span>
                        </span>
                        <StatusChip status={s.ok ? 'passing' : 'failing'} />
                      </li>
                    );
                  })}
                </ul>
              ),
          },
          {
            id: 'comments',
            label: 'Comments',
            count: test.comments.length,
            content:
              test.comments.length === 0 ? (
                <Empty title="No comments yet" />
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

      {remediating && <RemediationDrawer test={test} onClose={closeRemediation} />}
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
