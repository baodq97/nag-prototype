// Paged evidence (R15): 50 rows per page, the pager, filters that return to page 1, the range
// links in the verification results, the page in the URL and the height of the page.

import { expect, test, type Page } from '@playwright/test';
import { evidence } from '../src/data';
import { getCode } from '../src/domain/codes';
import { collectErrors } from './helpers';

const PAGE_SIZE = 50;
const PAGES = 5;
const NAV = 'Pages of evidence records';

const pager = (page: Page) => page.getByRole('navigation', { name: NAV });
const openButtons = (page: Page) => page.getByRole('button', { name: /^Open record \d+$/ });

/** The seq of every record row on the current page, in the order shown. */
async function seqsOnPage(page: Page): Promise<number[]> {
  return (await openButtons(page).allInnerTexts()).map(Number);
}

async function expectPage(page: Page, n: number) {
  await expect(pager(page)).toContainText(`Page ${n} of ${PAGES}`);
}

test('the table shows 50 rows per page: 50, 50, 50, 50 and 10 for the 210 records', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');
  await expect(page.getByRole('heading', { level: 1, name: 'Evidence' })).toBeVisible();
  expect(evidence).toHaveLength(210);

  const counts: number[] = [];
  const seen = new Set<number>();
  for (let n = 1; n <= PAGES; n++) {
    await expectPage(page, n);
    const seqs = await seqsOnPage(page);
    counts.push(seqs.length);
    seqs.forEach((s) => seen.add(s));
    if (n < PAGES) await pager(page).getByRole('button', { name: 'Next' }).click();
  }
  expect(counts).toEqual([50, 50, 50, 50, 10]);
  expect(seen.size).toBe(210);

  expect(errors).toEqual([]);
});

test('the pager shows the page and the range, and disables Previous and Next at the ends', async ({
  page,
}) => {
  await page.goto('/evidence');
  const nav = pager(page);
  const previous = nav.getByRole('button', { name: 'Previous' });
  const next = nav.getByRole('button', { name: 'Next' });

  await expect(nav).toContainText('Page 1 of 5');
  await expect(nav).toContainText('1–50 of 210');
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(nav).toContainText('Page 2 of 5');
  await expect(nav).toContainText('51–100 of 210');
  await expect(previous).toBeEnabled();
  await expect(next).toBeEnabled();

  await page.goto('/evidence?page=5');
  await expect(nav).toContainText('Page 5 of 5');
  await expect(nav).toContainText('201–210 of 210');
  await expect(previous).toBeEnabled();
  await expect(next).toBeDisabled();

  await previous.click();
  await expect(nav).toContainText('Page 4 of 5');
});

test('the count stays the count after filtering, across all pages', async ({ page }) => {
  await page.goto('/evidence');
  await expect(page.getByText('210 of 210 evidence records')).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await expectPage(page, 2);
  await expect(page.getByText('210 of 210 evidence records')).toBeVisible();

  // Pick the code with the most records, so more than one page can be left.
  const byCode = new Map<string, number>();
  for (const r of evidence) {
    const label = getCode(r.code).label;
    byCode.set(label, (byCode.get(label) ?? 0) + 1);
  }
  const [code, total] = [...byCode.entries()].sort((a, b) => b[1] - a[1])[0]!;
  // The facet's name also holds its selected option ("Code All").
  await page.getByRole('combobox', { name: /^Code\b/ }).selectOption(code);
  await expect(page.getByText(`${total} of 210 evidence records`)).toBeVisible();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  await expect(pager(page)).toContainText(`1–${Math.min(total, PAGE_SIZE)} of ${total}`);
  await expect(pager(page)).toContainText(`Page 1 of ${pages}`);
});

test('changing the filter text, a facet or the sort returns to page 1', async ({ page }) => {
  await page.goto('/evidence?page=3');
  await expectPage(page, 3);

  await page.getByLabel('Filter evidence records').fill('a');
  await expect(pager(page)).toContainText(/Page 1 of \d/);
  await expect(page).not.toHaveURL(/page=/);
  await page.getByLabel('Filter evidence records').fill('');
  await expectPage(page, 1);

  await page.goto('/evidence?page=3');
  await expectPage(page, 3);
  await page.getByLabel('Endpoint').selectOption({ index: 1 });
  await expect(pager(page)).toContainText(/Page 1 of \d/);
  await expect(page).not.toHaveURL(/page=/);

  await page.goto('/evidence?page=3');
  await expectPage(page, 3);
  await page.getByRole('button', { name: 'Seq' }).click();
  await expectPage(page, 1);
  await expect(page).not.toHaveURL(/page=/);
  expect((await seqsOnPage(page))[0]).toBe(1);
});

