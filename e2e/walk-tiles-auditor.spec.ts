// The headline tiles on posture and tests (order, labels, counts, the filter each opens) and the
// explanation on the auditor view's overdue list, at 1280x800. Order is read from where the tiles
// are on screen, not from the DOM order. Expected numbers come from the seed.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { FRAMEWORK_NAMES, NOW, getAudit, tenant, tests } from '../src/data';
import { testStrip } from '../src/domain/summaries';
import { staleRecords } from '../src/screens/auditor/states';
import { collectErrors, expectNoSeriousA11y } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

const strip = testStrip(tests, NOW, tenant.timeZone);

/** Label, URL key and count of each tile, in the order a person reads them. */
const EXPECTED = [
  { label: 'Tests passing', key: 'passing', value: `${strip.passingPct}%` },
  { label: 'Overdue', key: 'overdue', value: String(strip.overdue) },
  { label: 'Due soon', key: 'due-soon', value: String(strip.dueSoon) },
  { label: 'Due later', key: 'needs-remediation', value: String(strip.needsRemediation) },
];

/** The locators sorted by their on-screen position: top to bottom, then left to right. */
async function byPosition(items: Locator[]): Promise<Locator[]> {
  const boxes = await Promise.all(
    items.map(async (l) => {
      const b = await l.boundingBox();
      expect(b).not.toBeNull();
      return { l, x: b!.x, y: b!.y };
    }),
  );
  return boxes.sort((a, b) => Math.round(a.y) - Math.round(b.y) || a.x - b.x).map((b) => b.l);
}

const postureLink = (page: Page, label: string) =>
  page
    .getByRole('region', { name: 'Key figures' })
    .getByRole('link', { name: new RegExp(`^${label} [\\d%]+: show these tests$`) });

test('posture shows the tiles in reading order with the new third label', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Posture overview' })).toBeVisible();

  const links = EXPECTED.map((t) => postureLink(page, t.label));
  for (const l of links) await expect(l).toBeVisible();
  const ordered = await byPosition(links);
  const labels = await Promise.all(
    ordered.map(async (l) => (await l.getAttribute('aria-label'))!.replace(/ [\d%]+: .*$/, '')),
  );
  expect(labels).toEqual(EXPECTED.map((t) => t.label));
  await expect(page.getByText('Needs remediation')).toHaveCount(0);

  for (const t of EXPECTED) {
    await expect(postureLink(page, t.label)).toHaveAttribute(
      'aria-label',
      `${t.label} ${t.value}: show these tests`,
    );
  }
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});

test('tests shows the same tiles in the same order with the same counts', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/tests');
  await expect(page.getByRole('heading', { level: 1, name: 'Tests' })).toBeVisible();

  const strips = page.getByRole('list', { name: 'Test headline figures' });
  const items = EXPECTED.map((t) => strips.getByTestId(`tile-${t.key}`));
  for (const i of items) await expect(i).toBeVisible();
  const ordered = await byPosition(items);
  const texts = await Promise.all(ordered.map((l) => l.innerText()));
  expect(texts.map((s) => s.split('\n').filter(Boolean))).toEqual(
    EXPECTED.map((t) => [t.label, t.value]),
  );
  await expect(page.getByText('Needs remediation')).toHaveCount(0);

  // The counts match what the posture links show.
  await page.goto('/');
  for (const t of EXPECTED) {
    await expect(postureLink(page, t.label)).toHaveAttribute(
      'aria-label',
      `${t.label} ${t.value}: show these tests`,
    );
  }
  expect(errors).toEqual([]);
});

test.describe('each tile opens its filter', () => {
  for (const t of EXPECTED) {
    test(`tests: ${t.label}`, async ({ page }) => {
      await page.goto('/tests');
      const tile = page.getByTestId(`tile-${t.key}`);
      await tile.getByRole('button').click();
      await expect(page).toHaveURL(new RegExp(`[?&]tile=${t.key}(&|$)`));
      await expect(tile.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: `Clear tile: ${t.label}` })).toBeVisible();
    });

    test(`posture: ${t.label} links to the filtered tests`, async ({ page }) => {
      await page.goto('/');
      await postureLink(page, t.label).click();
      await expect(page).toHaveURL(new RegExp(`/tests\\?tile=${t.key}$`));
      await expect(page.getByRole('heading', { level: 1, name: 'Tests' })).toBeVisible();
      await expect(page.getByTestId(`tile-${t.key}`).getByRole('button')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('button', { name: `Clear tile: ${t.label}` })).toBeVisible();
    });
  }
});

test('auditor view says which subset the overdue list shows, and the count is unchanged', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const audit = getAudit('AUD-2026-01')!;
  const stale = staleRecords(audit.framework);
  const framework = FRAMEWORK_NAMES[audit.framework];

  await page.goto('/auditor/AUD-2026-01');
  const heading = page.getByText(`Documents and policies past their date (${stale.length})`);
  await expect(heading).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'Documents and policies past their date' })
      .getByRole('listitem'),
  ).toHaveCount(stale.length);

  // One line of explanation sits directly under the heading and names the framework filter.
  const note = page.getByText(
    `Only documents and policies that cover at least one item of ${framework}, the framework of this audit.`,
  );
  await expect(note).toBeVisible();
  const [h, n] = await Promise.all([heading.boundingBox(), note.boundingBox()]);
  expect(n!.y).toBeGreaterThan(h!.y);
  expect(n!.y - (h!.y + h!.height)).toBeLessThan(40);
  await expect(note).not.toContainText(/request/i);

  // Each ID stays on one line.
  const ids = page.locator('main span.font-mono');
  const count = await ids.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const b = await ids.nth(i).boundingBox();
    const lh = await ids
      .nth(i)
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight));
    expect(b!.height).toBeLessThanOrEqual(lh * 1.5);
  }

  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});
