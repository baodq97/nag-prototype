import { type FormEvent, type ReactNode, useState } from 'react';
import { itemRefs, people } from '../data';
import type { Comment, HistoryEntry } from '../domain/types';
import { addTask, useTasks } from '../session/store';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { SelectField, TextField } from './Field';
import { useToast } from './useToast';
import { fmtDate, fmtDateTime } from './format';
import { StatusChip } from './StatusChip';
import { Tabs } from './Tabs';

/** What every console object (test, control, document, policy, risk) shows in its drawer. */
export interface DrawerObject {
  id: string;
  kind: string;
  title: string;
  owner: string;
  status: string;
  /** "Due date", "SLA", "Renewal" or "Next review", with its value already formatted. */
  due: { label: string; value: string };
  frameworkItemIds: string[];
  history: HistoryEntry[];
  comments: Comment[];
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function History({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-slate-600">No history yet.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {[...entries].reverse().map((h, i) => (
        <li key={i} className="text-sm">
          <span className="text-slate-900">{h.text}</span>
          <span className="block text-xs text-slate-600">
            {h.actor} · {fmtDateTime(h.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function TaskList({ objectId }: { objectId: string }) {
  const tasks = useTasks(objectId);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(people[0]!.name);
  const [added, setAdded] = useState<string | null>(null);
  const toast = useToast();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const task = addTask(objectId, title.trim(), assignee);
    setAdded(`Task ${task.id} created and assigned to ${assignee}.`);
    toast(`Task ${task.id} created`);
    setTitle('');
  };
  return (
    <div className="flex flex-col gap-3">
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-600">No tasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Tasks">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium">{t.title}</span>
              <span className="block text-xs text-slate-600">
                {t.id} · {t.assignee} · {fmtDate(t.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
        <TextField label="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <SelectField
          label="Assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          options={people.map((p) => ({ value: p.name, label: p.name }))}
        />
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
            Add task
          </Button>
        </div>
        {added && (
          <p role="status" className="text-xs text-emerald-800">
            {added}
          </p>
        )}
      </form>
    </div>
  );
}

function Comments({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return <p className="text-sm text-slate-600">No comments yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {comments.map((c, i) => (
        <li key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
          <p>{c.text}</p>
          <p className="mt-1 text-xs text-slate-600">
            {c.author} · {fmtDateTime(c.at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** History / Tasks / Comments of an object; the drawer and the full test page share it. */
export function ObjectActivity({
  object,
  initialTab,
}: {
  object: Pick<DrawerObject, 'id' | 'kind' | 'history' | 'comments'>;
  initialTab?: 'history' | 'tasks' | 'comments';
}) {
  return (
    <Tabs
      label={`${object.kind} activity`}
      initial={initialTab}
      tabs={[
        { id: 'history', label: 'History', content: <History entries={object.history} /> },
        { id: 'tasks', label: 'Tasks', content: <TaskList objectId={object.id} /> },
        { id: 'comments', label: 'Comments', content: <Comments comments={object.comments} /> },
      ]}
    />
  );
}

/** The one detail drawer for every console object. `children` adds object-specific detail. */
export function ObjectDrawer({
  object,
  onClose,
  children,
  initialTab,
}: {
  object: DrawerObject | undefined;
  onClose: () => void;
  children?: ReactNode;
  initialTab?: 'history' | 'tasks' | 'comments';
}) {
  return (
    <Drawer
      open={object !== undefined}
      onClose={onClose}
      title={object?.title ?? ''}
      subtitle={object && `${object.kind} · ${object.id}`}
    >
      {object && (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Meta label="Owner">{object.owner}</Meta>
            <Meta label="Status">
              <StatusChip status={object.status} />
            </Meta>
            <Meta label={object.due.label}>{object.due.value}</Meta>
            <Meta label="Frameworks">{itemRefs(object.frameworkItemIds) || '–'}</Meta>
          </dl>
          {children}
          <ObjectActivity object={object} initialTab={initialTab} />
        </>
      )}
    </Drawer>
  );
}
