import { expect, it } from 'vitest';
import { MIN_JUSTIFICATION, checkJustification } from './justification';

it('needs at least 20 characters, ignoring surrounding spaces', () => {
  expect(MIN_JUSTIFICATION).toBe(20);
  expect(checkJustification('too short')).toEqual({
    ok: false,
    length: 9,
    message: '9/20 characters – 11 more needed',
  });
  expect(checkJustification('   ' + 'x'.repeat(19) + '   ').ok).toBe(false);
  expect(checkJustification('x'.repeat(20))).toEqual({
    ok: true,
    length: 20,
    message: '20 characters',
  });
});
