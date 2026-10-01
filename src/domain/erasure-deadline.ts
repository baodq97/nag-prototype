import { DAY_MS, localParts } from './time';

// The deadline of an erasure request: five working days after the local day of receipt, and
// never more than 30 calendar days. Working days are Monday to Friday; public holidays are not
// modelled, so the 30-day ceiling cannot bite yet.

export const ERASURE_WORKING_DAYS = 5;
export const ERASURE_CEILING_DAYS = 30;

const shift = (date: string, days: number) =>
  new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);

const isWorkingDay = (date: string) => {
  const day = new Date(Date.parse(date)).getUTCDay();
  return day >= 1 && day <= 5;
};

/** Working days d with from < d ≤ to; 0 when `to` is not after `from`. */
function workingDaysBetween(from: string, to: string): number {
  let n = 0;
  for (let d = shift(from, 1); d <= to; d = shift(d, 1)) if (isWorkingDay(d)) n += 1;
  return n;
}

/** The due date (YYYY-MM-DD, tenant calendar) of a request received at `receivedAt`. */
export function erasureDue(receivedAt: string, timeZone: string): string {
  const received = localParts(receivedAt, timeZone).date;
  let due = received;
  for (let left = ERASURE_WORKING_DAYS; left > 0; ) {
    due = shift(due, 1);
    if (isWorkingDay(due)) left -= 1;
  }
  const ceiling = shift(received, ERASURE_CEILING_DAYS);
  return due < ceiling ? due : ceiling;
}

export interface ErasureClock {
  state: 'upcoming' | 'today' | 'overdue';
  workingDays: number;
  text: string;
}

const days = (n: number) => `${n} working ${n === 1 ? 'day' : 'days'}`;

/** How the due date stands against today in the tenant calendar. */
export function erasureClock(due: string, now: string, timeZone: string): ErasureClock {
  const today = localParts(now, timeZone).date;
  if (today === due) return { state: 'today', workingDays: 0, text: 'due today' };
  // N stays at least 1 when only a weekend lies between today and the due date.
  if (today < due) {
    const n = Math.max(1, workingDaysBetween(today, due));
    return { state: 'upcoming', workingDays: n, text: `due in ${days(n)}` };
  }
  const n = Math.max(1, workingDaysBetween(due, today));
  return { state: 'overdue', workingDays: n, text: `overdue by ${days(n)}` };
}
