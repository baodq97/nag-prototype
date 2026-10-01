// Runtime health at 1280x800: the Stage column reads left-aligned, header and cells alike, in the
// stage table and in the breaches table.

import { expect, type Locator, test } from '@playwright/test';
import { collectErrors, expectNoSeriousA11y } from './helpers';

const TABLES = [
  { label: 'stage table', caption: /^Pipeline stages with configured latency budget/ },
  { label: 'breaches table', caption: /^Budget breach counters per pipeline stage/ },
];

/** Left and right edge of the rendered text of an element, and the box it sits in. */
const textEdges = (el: Locator) =>
  el.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const text = range.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    return {
      textLeft: text.left,
      textRight: text.right,
      boxLeft: box.left,
      boxRight: box.right,
      align: getComputedStyle(node).textAlign,
    };
  });

test('the Stage column is left-aligned in both tables, header and cells alike', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/runtime-health');
  await expect(page.getByRole('heading', { level: 1, name: 'Runtime health' })).toBeVisible();

  for (const { label, caption } of TABLES) {
    const table = page
      .locator('table')
      .filter({ has: page.locator('caption', { hasText: caption }) });
    await expect(table, label).toBeVisible();

    const header = table.getByRole('columnheader', { name: 'Stage' });
    const cells = table.locator('tbody tr > th[scope="row"]');
    const count = await cells.count();
    expect(count, label).toBeGreaterThan(1);

    const head = await textEdges(header);
    expect(['left', 'start'], `${label} header`).toContain(head.align);
    // Text sits at the left padding of its cell, not in the middle of it.
    expect(head.textLeft - head.boxLeft, `${label} header`).toBeLessThan(20);

    let widest = 0;
    for (let i = 0; i < count; i++) {
      const cell = await textEdges(cells.nth(i));
      expect(['left', 'start'], `${label} cell ${i}`).toContain(cell.align);
      expect(Math.abs(cell.textLeft - head.textLeft), `${label} cell ${i}`).toBeLessThanOrEqual(2);
      widest = Math.max(widest, cell.textRight - cell.textLeft);
    }
    // A centred cell would leave space on its left that grows with the column width.
    expect(head.boxRight - head.boxLeft, label).toBeGreaterThan(widest);
  }
  expect(errors).toEqual([]);
});

test('the Total row of the breaches table is left-aligned like the stages above it', async ({
  page,
}) => {
  await page.goto('/runtime-health');
  const table = page
    .locator('table')
    .filter({ has: page.locator('caption', { hasText: TABLES[1]!.caption }) });
  const stage = await textEdges(table.locator('tbody tr > th[scope="row"]').first());
  const total = await textEdges(table.locator('tfoot th'));
  expect(Math.abs(total.textLeft - stage.textLeft)).toBeLessThanOrEqual(2);
});

test('/runtime-health has no serious accessibility violation and no horizontal scroll', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/runtime-health');
  await expect(page.getByRole('heading', { level: 1, name: 'Runtime health' })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});
