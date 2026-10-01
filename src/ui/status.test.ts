import { CircleCheck, CircleX } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { STATUS_KEYS, statusInfo } from './status';

describe('status registry', () => {
  it('gives every key a word, an icon and a sentence', () => {
    for (const key of STATUS_KEYS) {
      const info = statusInfo(key);
      expect(info.label, key).not.toBe('');
      expect(info.icon, key).toBeTruthy();
      expect(info.description, key).not.toBe('');
    }
  });

  it('shows an integrity gap as danger with a cross, never with the verified check', () => {
    const gap = statusInfo('gap');
    expect(gap).toMatchObject({ label: 'Gap found', variant: 'danger', icon: CircleX });
    expect(gap.description).not.toBe(statusInfo('verified').description);
    expect(statusInfo('verified').icon).toBe(CircleCheck);
  });

  it('falls back to a neutral entry with no tooltip for an unknown key', () => {
    expect(statusInfo('no-such-key')).toMatchObject({
      label: 'No such key',
      variant: 'neutral',
      description: '',
    });
  });
});
