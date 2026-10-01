// Paged evidence (R15): 50 rows per page, the pager, filters that return to page 1, the range
// links in the verification results, the page in the URL and the height of the page. Console
// evidence (R25 to R28): the last check on load, its next steps, plain event labels, no Tenant
// column, and the filters and the open record in the URL.

import { expect, test, type Page } from '@playwright/test';
import { evidence } from '../src/data';
import { CODES } from '../src/domain/codes';
import { EVENT_TYPES, eventType } from '../src/screens/evidence/event-types';
import { lastVerification } from '../src/seed/runtime';
import { fmtDateTime } from '../src/ui/format';
import { collectErrors, expectNoSeriousA11y } from './helpers';

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
    const label = eventType(r.code).label;
    byCode.set(label, (byCode.get(label) ?? 0) + 1);
  }
  const [code, total] = [...byCode.entries()].sort((a, b) => b[1] - a[1])[0]!;
  // The facet's name also holds its selected option ("Event type All").
  await page.getByRole('combobox', { name: /^Event type\b/ }).selectOption(code);
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

test('on load the last check shows as one line with a link to the range and when it ran', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');

  const line = page.getByTestId('verification-line');
  await expect(line).toHaveText('4 of 5 ranges verify; gap at seq 137 in 101–150');
  await expect(page.getByTestId('range-101')).toHaveCount(0);
  await expect(page.getByText(`Ran ${fmtDateTime(lastVerification.at)}`)).toBeVisible();

  // With the newest record first, 101–150 starts on page 2.
  await line.click();
  await expectPage(page, 2);
  await expect(page).toHaveURL(/[?&]page=2\b/);
  expect((await seqsOnPage(page)).some((s) => s >= 101 && s <= 150)).toBe(true);

  expect(errors).toEqual([]);
});

