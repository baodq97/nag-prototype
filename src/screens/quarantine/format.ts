import { NOW } from '../../data';

/** "3 h 25 min" from a number of minutes. */
export function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Wall-clock age of an item at the fixed demo "now". */
export function fmtAge(receivedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(NOW) - Date.parse(receivedAt)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
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
