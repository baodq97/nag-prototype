import { localParts } from './time';
import type { Escalation, Tenant } from './types';

const HOUR_MS = 3_600_000;

/** Business hours before an item moves to the secondary reviewer, then again to the manager. */
export const SECONDARY_AFTER_HOURS = 4;
export const MANAGER_AFTER_HOURS = 8;

type Hours = Pick<Tenant, 'timeZone' | 'businessHours'>;

function isBusinessTime(ms: number, tenant: Hours): boolean {
  const { weekday, hour } = localParts(ms, tenant.timeZone);
  return (
    weekday >= 1 &&
    weekday <= 5 &&
    hour >= tenant.businessHours.start &&
    hour < tenant.businessHours.end
  );
}

// Steps hour by hour in UTC. That is exact for zones whose UTC offset is a whole number of
// hours, such as Europe/Berlin in summer and winter time, so DST changes need no special case.
function nextHour(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS + HOUR_MS;
}

/** Business minutes between two instants in the tenant time zone. */
export function businessMinutesBetween(start: string, end: string, tenant: Hours): number {
  const stop = Date.parse(end);
  let t = Date.parse(start);
  let total = 0;
  while (t < stop) {
    const next = Math.min(stop, nextHour(t));
    if (isBusinessTime(t, tenant)) total += next - t;
    t = next;
  }
  return Math.round(total / 60_000);
}

/** The instant at which `minutes` business minutes have passed after `start`. */
export function addBusinessMinutes(start: string, minutes: number, tenant: Hours): string {
  let t = Date.parse(start);
  let left = minutes * 60_000;
  while (left > 0) {
    const next = nextHour(t);
    if (isBusinessTime(t, tenant)) {
      const used = Math.min(left, next - t);
      left -= used;
      t += used;
    } else {
      t = next;
    }
  }
  return new Date(t).toISOString();
}

/** Where a quarantined item stands: primary reviewer, secondary, manager, or expired. */
export function escalationOf(receivedAt: string, now: string, tenant: Tenant): Escalation {
  const businessMinutes = businessMinutesBetween(receivedAt, now, tenant);
  const steps: [Escalation['level'], number][] = [
    ['primary', SECONDARY_AFTER_HOURS * 60],
    ['secondary', MANAGER_AFTER_HOURS * 60],
    ['manager', tenant.quarantineExpiryBusinessHours * 60],
  ];
  for (const [level, until] of steps) {
    if (businessMinutes < until) {
      return { level, businessMinutes, nextAt: addBusinessMinutes(receivedAt, until, tenant) };
    }
  }
  return { level: 'expired', businessMinutes };
}
