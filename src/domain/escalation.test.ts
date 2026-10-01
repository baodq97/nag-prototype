import { describe, expect, it } from 'vitest';
import {
  ABOUT_TO_ESCALATE_HOURS,
  addBusinessMinutes,
  businessMinutesBetween,
  escalationOf,
  isAboutToEscalate,
  nextDeadline,
} from './escalation';
import type { Tenant } from './types';

const tenant: Tenant = {
  id: 't',
  name: 'Test tenant',
  timeZone: 'Europe/Berlin',
  businessHours: { start: 9, end: 17 },
  quarantineTerminalDecision: 'reject',
  quarantineExpiryBusinessHours: 24,
};

// Friday 27 March 2026, 16:00 in Berlin (winter time, UTC+1). Summer time starts on
// Sunday 29 March, so the following Monday is UTC+2.
const FRIDAY_1600 = '2026-03-27T15:00:00.000Z';
const MONDAY_0930 = '2026-03-30T07:30:00.000Z';
const MONDAY_1200 = '2026-03-30T10:00:00.000Z';
const TUESDAY_1200 = '2026-03-31T10:00:00.000Z';

describe('businessMinutesBetween', () => {
  it('counts only the business hour left on Friday and the Monday hours across DST', () => {
    expect(businessMinutesBetween(FRIDAY_1600, MONDAY_1200, tenant)).toBe(60 + 180);
  });

  it('counts nothing over a weekend', () => {
    expect(
      businessMinutesBetween('2026-03-28T09:00:00.000Z', '2026-03-29T17:00:00.000Z', tenant),
    ).toBe(0);
  });

  it('counts nothing before opening or after closing', () => {
    expect(
      businessMinutesBetween('2026-09-30T04:00:00.000Z', '2026-09-30T07:00:00.000Z', tenant),
    ).toBe(0);
    expect(
      businessMinutesBetween('2026-09-30T15:00:00.000Z', '2026-09-30T21:00:00.000Z', tenant),
    ).toBe(0);
  });

  it('handles the October change back to winter time', () => {
    // Friday 23 Oct 2026 16:30 CEST to Monday 26 Oct 2026 10:00 CET.
    expect(
      businessMinutesBetween('2026-10-23T14:30:00.000Z', '2026-10-26T09:00:00.000Z', tenant),
    ).toBe(30 + 60);
  });

  it('is zero for an empty or reversed interval', () => {
    expect(businessMinutesBetween(MONDAY_1200, MONDAY_1200, tenant)).toBe(0);
    expect(businessMinutesBetween(MONDAY_1200, FRIDAY_1600, tenant)).toBe(0);
  });
});

describe('addBusinessMinutes', () => {
  it('lands on Monday 12:00 local time four business hours after Friday 16:00', () => {
    expect(addBusinessMinutes(FRIDAY_1600, 240, tenant)).toBe(MONDAY_1200);
  });

  it('returns the start for zero minutes', () => {
    expect(addBusinessMinutes(FRIDAY_1600, 0, tenant)).toBe(FRIDAY_1600);
  });
});

describe('escalationOf', () => {
  it('stays with the primary reviewer under 4 business hours', () => {
    expect(escalationOf(FRIDAY_1600, MONDAY_0930, tenant)).toEqual({
      level: 'primary',
      businessMinutes: 90,
      nextAt: MONDAY_1200,
    });
  });

  it('goes to the secondary reviewer after 4 business hours', () => {
    const e = escalationOf(FRIDAY_1600, MONDAY_1200, tenant);
    expect(e.level).toBe('secondary');
    // Four more business hours: Monday 12:00 + 4h = Monday 16:00 local.
    expect(e.nextAt).toBe('2026-03-30T14:00:00.000Z');
  });

  it('goes to the manager after a further 4 business hours', () => {
    expect(escalationOf(FRIDAY_1600, TUESDAY_1200, tenant).level).toBe('manager');
  });

  it('expires after the tenant expiry', () => {
    const e = escalationOf(FRIDAY_1600, '2026-04-06T10:00:00.000Z', tenant);
    expect(e.level).toBe('expired');
    expect(e.nextAt).toBeUndefined();
  });
});

describe('nextDeadline', () => {
  it('is the next escalation step while the item is with a reviewer', () => {
    expect(nextDeadline(escalationOf(FRIDAY_1600, MONDAY_0930, tenant))).toBe(MONDAY_1200);
  });

  it('is the expiry once the item is with the manager', () => {
    const e = escalationOf(FRIDAY_1600, TUESDAY_1200, tenant);
    expect(e.level).toBe('manager');
    // The tenant expiry is 24 business hours after receipt.
    expect(nextDeadline(e)).toBe(addBusinessMinutes(FRIDAY_1600, 24 * 60, tenant));
    expect(Date.parse(nextDeadline(e)!)).toBeGreaterThan(Date.parse(TUESDAY_1200));
  });

  it('is none for an expired item', () => {
    const e = escalationOf(FRIDAY_1600, '2026-04-06T10:00:00.000Z', tenant);
    expect(nextDeadline(e)).toBeUndefined();
  });

  it('is none for an item decided in the session', () => {
    const e = escalationOf(FRIDAY_1600, MONDAY_0930, tenant);
    expect(nextDeadline(e, true)).toBeUndefined();
    expect(nextDeadline(e, false)).toBe(MONDAY_1200);
  });
});

describe('isAboutToEscalate', () => {
  it('uses a threshold of 1 business hour', () => {
    expect(ABOUT_TO_ESCALATE_HOURS).toBe(1);
  });

  it('flags an item whose next step is at most 1 business hour away', () => {
    // Received Friday 16:00; the secondary step is due Monday 12:00 local.
    const at = (now: string) =>
      isAboutToEscalate(escalationOf(FRIDAY_1600, now, tenant), now, tenant);
    expect(at('2026-03-30T08:59:00.000Z')).toBe(false); // Monday 10:59, 61 minutes left
    expect(at('2026-03-30T09:00:00.000Z')).toBe(true); // Monday 11:00, 60 minutes left
    // Friday 16:30: 3.5 business hours before the step.
    expect(at('2026-03-27T15:30:00.000Z')).toBe(false);
  });

  it('never flags an expired item', () => {
    const now = '2026-04-06T10:00:00.000Z';
    expect(isAboutToEscalate(escalationOf(FRIDAY_1600, now, tenant), now, tenant)).toBe(false);
  });
});
