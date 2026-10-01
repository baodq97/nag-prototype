import { unlocksFor } from '../../data';

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "unlocks 3 tests · 2 controls", from the seeded tests that read from the source. */
export function unlocksLine(integrationId: string): string {
  const u = unlocksFor(integrationId);
  return `unlocks ${plural(u.tests, 'test', 'tests')} · ${plural(u.controls, 'control', 'controls')}`;
}
