import { NOW } from '../../data';

/** "3 h 25 min" from a number of minutes. */
export function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Short wall-clock label of a moment in the tenant time zone: "14:30", or "Tue 14:30" on another day. */
export function fmtNextAt(at: string, timeZone: string): string {
  const opts = { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const;
  const time = new Intl.DateTimeFormat('en-GB', opts).format(new Date(at));
  const day = (v: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(v));
  if (day(at) === day(NOW)) return time;
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(
    new Date(at),
  );
  return `${weekday} ${time}`;
}

/** Score range of a band: the lower bound is included, the upper bound is not (except 1.00). */
export function fmtBandRange(min: number, max: number): string {
  return max >= 1
    ? `${min.toFixed(2)} to ${max.toFixed(2)}`
    : `${min.toFixed(2)} to < ${max.toFixed(2)}`;
}

/** Score range below the release threshold. */
export function fmtBelowRange(releaseThreshold: number): string {
  return `below ${releaseThreshold.toFixed(2)}`;
}
