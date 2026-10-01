import { describe, expect, it } from 'vitest';
import { CODES, codeText, getCode, isCode } from './codes';
import type { CodeId } from './types';

describe('code catalogue', () => {
  it('holds the seven required codes, each once, with a kind and a label', () => {
    const labels = CODES.map((c) => c.label);
    for (const label of [
      'Allowed',
      'Blocked fail-closed',
      'Quarantined',
      'Kill switch active',
      'Key destroyed tombstone',
      'Budget breach fail-open',
      'NAG unreachable bypass',
    ]) {
      expect(labels).toContain(label);
    }
    expect(new Set(CODES.map((c) => c.id)).size).toBe(CODES.length);
    expect(new Set(labels).size).toBe(CODES.length);
    for (const c of CODES) {
      expect(['decision', 'error']).toContain(c.kind);
      expect(c.id.startsWith(c.kind === 'decision' ? 'NAG-D' : 'NAG-E'), c.id).toBe(true);
    }
  });

  it('looks codes up by id', () => {
    expect(getCode('NAG-D002').label).toBe('Blocked fail-closed');
    expect(codeText('NAG-E003')).toBe('NAG unreachable bypass (NAG-E003)');
    expect(isCode('NAG-D001')).toBe(true);
    expect(isCode('allowed')).toBe(false);
    expect(() => getCode('NAG-X999' as CodeId)).toThrow('Unknown code');
  });
});
