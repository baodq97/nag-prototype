import { DAY_MS, daysUntil } from './time';
import type {
  ComplianceTest,
  Control,
  DailyPosture,
  FrameworkId,
  FrameworkItem,
  TestStatus,
} from './types';

export const DUE_SOON_DAYS = 14;

export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

export function testPassingPct(tests: ComplianceTest[]): number {
  return pct(tests.filter((t) => t.status === 'passing').length, tests.length);
}

export type AttentionBucket = 'overdue' | 'due-soon' | 'needs-remediation';

/** Each failing test falls in exactly one bucket, by how close its due date is. */
export function attentionBucket(
  test: ComplianceTest,
  now: string,
  timeZone: string,
): AttentionBucket | null {
  if (test.status === 'passing') return null;
  const days = daysUntil(test.dueDate, now, timeZone);
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'due-soon';
  return 'needs-remediation';
}

export function attentionCounts(
  tests: ComplianceTest[],
  now: string,
  timeZone: string,
): Record<AttentionBucket, number> {
  const counts = { overdue: 0, 'due-soon': 0, 'needs-remediation': 0 };
  for (const t of tests) {
    const b = attentionBucket(t, now, timeZone);
    if (b) counts[b] += 1;
  }
  return counts;
}

export interface ControlTestStatus {
  passing: number;
  total: number;
  ok: boolean;
}

/** "x/y tests passing" for a control; a control passes when all of its tests pass. */
export function controlTestStatus(
  control: Control,
  testsById: Map<string, ComplianceTest>,
): ControlTestStatus {
  const tests = control.testIds.flatMap((id) => testsById.get(id) ?? []);
  const passing = tests.filter((t) => t.status === 'passing').length;
  return { passing, total: tests.length, ok: passing === tests.length };
}

export function frameworksOf(itemIds: string[], items: FrameworkItem[]): FrameworkId[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return [...new Set(itemIds.flatMap((id) => byId.get(id)?.framework ?? []))];
}

export interface FrameworkPosture {
  framework: FrameworkId;
  passing: number;
  total: number;
  pct: number;
}

/** Share of controls passing among the controls mapped to each framework. */
export function controlPostureByFramework(
  controls: Control[],
  tests: ComplianceTest[],
  items: FrameworkItem[],
): FrameworkPosture[] {
  const testsById = new Map(tests.map((t) => [t.id, t]));
  return (['eu-ai-act', 'iso-42001'] as const).map((framework) => {
    const mapped = controls.filter((c) =>
      frameworksOf(c.frameworkItemIds, items).includes(framework),
    );
    const passing = mapped.filter((c) => controlTestStatus(c, testsById).ok).length;
    return { framework, passing, total: mapped.length, pct: pct(passing, mapped.length) };
  });
}

/** A test's status at an instant, from when its failure started and when it was fixed. */
export function testStatusAt(test: ComplianceTest, instant: string): TestStatus {
  const t = Date.parse(instant);
  const failing =
    test.failingSince !== undefined &&
    Date.parse(test.failingSince) <= t &&
    (test.fixedAt === undefined || Date.parse(test.fixedAt) > t);
  return failing ? 'failing' : 'passing';
}

/** Daily % of tests passing over the last `days` days, ending at `now`. */
export function postureTrend(tests: ComplianceTest[], now: string, days = 30): DailyPosture[] {
  const end = Date.parse(now);
  return Array.from({ length: days }, (_, i) => {
    const at = new Date(end - (days - 1 - i) * DAY_MS).toISOString();
    const passing = tests.filter((t) => testStatusAt(t, at) === 'passing').length;
    return { date: at.slice(0, 10), passingPct: pct(passing, tests.length) };
  });
}
