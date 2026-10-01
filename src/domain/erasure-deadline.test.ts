import { describe, expect, it } from 'vitest';
import { ERASURE_CEILING_DAYS, erasureClock, erasureDue } from './erasure-deadline';
import { DAY_MS } from './time';

const TZ = 'Europe/Berlin';

describe('erasureDue', () => {
  it('counts 5 working days after a Wednesday', () => {
    expect(erasureDue('2026-09-30T08:00:00.000Z', TZ)).toBe('2026-10-07');
  });

  it('starts from the next Monday for a request received on a Saturday', () => {
    expect(erasureDue('2026-10-03T11:00:00.000Z', TZ)).toBe('2026-10-09');
  });

  it('uses the tenant date: 23:30 UTC on a Sunday is already Monday in Berlin', () => {
    expect(erasureDue('2026-10-04T23:30:00.000Z', TZ)).toBe('2026-10-12');
    expect(erasureDue('2026-10-04T23:30:00.000Z', 'UTC')).toBe('2026-10-09');
  });

  it('lands on the next Friday for a request received on a Friday', () => {
    expect(erasureDue('2026-09-25T09:00:00.000Z', TZ)).toBe('2026-10-02');
  });

  it('never reaches the 30-day ceiling without public holidays', () => {
    for (let d = 0; d < 14; d++) {
      const received = new Date(Date.parse('2026-09-28T10:00:00.000Z') + d * DAY_MS).toISOString();
      const due = erasureDue(received, TZ);
      const calendarDays = (Date.parse(due) - Date.parse(received.slice(0, 10))) / DAY_MS;
      expect(calendarDays, received).toBeLessThanOrEqual(7);
      expect(calendarDays, received).toBeLessThan(ERASURE_CEILING_DAYS);
    }
  });
});

describe('erasureClock', () => {
  const now = '2026-09-30T08:00:00.000Z';

  it('counts the working days left up to the due date', () => {
    expect(erasureClock('2026-10-07', now, TZ)).toEqual({
      state: 'upcoming',
      workingDays: 5,
      text: 'due in 5 working days',
    });
    expect(erasureClock('2026-10-02', now, TZ).text).toBe('due in 2 working days');
    expect(erasureClock('2026-10-01', now, TZ).text).toBe('due in 1 working day');
  });

  it('says when the request is due today', () => {
    expect(erasureClock('2026-09-30', now, TZ)).toEqual({
      state: 'today',
      workingDays: 0,
      text: 'due today',
    });
  });

  it('counts the working days past the due date up to today', () => {
    expect(erasureClock('2026-09-28', now, TZ).text).toBe('overdue by 2 working days');
    expect(erasureClock('2026-09-29', now, TZ)).toEqual({
      state: 'overdue',
      workingDays: 1,
      text: 'overdue by 1 working day',
    });
  });

  it('skips the weekend and never shows 0', () => {
    const monday = '2026-10-05T08:00:00.000Z';
    expect(erasureClock('2026-10-02', monday, TZ).text).toBe('overdue by 1 working day');
    const saturday = '2026-10-03T08:00:00.000Z';
    expect(erasureClock('2026-10-02', saturday, TZ).text).toBe('overdue by 1 working day');
    expect(erasureClock('2026-10-05', saturday, TZ).text).toBe('due in 1 working day');
  });
});
