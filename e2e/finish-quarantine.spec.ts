// Quarantine screen at 1280x800: summary and first row above the fold, one description line,
// "How it works" closed by default, a per-row Decide button and one-line ID cells.

import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

test('quarantine shows the summary and the first row without scrolling', async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  await page.goto('/quarantine');
  await expect(page.getByRole('heading', { level: 1, name: 'Quarantine queue' })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath('quarantine-1280x800.png') });

  // Exactly 1 descriptive line under the h1: the route purpose line.
  const header = page.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) });
  expect(await header.first().locator('p').count()).toBe(1);

  // Summary with 3 counts, then the first row, both above the fold.
  for (const label of ['Pending', 'About to escalate', 'Expired']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  const summary = await page.getByText('About to escalate', { exact: true }).boundingBox();
  const firstRow = await page.getByRole('row').nth(1).boundingBox();
  expect(summary).not.toBeNull();
  expect(firstRow).not.toBeNull();
  expect(summary!.y + summary!.height).toBeLessThan(800);
  expect(firstRow!.y + firstRow!.height).toBeLessThan(800);

  // The explanation and classifier card sit in a closed section after the queue.
  const how = page.getByTestId('how-it-works');
  await expect(how).toHaveJSProperty('open', false);
  await how.getByText('How it works', { exact: true }).click();
  await expect(how).toHaveJSProperty('open', true);
  await expect(how.getByTestId('stub-label').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('every ID cell renders on one line', async ({ page }) => {
  await page.goto('/quarantine');
  const ids = page.getByRole('button', { name: /^Open Q-/ });
  await expect(ids.first()).toBeVisible();
  const count = await ids.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const { height, lineHeight } = await ids.nth(i).evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    }));
    expect(Math.abs(height - lineHeight)).toBeLessThan(1);
  }
});

test('the Decide button opens the drawer', async ({ page }) => {
  await page.goto('/quarantine');
  const decide = page.getByRole('button', { name: /^Decide Q-/ });
  await expect(decide.first()).toBeVisible();
  const label = await decide.first().getAttribute('aria-label');
  const id = label!.replace('Decide ', '');
  await decide.first().click();
  await expect(page.getByRole('dialog', { name: `Quarantine item ${id}` })).toBeVisible();
});
