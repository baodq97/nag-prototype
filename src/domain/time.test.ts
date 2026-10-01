import { describe, expect, it } from 'vitest';
import { addDays, daysUntil, formatDate, formatDateTime, localParts, updatedAgo } from './time';

const NOW = '2026-09-30T08:00:00.000Z';

describe('time helpers', () => {
  it('reads wall-clock parts in the tenant zone', () => {
    expect(localParts(NOW, 'Europe/Berlin')).toEqual({
      date: '2026-09-30',
      weekday: 3,
      hour: 10,
      minute: 0,
    });
    // 23:30 UTC is already the next day in Berlin.
    expect(localParts('2026-09-30T23:30:00.000Z', 'Europe/Berlin').date).toBe('2026-10-01');
  });

  it('counts calendar days to a due date', () => {
    expect(daysUntil('2026-09-30', NOW, 'Europe/Berlin')).toBe(0);
    expect(daysUntil('2026-10-14', NOW, 'Europe/Berlin')).toBe(14);
    expect(daysUntil('2026-09-28', NOW, 'Europe/Berlin')).toBe(-2);
  });

  it('adds days', () => {
    expect(addDays(NOW, 2)).toBe('2026-10-02T08:00:00.000Z');
  });

  it('formats dates and times in the tenant zone', () => {
    expect(formatDate('2026-09-30', 'Europe/Berlin')).toBe('30 Sept 2026');
    expect(formatDateTime(NOW, 'Europe/Berlin')).toBe('30 Sept 2026, 10:00');
  });

  it('says how long ago something was updated', () => {
    expect(updatedAgo('2026-09-30T07:42:00.000Z', NOW)).toBe('updated 18 minutes ago');
    expect(updatedAgo('2026-09-30T07:59:00.000Z', NOW)).toBe('updated 1 minute ago');
    expect(updatedAgo('2026-09-30T08:05:00.000Z', NOW)).toBe('updated 0 minutes ago');
  });
});
