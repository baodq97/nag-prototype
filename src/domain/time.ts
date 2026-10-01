// Time helpers. Every instant is an ISO string in UTC; every date shown or compared is the
// calendar date in the tenant time zone.

export const DAY_MS = 86_400_000;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

export interface LocalParts {
  date: string;
  weekday: number;
  hour: number;
  minute: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Wall-clock parts of an instant in a time zone; weekday 0 is Sunday. */
export function localParts(instant: string | number, timeZone: string): LocalParts {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Whole calendar days from the local date of `now` to `date` (YYYY-MM-DD); negative if past. */
export function daysUntil(date: string, now: string, timeZone: string): number {
  const today = localParts(now, timeZone).date;
  return Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS);
}

export function addDays(instant: string, days: number): string {
  return new Date(Date.parse(instant) + days * DAY_MS).toISOString();
}

export function formatDate(value: string, timeZone: string): string {
  // A bare date has no time zone of its own.
  const tz = value.length === 10 ? 'UTC' : timeZone;
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function formatDateTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(instant));
}

/** "updated N minutes ago", from the seed timestamp to the fixed "now". */
export function updatedAgo(then: string, now: string): string {
  const minutes = Math.max(0, Math.floor((Date.parse(now) - Date.parse(then)) / 60_000));
  return `updated ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
}
