// Walks each persona path of docs/demo-paths.md at 1280x800. On every step the heading, the
// purpose line on console screens and the thing the presenter points at are visible, and
// nothing scrolls sideways. Whether a screen makes its purpose clear stays a reviewer's call.

import { readFileSync } from 'node:fs';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

interface Step {
  path: string;
  /** The thing the presenter points at on this step. */
  anchor: (page: Page) => Locator;
  /** Console screens carry the purpose line; the auditor view and trust page have their own. */
  console?: boolean;
}

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const text = (t: string | RegExp) => (page: Page) =>
  page.getByText(t).filter({ visible: true }).first();
const tile = (key: string) => (page: Page) => page.getByTestId(`tile-${key}`);

const PATHS: Record<string, Step[]> = {
  'Compliance Officer': [
    { path: '/', anchor: text('Integration level: App context · Scenario S1') },
    { path: '/onboarding', anchor: h1 },
    { path: '/coverage', anchor: tile('needs-attention') },
    { path: '/documents', anchor: text('Review overdue') },
    { path: '/policies', anchor: text(/^Expired$/) },
    { path: '/trust', anchor: text('Under remediation'), console: false },
    { path: '/evidence', anchor: text('4 of 5 ranges verify; gap at seq 137 in 101–150') },
    { path: '/auditor/AUD-2026-01', anchor: h1, console: false },
    { path: '/packages', anchor: h1 },
  ],
  'AI/ML Engineer': [
    { path: '/tests?tile=overdue', anchor: tile('overdue') },
    {
      path: '/tests/TST-019',
      anchor: (page) => page.getByRole('button', { name: 'How to remediate' }),
    },
    { path: '/controls', anchor: text('Human review of quarantined output') },
    { path: '/integrations/int-mcp', anchor: text('No heartbeat since 07:12') },
    { path: '/lineage', anchor: h1 },
    { path: '/policy-bundles', anchor: h1 },
    {
      path: '/quarantine',
      anchor: (page) => page.getByRole('row').nth(1).getByRole('button', { name: 'Open Q-1045' }),
    },
  ],
  'Platform and SRE owner': [
    { path: '/runtime-health', anchor: h1 },
    { path: '/evidence', anchor: text('4 of 5 ranges verify; gap at seq 137 in 101–150') },
    { path: '/privacy', anchor: h1 },
    { path: '/kill-switch', anchor: h1 },
    {
      path: '/integrations',
      anchor: (page) => page.getByRole('row').nth(1).getByText('MCP inspector').first(),
    },
  ],
};

for (const [persona, steps] of Object.entries(PATHS)) {
  test(`${persona}: every step's anchor is visible without scrolling sideways`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    for (const step of steps) {
      await page.goto(step.path);
      await expect(h1(page), step.path).toBeVisible();
      if (step.console !== false) {
        await expect(page.getByTestId('page-purpose'), step.path).toBeVisible();
      }
      const anchor = step.anchor(page);
      await expect(anchor, step.path).toBeVisible();
      const box = (await anchor.boundingBox())!;
      expect(box.x + box.width, `${step.path} anchor right edge`).toBeLessThanOrEqual(1280);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${step.path} horizontal scroll`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}

// The labels and orders the doc names, each checked against the screen it is on.
const DOC = readFileSync('docs/demo-paths.md', 'utf8').replace(/\s+/g, ' ');

test('the doc names the tiles in the order the app shows them', async ({ page }) => {
  const tiles = ['Tests passing', 'Overdue', 'Due soon', 'Due later'];
  expect(DOC).toContain('"Tests passing", "Overdue", "Due soon" and "Due later"');
  await page.goto('/');
  const figures = page.getByRole('region', { name: 'Key figures' });
  const boxes = [];
  for (const t of tiles) {
    const link = figures.getByRole('link', { name: new RegExp(`^${t} [\\d%]+: `) });
    await expect(link).toBeVisible();
    boxes.push((await link.boundingBox())!);
  }
  for (let i = 1; i < boxes.length; i++) {
    const [a, b] = [boxes[i - 1]!, boxes[i]!];
    expect(Math.round(b.y) > Math.round(a.y) || b.x > a.x, tiles[i]).toBe(true);
  }
});

test('the doc lineage step matches the deep trace', async ({ page }) => {
  expect(DOC).toContain('Open "Runaway delegation stopped at depth 11"');
  expect(DOC).toContain('"Not run"');
  await page.goto('/lineage');
  await page
    .getByRole('combobox', { name: 'Trace' })
    .selectOption({ label: 'Runaway delegation stopped at depth 11' });
  await expect(page.getByRole('cell', { name: 'Not run', exact: true })).toBeVisible();
});

test('the doc quarantine step names the first row and the marker', async ({ page }) => {
  expect(DOC).toContain('Open the first item, Q-1045');
  expect(DOC).toContain('marked "Escalates soon"');
  await page.goto('/quarantine');
  await expect(
    page.getByRole('row').nth(1).getByRole('button', { name: 'Open Q-1045' }),
  ).toBeVisible();
  await expect(page.getByText('Escalates soon').first()).toBeVisible();
  await expect(page.getByText('About to escalate').first()).toBeVisible();
});

test('the doc auditor and packages steps match the app', async ({ page }) => {
  expect(DOC).toContain('only lists those that cover at least one item of ISO/IEC 42001');
  await page.goto('/auditor/AUD-2026-01');
  await expect(
    page.getByText('Only documents and policies that cover at least one item of ISO/IEC 42001'),
  ).toBeVisible();

  expect(DOC).toContain('numbered S-01 to S-13 without gaps');
  await page.goto('/packages');
  const numbers = page.getByTestId('section-number');
  await expect(numbers).toHaveCount(13);
  await expect(numbers.first()).toHaveText('S-01');
  await expect(numbers.last()).toHaveText('S-13');
});
