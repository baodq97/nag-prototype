// Quarantine screen at 1280x800: summary and first row above the fold, one description line,
// "How it works" closed by default, a per-row Decide button, one-line ID cells, the default
// order by next deadline and the marker on rows the "About to escalate" tile counts.

import { type Page, expect, test } from '@playwright/test';
import { escalationFor, quarantine, quarantineSummary } from '../src/data';
import { nextDeadline } from '../src/domain/escalation';
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

const rowIds = (page: Page) =>
  page
    .getByRole('button', { name: /^Open Q-/ })
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')!.replace('Open ', '')));

test('the default order follows the nearest deadline, items without one last', async ({ page }) => {
  const withDeadline = quarantine
    .map((q) => ({ id: q.id, at: nextDeadline(escalationFor(q)) }))
    .filter((q) => q.at !== undefined)
    .sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!));
  const without = quarantine
    .filter((q) => nextDeadline(escalationFor(q)) === undefined)
    .map((q) => q.id);
  expect(withDeadline.length).toBeGreaterThan(1);
  expect(without.length).toBeGreaterThan(0);

  await page.goto('/quarantine');
  await expect(page.getByRole('button', { name: /^Open Q-/ }).first()).toBeVisible();
  const shown = await rowIds(page);
  expect(shown).toEqual([...withDeadline.map((q) => q.id), ...without]);

  // The soonest item is on top, and the rows with no deadline close the table.
  const first = page.getByRole('row').nth(1);
  await expect(first).toContainText(withDeadline[0]!.id);
  for (const id of without) {
    await expect(page.getByRole('row', { name: new RegExp(id) })).toContainText(/by policy/);
  }

  // A column header overrides the default: by ID, ascending.
  await page.getByRole('button', { name: 'ID', exact: true }).click();
  expect(await rowIds(page)).toEqual(quarantine.map((q) => q.id).sort());
});

test('the marked rows are the ones the tile counts, also after a decision', async ({ page }) => {
  await page.goto('/quarantine');
  const tile = page
    .getByText('About to escalate', { exact: true })
    .locator('xpath=following-sibling::p[1]');
  const marks = page.getByTestId('about-to-escalate');
  const expected = quarantineSummary().aboutToEscalate;
  expect(expected).toBeGreaterThan(0);

  await expect(tile).toHaveText(String(expected));
  await expect(marks).toHaveCount(expected);
  for (const mark of await marks.all()) {
    await expect(mark).toBeVisible();
    await expect(mark).toContainText('Escalates soon');
    await expect(mark).toContainText('About to escalate: next level within 1 business hour');
  }

  // Decide the first marked item: its mark goes away and the tile follows.
  const marked = page.getByRole('row').filter({ has: marks });
  const id = (await marked
    .first()
    .getByRole('button', { name: /^Open Q-/ })
    .textContent())!;
  await marked
    .first()
    .getByRole('button', { name: `Decide ${id}` })
    .click();
  const drawer = page.getByRole('dialog', { name: `Quarantine item ${id}` });
  await drawer.getByLabel('Justification').fill('Reviewed the answer, no personal data present.');
  await drawer.getByRole('button', { name: 'Approve' }).click();
  await expect(drawer.getByTestId('decision')).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).click();

  await expect(tile).toHaveText(String(expected - 1));
  await expect(marks).toHaveCount(expected - 1);
  await expect(page.getByRole('row', { name: new RegExp(id) })).not.toContainText('Escalates soon');
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
