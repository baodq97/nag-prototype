import { describe, expect, it } from 'vitest';
import { evidence } from '../../data';
import { CODES } from '../../domain/codes';
import { EVENT_TYPES, eventType } from './event-types';

describe('evidence event types', () => {
  it('labels every code in the catalogue', () => {
    for (const c of CODES) {
      expect(EVENT_TYPES[c.id], c.id).toBeDefined();
      expect(eventType(c.id).label, c.id).not.toBe(c.id);
    }
  });

  it('labels every code that occurs in a seeded record', () => {
    const used = new Set(evidence.map((r) => r.code));
    expect(used.size).toBeGreaterThan(0);
    for (const code of used) expect(eventType(code).label, code).not.toBe(code);
  });

  it('gives each code its own label', () => {
    const labels = CODES.map((c) => eventType(c.id).label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('falls back to the code for a code with no entry', () => {
    expect(eventType('NAG-X999').label).toBe('NAG-X999');
    expect(eventType('NAG-X999').icon).toBeDefined();
  });
});
