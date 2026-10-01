import { DAY_MS, localParts } from './time';
import type { EvidenceRecord, LedgerSchedule, RangeVerification } from './types';
import { verifyRanges } from './verification';

// Operations on the evidence ledger: when the scheduled full verification runs, and what it
// finds. A run is never seeded: it is the same range verification the evidence screen runs,
// over the records the ledger held at the time of the run.

/** The instant at which the wall-clock time `hour:minute` on `date` occurs in `timeZone`. */
export function zonedInstant(date: string, hour: number, minute: number, timeZone: string): string {
  const wall = Date.parse(`${date}T00:00:00.000Z`) + (hour * 60 + minute) * 60_000;
  let guess = wall;
  // Two passes settle the offset, also on the day a daylight-saving change happens.
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess, timeZone);
    const seen = Date.parse(`${p.date}T00:00:00.000Z`) + (p.hour * 60 + p.minute) * 60_000;
    guess += wall - seen;
  }
  return new Date(guess).toISOString();
}

/** The scheduled runs on the 8 local days that start `from` days after today, oldest first. */
function runsAround(schedule: LedgerSchedule, now: string, timeZone: string, from: number) {
  const today = Date.parse(localParts(now, timeZone).date);
  return Array.from({ length: 8 }, (_, i) =>
    new Date(today + (from + i) * DAY_MS).toISOString().slice(0, 10),
  )
    .filter((d) => new Date(Date.parse(d)).getUTCDay() === schedule.weekday)
    .map((d) => zonedInstant(d, schedule.hour, schedule.minute, timeZone));
}

/** The latest scheduled run at or before `now`. */
export function lastRun(schedule: LedgerSchedule, now: string, timeZone: string): string {
  return runsAround(schedule, now, timeZone, -7)
    .filter((at) => at <= now)
    .at(-1)!;
}

/** The first scheduled run after `now`. */
export function nextRun(schedule: LedgerSchedule, now: string, timeZone: string): string {
  return runsAround(schedule, now, timeZone, 0).find((at) => at > now)!;
}

export interface LedgerRun {
  at: string;
  /** Records the ledger held at the run. */
  records: number;
  ranges: RangeVerification[];
  failing: RangeVerification[];
}

/** The full verification over every record whose timestamp is at or before `at`. */
export function runAt(records: EvidenceRecord[], at: string): LedgerRun {
  const held = records.filter((r) => r.timestamp <= at);
  const ranges = verifyRanges(held);
  return { at, records: held.length, ranges, failing: ranges.filter((r) => !r.ok) };
}

/** "Failed: 1 range (seq 101–150)" or "Passed: 4 ranges". */
export function runSummary(run: LedgerRun): string {
  const n = (k: number) => `${k} ${k === 1 ? 'range' : 'ranges'}`;
  if (run.failing.length === 0) return `Passed: ${n(run.ranges.length)}`;
  const which = run.failing.map((r) => `seq ${r.fromSeq}–${r.toSeq}`).join(', ');
  return `Failed: ${n(run.failing.length)} (${which})`;
}
