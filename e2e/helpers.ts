import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Uncaught page errors and console.error messages; assert it is empty at the end. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

/** Scans the whole page with axe and fails on any violation of impact serious or critical. */
export async function expectNoSeriousA11y(page: Page): Promise<void> {
  const scan = await new AxeBuilder({ page }).analyze();
  const serious = scan.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} – ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious).toEqual([]);
}
