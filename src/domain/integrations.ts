import { frameworksOf } from './posture';
import type { ComplianceTest, Control, FrameworkItem } from './types';

export interface Unlocks {
  tests: number;
  controls: number;
  frameworks: number;
}

/** What connecting a source unlocks: its tests, the controls they feed, and their frameworks. */
export function integrationUnlocks(
  integrationId: string,
  tests: ComplianceTest[],
  controls: Control[],
  items: FrameworkItem[],
): Unlocks {
  const testIds = new Set(tests.filter((t) => t.integrationId === integrationId).map((t) => t.id));
  const fed = controls.filter((c) => c.testIds.some((id) => testIds.has(id)));
  const itemIds = [
    ...tests.filter((t) => testIds.has(t.id)).flatMap((t) => t.frameworkItemIds),
    ...fed.flatMap((c) => c.frameworkItemIds),
  ];
  return {
    tests: testIds.size,
    controls: fed.length,
    frameworks: frameworksOf(itemIds, items).length,
  };
}
