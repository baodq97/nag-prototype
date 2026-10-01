// In-memory state for the interactive demo actions. It lives for the browser session only:
// a reload starts again from the seed.

import { useSyncExternalStore } from 'react';
import type { RoleApproval } from '../domain/approval';
import type { ApprovalStep, Task } from '../domain/types';
import { NOW, qmsTemplates, seedTasks } from '../data';

export interface TimelineEntry {
  at: string;
  actor: string;
  text: string;
}

export interface QuarantineDecision {
  decision: 'approved' | 'rejected';
  justification: string;
  by: string;
  at: string;
}

export type ErasureStage = 'confirm' | 'key-destroyed' | 'countable' | 'attested';

export interface ErasureRun {
  subjectId: string;
  stage: ErasureStage;
  at: string;
}

export interface SessionState {
  killSwitch: {
    active: boolean;
    resumeApprovals: RoleApproval[];
    timeline: TimelineEntry[];
  };
  quarantineDecisions: Record<string, QuarantineDecision>;
  tasks: Task[];
  qmsChains: Record<string, ApprovalStep[]>;
  erasures: ErasureRun[];
  contentLogging: Record<string, boolean>;
  scope: Record<string, boolean>;
}

function initialState(): SessionState {
  return {
    killSwitch: { active: false, resumeApprovals: [], timeline: [] },
    quarantineDecisions: {},
    tasks: [...seedTasks],
    qmsChains: Object.fromEntries(qmsTemplates.map((t) => [t.id, t.chain])),
    erasures: [],
    contentLogging: {},
    scope: {},
  };
}

let state = initialState();
const listeners = new Set<() => void>();

export function getSession(): SessionState {
  return state;
}

export function updateSession(update: (s: SessionState) => SessionState): void {
  state = update(state);
  for (const l of listeners) l();
}

/** Back to the seed; used by tests. */
export function resetSession(): void {
  state = initialState();
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Reads a slice of the session; the component re-renders when that slice changes. The
 * selector must return a value held in the state (not a new object or array), or React
 * re-renders forever: derive filtered lists after the call, as `useTasks` does.
 */
export function useSession<T>(select: (s: SessionState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

/**
 * The demo clock: the fixed seed "now" plus the real time since the page loaded, so
 * actions taken in the session get increasing timestamps.
 */
const loadedAt = Date.now();
export function sessionNow(): string {
  return new Date(Date.parse(NOW) + (Date.now() - loadedAt)).toISOString();
}

let taskCounter = 100;

export function addTask(objectId: string, title: string, assignee: string): Task {
  const task: Task = {
    id: `TASK-${++taskCounter}`,
    objectId,
    title,
    assignee,
    createdAt: sessionNow(),
    done: false,
  };
  updateSession((s) => ({ ...s, tasks: [...s.tasks, task] }));
  return task;
}

export function useTasks(objectId: string): Task[] {
  const tasks = useSession((s) => s.tasks);
  return tasks.filter((t) => t.objectId === objectId);
}