test('the gap shows three next steps: the records, the failing test and runtime health', async ({
  page,
}) => {
  await page.goto('/evidence');
  const steps = page.getByTestId('gap-next-steps');
  await expect(steps.getByRole('link')).toHaveCount(3);

  await expect(steps.getByRole('link', { name: /Review records 101–150/ })).toBeVisible();
  await expect(steps.getByRole('link', { name: /Failing test TST-013/ })).toHaveAttribute(
    'href',
    `/tests/${lastVerification.integrityTestId}`,
  );
  await expect(steps.getByRole('link', { name: /Runtime health/ })).toHaveAttribute(
    'href',
    '/runtime-health',
  );

  await steps.getByRole('link', { name: /Failing test/ }).click();
  await expect(page).toHaveURL(/\/tests\/TST-013$/);
  await page.goBack();
  await steps.getByRole('link', { name: /Runtime health/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Runtime health' })).toBeVisible();
});

test('Verify re-runs the check and the line stays the same', async ({ page }) => {
  await page.goto('/evidence');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByTestId('range-101')).toBeVisible();
  await expect(page.getByTestId('verification-line')).toHaveText(
    '4 of 5 ranges verify; gap at seq 137 in 101–150',
  );
  await expect(page.getByText(/^Re-run /)).toBeVisible();
});

test('event types show a plain label and an icon, and the raw code only in the drawer', async ({
  page,
}) => {
  await page.goto('/evidence');
  await expectPage(page, 1);
  const table = page.getByRole('table').last();

  const rows = table.getByRole('row');
  await expect(rows.nth(1)).toBeVisible();
  for (const row of (await rows.all()).slice(1)) {
    await expect(row.locator('td').nth(2).locator('svg')).toHaveCount(1);
  }
  const labels = new Set(
    (await table.locator('tbody tr td:nth-child(3)').allInnerTexts()).map((t) => t.trim()),
  );
  const known = new Set(Object.values(EVENT_TYPES).map((t) => t.label));
  for (const label of labels) expect(known.has(label), label).toBe(true);
  expect(labels.has('Allowed')).toBe(true);

  // The raw code is not shown in the table or the cards.
  await expect(table).not.toContainText('NAG-D0');
  await expect(page.locator('main')).not.toContainText('NAG-D0');

  // The newest blocked record is on the first page.
  const record = evidence.filter((r) => r.code === 'NAG-D002').sort((a, b) => b.seq - a.seq)[0]!;
  await page.getByRole('button', { name: `Open record ${record.seq}`, exact: true }).click();
  await expect(page.getByRole('dialog', { name: `Record ${record.seq}` })).toContainText(
    'NAG-D002',
  );
});

test('every event type in the catalogue has a label on the page', async ({ page }) => {
  await page.goto('/evidence');
  for (const c of CODES) {
    await expect(page.getByTestId(`code-${c.id}`)).toContainText(eventType(c.id).label);
  }
});

test('the Tenant column is gone', async ({ page }) => {
  await page.goto('/evidence');
  await expectPage(page, 1);
  const headers = (await page.getByRole('table').last().getByRole('columnheader').allInnerTexts())
    .map((t) => t.trim())
    .filter(Boolean);
  expect(headers).toEqual(['Seq', 'Timestamp', 'Event type', 'Endpoint', 'Keyed digest']);
  await expect(page.getByRole('columnheader', { name: /Tenant/ })).toHaveCount(0);
});

test('a reload restores the filters, the page and the open record', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');
  // Wait for each change to reach the URL, as the next one builds on it.
  await page.getByRole('combobox', { name: /^Event type\b/ }).selectOption('Allowed');
  await expect(page).toHaveURL(/code=Allowed/);
  await page.getByRole('combobox', { name: /^Endpoint\b/ }).selectOption({ index: 1 });
  await expect(page).toHaveURL(/endpoint=/);
  await page.getByLabel('Filter evidence records').fill('1');
  await expect(page).toHaveURL(/q=1\b/);
  const shown = (await page.getByText(/ of 210 evidence records/).innerText()).trim();

  await page.reload();
  await expect(page.getByRole('combobox', { name: /^Event type\b/ })).toHaveValue('Allowed');
  await expect(page.getByRole('combobox', { name: /^Endpoint\b/ })).not.toHaveValue('');
  await expect(page.getByLabel('Filter evidence records')).toHaveValue('1');
  await expect(page.getByText(shown)).toBeVisible();

  // The filters survive a page change, and a filter change after it drops the page only.
  let q = '1';
  const total = Number(/^(\d+) of/.exec(shown)![1]);
  if (total > PAGE_SIZE) {
    await pager(page).getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/[?&]page=2\b/);
    await page.reload();
    await expect(page.getByLabel('Filter evidence records')).toHaveValue('1');
    await expect(pager(page)).toContainText('Page 2');
    q = '13';
    await page.getByLabel('Filter evidence records').fill(q);
    await expect(page).not.toHaveURL(/page=/);
    await expect(page).toHaveURL(/[?&]q=13\b/);
    await expect(page).toHaveURL(/[?&]code=Allowed\b/);
  }

  const seq = (await seqsOnPage(page))[0]!;
  await openButtons(page).first().click();
  await expect(page).toHaveURL(new RegExp(`[?&]open=${seq}\\b`));
  await page.reload();
  await expect(page.getByRole('dialog', { name: `Record ${seq}` })).toBeVisible();
  await expect(page.getByLabel('Filter evidence records')).toHaveValue(q);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/open=/);

  expect(errors).toEqual([]);
});

test('Esc closes the record drawer and focus returns to the record button', async ({ page }) => {
  await page.goto('/evidence');
  const button = page.getByRole('button', { name: 'Open record 211', exact: true });
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Record 211' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('the record drawer has no serious accessibility violations', async ({ page }) => {
  await page.goto('/evidence');
  await openButtons(page).first().click();
  await expect(page.getByRole('dialog', { name: /^Record \d+$/ })).toBeVisible();
  await expectNoSeriousA11y(page);
});

test('no horizontal scroll at 1280x800', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/evidence');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByTestId('range-101')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
