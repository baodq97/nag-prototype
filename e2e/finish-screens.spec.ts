// Finish the console, part 1 (R1, R2, R3, R4, R5, R8) at 1280x800: geometry and text checks, each
// with a screenshot for a person to review. Expected numbers come from the seed.

import { expect, test, type Page } from '@playwright/test';
import { integrations, tests, tenant, NOW } from '../src/data';
import { INTEGRATION_KIND_LABEL } from '../src/domain/integrations';
import { testStrip } from '../src/domain/summaries';
import { fmtDate } from '../src/ui/format';
import { collectErrors } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/finish-${name}.png`, fullPage: true });

test('R1: every "Applies now" chip sits inside its Dates cell and clear of the Status chip', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/coverage');
  await expect(page.getByRole('heading', { level: 1, name: 'Article coverage' })).toBeVisible();

  const rows = await page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
    };
    const out: {
      id: string;
      overflow: number;
      overlap: boolean;
      oneLine: boolean;
    }[] = [];
    for (const tr of document.querySelectorAll('tbody tr[id]')) {
      const chips = tr.querySelectorAll('[data-testid="applies-now"]');
      if (chips.length === 0) continue;
      const cells = tr.querySelectorAll('td');
      const dates = box(cells[4]!);
      const status = cells[5]!.querySelector('span, div');
      const statusBox = status ? box(status) : null;
      for (const chip of chips) {
        const c = box(chip);
        const overflow = Math.max(
          0,
          dates.left - c.left,
          c.right - dates.right,
          dates.top - c.top,
          c.bottom - dates.bottom,
        );
        const overlap =
          statusBox !== null &&
          c.left < statusBox.right &&
          c.right > statusBox.left &&
          c.top < statusBox.bottom &&
          c.bottom > statusBox.top;
        const lineHeight = parseFloat(getComputedStyle(chip).lineHeight) || 20;
        out.push({ id: tr.id, overflow, overlap, oneLine: c.height < lineHeight * 1.9 });
      }
    }
    return out;
  });

  expect(rows.length).toBeGreaterThan(0);
  for (const r of rows) {
    expect(r.overflow, `${r.id} overflow`).toBe(0);
    expect(r.overlap, `${r.id} overlap`).toBe(false);
    expect(r.oneLine, `${r.id} one line`).toBe(true);
  }
  await shot(page, 'coverage');
  expect(errors).toEqual([]);
});

test('R2: no word is split across lines in the Operations card; only identifiers may break anywhere', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');
  await expect(page.getByRole('heading', { level: 2, name: 'Operations' })).toBeVisible();

  const result = await page.evaluate(() => {
    const card = [...document.querySelectorAll('section')].find(
      (s) => s.querySelector(':scope > header h2')?.textContent === 'Operations',
    )!;
    const split: string[] = [];
    const breakAnywhere: string[] = [];
    for (const dd of card.querySelectorAll('dd')) {
      const cs = getComputedStyle(dd);
      if (cs.wordBreak === 'break-all' || cs.overflowWrap === 'anywhere') {
        breakAnywhere.push(dd.textContent ?? '');
      }
    }
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? '';
      for (const m of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(n, m.index!);
        range.setEnd(n, m.index! + m[0].length);
        const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
        if (tops.size > 1) split.push(m[0]);
      }
    }
    return { split, breakAnywhere };
  });

  expect(result.split).toEqual([]);
  expect(result.breakAnywhere).toEqual([]);
  await shot(page, 'evidence');
  expect(errors).toEqual([]);
});

async function descriptiveLines(page: Page): Promise<number> {
  return page.evaluate(() => {
    const h1 = document.querySelector('h1')!;
    const header = h1.closest('header')!;
    const purpose = header.querySelectorAll('[data-testid="page-purpose"]').length;
    // A screen's own description follows the header as a sibling block.
    const own = header.nextElementSibling?.classList.contains('max-w-3xl') ? 1 : 0;
    return purpose + own;
  });
}

test('R3: posture, coverage and test detail show exactly one descriptive line under the h1', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const probe = tests.find((t) => t.name === 'Prompt-injection probes run weekly')!;
  for (const [path, name] of [
    ['/', 'posture'],
    ['/coverage', 'coverage-lines'],
    [`/tests/${probe.id}`, 'test-detail'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await descriptiveLines(page), path).toBe(1);
    await shot(page, name);
  }
  expect(errors).toEqual([]);
});

test('R4: the prompt-injection test shows a fix-by date later than its failing-since date', async ({
  page,
}) => {
  const probe = tests.find((t) => t.name === 'Prompt-injection probes run weekly')!;
  expect(probe.failingSince).toBeTruthy();
  await page.goto(`/tests/${probe.id}`);
  const line = page.getByText(/^Failing since .+; fix by .+\.$/);
  await expect(line).toBeVisible();
  await expect(line).toHaveText(
    `Failing since ${fmtDate(probe.failingSince!)}; fix by ${fmtDate(probe.dueDate)}.`,
  );
  expect(probe.failingSince!.slice(0, 10) < probe.dueDate.slice(0, 10)).toBe(true);
  await shot(page, 'test-detail-dates');
});

test('R5: Overdue and Due soon on Posture equal those on Tests', async ({ page }) => {
  const strip = testStrip(tests, NOW, tenant.timeZone);

  await page.goto('/tests');
  const onTests = async (key: string) =>
    Number((await page.getByTestId(`tile-${key}`).innerText()).replace(/\D/g, ''));
  const testsOverdue = await onTests('overdue');
  const testsDueSoon = await onTests('due-soon');
  await shot(page, 'tests');

  await page.goto('/');
  const figure = async (label: string) => {
    const name = await page
      .getByRole('link', { name: new RegExp(`^${label} \\d+: show these tests$`) })
      .getAttribute('aria-label');
    return Number(/ (\d+):/.exec(name!)![1]);
  };
  const postureOverdue = await figure('Overdue');
  const postureDueSoon = await figure('Due soon');

  expect(postureOverdue).toBe(testsOverdue);
  expect(postureDueSoon).toBe(testsDueSoon);
  expect(postureOverdue).toBe(strip.overdue);
  expect(postureDueSoon).toBe(strip.dueSoon);
});

test('R8: no Available integration card shows a subtitle equal to its name', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/integrations?tab=available');
  const cards = page.getByRole('list', { name: 'Available integrations' }).getByRole('listitem');
  await expect(cards.first()).toBeVisible();

  const data = await cards.evaluateAll((els) =>
    els.map((el) => ({
      name: el.querySelector('h2')?.textContent ?? '',
      subtitle: el.querySelector('h2')?.nextElementSibling?.textContent ?? null,
    })),
  );
  expect(data.length).toBeGreaterThan(0);
  for (const d of data) {
    if (d.subtitle !== null)
      expect(d.subtitle.toLowerCase(), d.name).not.toBe(d.name.toLowerCase());
  }
  // A category label that differs from the name still shows.
  const differing = integrations.filter(
    (i) => INTEGRATION_KIND_LABEL[i.kind].toLowerCase() !== i.name.toLowerCase(),
  );
  expect(differing.length).toBeGreaterThan(0);
  await shot(page, 'integrations-available');
  expect(errors).toEqual([]);
});
