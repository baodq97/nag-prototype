// Visits every route in the route table on the production build and checks the heading, the
// absence of errors, the accessibility scan and the demo-data label.

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { routes } from '../src/routes';
import { collectErrors } from './helpers';

for (const route of routes) {
  test(`${route.sample} renders cleanly`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(route.sample);

    await expect(
      page.getByRole('heading', { level: 1, name: route.heading, exact: true }),
    ).toBeVisible({ timeout: 5_000 });

    const demo = page.getByTestId('demo-label');
    if (route.demo) {
      await expect(demo).toBeVisible();
      await demo.hover();
      await expect(page.getByRole('tooltip')).toHaveText(
        'Values on this screen are seeded demo data. No runtime is connected.',
      );
    } else {
      await expect(demo).toHaveCount(0);
    }

    if (route.layout === 'console') {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'horizontal scroll at 1280 px').toBeLessThanOrEqual(0);
    }

    const scan = await new AxeBuilder({ page }).analyze();
    const serious = scan.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.help} – ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
    expect(serious).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('the navigation links every console route and has at least 4 groups', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  expect(await nav.getByRole('heading', { level: 2 }).count()).toBeGreaterThanOrEqual(4);
  for (const r of routes.filter((x) => x.nav)) {
    await expect(nav.getByRole('link', { name: r.nav!.label, exact: true })).toHaveAttribute(
      'href',
      r.sample,
    );
  }
});

test('command search opens with Ctrl+K and goes to a result', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command search' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Search' }).fill('oversight training');
  await expect(dialog.getByRole('option').first()).toContainText(
    'Reviewers completed oversight training',
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tests\/TST-020$/);
  expect(errors).toEqual([]);
});
