import { frameworksOf } from './posture';
import type { ComplianceTest, Control, FrameworkItem, IntegrationKind } from './types';

/**
 * The one place integration types get their display label. A `Record` over the union, so a new
 * type without a label fails the type check. The list, its filters and the detail screen read it.
 */
export const INTEGRATION_KIND_LABEL: Record<IntegrationKind, string> = {
  'reverse-proxy': 'Reverse proxy',
  'lifecycle-hooks': 'Lifecycle hooks',
  'mcp-inspector': 'MCP inspector',
  identity: 'Identity provider',
  ticketing: 'Ticketing',
  cloud: 'Cloud',
  'source-control': 'Source control',
};

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