test('a filter that matches nothing shows the empty state and no pager', async ({ page }) => {
  await page.goto('/evidence?page=2');
  await page.getByLabel('Filter evidence records').fill('zzz-no-such-record');

  await expect(page.getByText('No evidence records match these filters')).toBeVisible();
  await expect(page.getByText('0 of 210 evidence records')).toBeVisible();
  await expect(pager(page)).toHaveCount(0);
  await expect(openButtons(page)).toHaveCount(0);
});

test('a range link opens the first page that holds a record of the range and clears the filters', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');
  await page.getByRole('button', { name: 'Verify' }).click();
  const results = page.getByTestId('range-1').locator('xpath=ancestor::table');
  await expect(results).toBeVisible();

  const ranges = await results.getByRole('link').allInnerTexts();
  expect(ranges).toEqual(['1–50', '51–100', '101–150', '151–200', '201–211']);

  for (const text of ranges) {
    const [from, to] = text.split('–').map(Number) as [number, number];
    // A filter that is on must be cleared by the link.
    await page.getByLabel('Filter evidence records').fill('zzz');
    await expect(page.getByText('0 of 210 evidence records')).toBeVisible();

    await results.getByRole('link', { name: text }).click();
    await expect(page.getByText('210 of 210 evidence records')).toBeVisible();
    await expect(page.getByLabel('Filter evidence records')).toHaveValue('');

    const inRange = (seqs: number[]) => seqs.some((s) => s >= from && s <= to);
    await expect
      .poll(async () => inRange(await seqsOnPage(page)), { message: `${text} on its page` })
      .toBe(true);

    const previous = pager(page).getByRole('button', { name: 'Previous' });
    if (await previous.isEnabled()) {
      const current = Number(/Page (\d+) of/.exec(await pager(page).innerText())![1]);
      await previous.click();
      await expectPage(page, current - 1);
      expect(inRange(await seqsOnPage(page)), `${text} on the page before`).toBe(false);
    }
  }

  expect(errors).toEqual([]);
});

test('a range link follows the current sort', async ({ page }) => {
  await page.goto('/evidence');
  await page.getByRole('button', { name: 'Seq' }).click(); // ascending
  await page.getByRole('button', { name: 'Verify' }).click();

  // Ascending, record 201 is the 200th row (seq 137 is missing), so the last range starts on page 4
  // (descending it is on page 1); the first range is on page 1 (descending it is on page 4).
  await page.getByRole('link', { name: '201–211' }).click();
  await expectPage(page, 4);
  expect((await seqsOnPage(page)).some((s) => s >= 201)).toBe(true);

  await page.getByRole('link', { name: '1–50' }).click();
  await expectPage(page, 1);
  expect((await seqsOnPage(page)).some((s) => s <= 50)).toBe(true);
});

test('the page is in the URL: a range link, reload and Back return to the same page', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');
  const next = pager(page).getByRole('button', { name: 'Next' });
  await next.click();
  await next.click();
  await expectPage(page, 3);
  await expect(page).toHaveURL(/[?&]page=3\b/);

  const rows = await seqsOnPage(page);
  await page.reload();
  await expectPage(page, 3);
  expect(await seqsOnPage(page)).toEqual(rows);

  await page.goBack();
  await expectPage(page, 2);
  await expect(page).toHaveURL(/[?&]page=2\b/);

  // A range link is a navigation too: Back returns to where it was followed from.
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByRole('link', { name: '1–50' }).click();
  await expectPage(page, 4);
  await expect(page).toHaveURL(/[?&]page=4\b/);
  await page.reload();
  await expectPage(page, 4);
  await page.goBack();
  await expectPage(page, 2);

  expect(errors).toEqual([]);
});

test('a missing or out-of-range page value falls back to page 1', async ({ page }) => {
  const errors = collectErrors(page);
  for (const value of ['', '0', '-1', '6', '99', 'abc', '2.5']) {
    await page.goto(`/evidence?page=${value}`);
    await expectPage(page, 1);
    expect(await seqsOnPage(page)).toHaveLength(PAGE_SIZE);
  }
  await page.goto('/evidence');
  await expectPage(page, 1);

  expect(errors).toEqual([]);
});

test('the page stays within 3,000 px at 1280x800, on load and after Verify', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const height = () => page.evaluate(() => document.documentElement.scrollHeight);

  await page.goto('/evidence');
  await expectPage(page, 1);
  const onLoad = await height();
  test.info().annotations.push({ type: 'scrollHeight on load', description: String(onLoad) });
  expect(onLoad).toBeLessThanOrEqual(3000);

  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByTestId('range-101')).toBeVisible();
  const afterVerify = await height();
  test.info().annotations.push({
    type: 'scrollHeight after Verify',
    description: String(afterVerify),
  });
  expect(afterVerify).toBeLessThanOrEqual(3000);
});
