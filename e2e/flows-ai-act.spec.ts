// The reviewer path for the EU AI Act coverage: from the AI system inventory to the system's
// risk tier, role and applicable articles, on to the article coverage table and who owes what.

import { expect, test, type Page } from '@playwright/test';
import { articleRows, getControl, getTest, rowsForSystem } from '../src/data';
import { dutyLabel } from '../src/domain/aiact';
import { coverageCounts } from '../src/domain/summaries';
import { articleMap } from '../src/seed/articles';
import { collectErrors, expectNoSeriousA11y } from './helpers';

const ORIENTATION = 'This is orientation to support compliance readiness, not legal advice.';

const rowFor = (article: string) => articleMap.find((r) => r.article === article)!;

interface SystemCase {
  id: string;
  name: string;
  riskTier: string;
  role: string;
  transparency: string;
  discovery: string;
  /** Articles that must appear in the applicable list, named exactly. */
  articles: string[];
  /** The article link followed to the coverage table. */
  follow: string;
  nagRole: string;
  /** The date as the console formats it. */
  date: string;
  datePhrase: RegExp;
  signal?: string;
  signalCount?: string;
  /** The first reasoning outcome chip: the Role step. */
  roleOutcome: string;
}

const CASES: SystemCase[] = [
  {
    id: 'sys-credit',
    name: 'Credit scoring assistant',
    riskTier: 'Risk tier 2 · High',
    role: 'Provider and deployer',
    transparency: 'Transparency trigger: No',
    discovery: 'Discovered from gateway traffic',
    articles: [
      'Art. 12',
      'Art. 14',
      'Art. 19',
      'Art. 20',
      'Art. 26(5)',
      'Art. 26(6)',
      'Art. 72',
      'Art. 73',
      'Art. 86',
    ],
    follow: 'Art. 14',
    nagRole: 'NAG is the control',
    date: '2 Dec 2027',
    datePhrase: /Applies now|Not yet applying/,
    roleOutcome: 'Role: provider and deployer',
    signal: 'Model version changed from credit-scoring-v2 to credit-scoring-v3',
    signalCount: '1 signal',
  },
  {
    id: 'sys-support',
    name: 'Customer support agent',
    riskTier: 'Risk tier 3 · Limited',
    role: 'Provider and deployer',
    transparency: 'Transparency trigger: Yes',
    discovery: 'Discovered from gateway traffic',
    articles: ['Art. 50(1)'],
    follow: 'Art. 50(1)',
    nagRole: 'NAG supports',
    date: '2 Aug 2026',
    datePhrase: /Applies now/,
    roleOutcome: 'Role: provider and deployer',
    signal: 'Observed requests touching credit decisions, reassess',
    signalCount: '1 signal',
  },
  {
    id: 'sys-router',
    name: 'Support ticket router',
    riskTier: 'Risk tier 4 · Minimal',
    role: 'Deployer',
    transparency: 'Transparency trigger: No',
    discovery: 'Registered manually',
    articles: ['Art. 4'],
    follow: 'Art. 4',
    nagRole: 'NAG supports',
    date: '2 Feb 2025',
    datePhrase: /Applies now/,
    roleOutcome: 'Role: deployer',
  },
];

async function openInventory(page: Page) {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'AI systems', exact: true })
    .click();
  await expect(page).toHaveURL(/\/ai-systems$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'AI systems', exact: true }),
  ).toBeVisible();
}

for (const c of CASES) {
  test(`${c.name}: risk tier, role, applicable articles and who owes ${c.follow}`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await openInventory(page);
    await expect(page.getByText(ORIENTATION)).toBeVisible();
    await expect(page.getByTestId('demo-label')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toHaveCount(3);

    const tableRow = page.getByRole('row', { name: new RegExp(c.name) });
    await expect(tableRow).toContainText(c.discovery);
    await expect(tableRow).not.toContainText('Demo data');
    await expect(tableRow).toContainText(c.riskTier);
    if (c.signalCount) {
      await expect(tableRow).toContainText(c.signalCount);
      await expect(tableRow).not.toContainText(c.signal!);
    } else {
      await expect(tableRow).toContainText('None');
    }

    await page.getByRole('button', { name: c.name, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: c.name });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`open=${c.id}`));
    await expect(dialog).toContainText(c.riskTier);
    await expect(dialog).toContainText(c.role);
    await expect(dialog).toContainText(c.transparency);
    await expect(dialog.getByText('4. In an Annex III area?').first()).toBeVisible();
    await expect(dialog.getByText('5. Transparency trigger?').first()).toBeVisible();
    if (c.signal) await expect(dialog).toContainText(c.signal);

    // The reasoning starts with the Role step, and each step carries its outcome chip.
    const steps = dialog.locator('section[aria-labelledby="sys-reasoning"] li');
    await expect(steps).toHaveCount(7);
    await expect(steps.first()).toContainText('Role');
    await expect(steps.first().getByTestId('reasoning-outcome')).toHaveText(c.roleOutcome);
    for (const outcome of await dialog.getByTestId('reasoning-outcome').allTextContents()) {
      expect(outcome.length).toBeGreaterThan(0);
    }
    await expectNoSeriousA11y(page);

    // The article list is collapsed until asked for.
    const applicable = rowsForSystem(c.id);
    expect(applicable.length).toBeGreaterThan(0);
    const toggle = dialog.getByRole('button', {
      name: `Applicable articles (${applicable.length})`,
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog.getByRole('link', { name: c.follow, exact: true })).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    for (const article of c.articles) {
      await expect(dialog.getByRole('link', { name: article, exact: true })).toBeVisible();
    }
    // The sector lines (financial-services governance) show on the rows that carry them.
    for (const r of applicable) if (r.note) await expect(dialog, r.id).toContainText(r.note);
    await expectNoSeriousA11y(page);

    // Follow one article link to the coverage table: the row's drawer says who owes it.
    const row = rowFor(c.follow);
    await dialog.getByRole('link', { name: c.follow, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/coverage\\?.*#${row.id}$`));
    await expect(page.locator(`tr#${row.id}`)).toBeVisible();

    const drawer = page.getByRole('dialog', { name: `${row.article} ${row.title}` });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Provider');
    await expect(drawer).toContainText(dutyLabel(row.provider));
    await expect(drawer).toContainText('Deployer');
    await expect(drawer).toContainText(dutyLabel(row.deployer));
    await expect(drawer).toContainText(c.nagRole);
    await expect(drawer).toContainText(c.date);
    await expect(drawer).toContainText(c.datePhrase);
    await expect(page.getByText(ORIENTATION)).toBeVisible();

    if (row.id === 'aia-14') {
      await expect(page.locator('tr#aia-14')).toContainText('Needs attention');
    }
    expect(errors).toEqual([]);
  });
}

test('a system narrows the article coverage and Clear shows every article again', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const name = 'Credit scoring assistant';
  await openInventory(page);
  await page.getByRole('button', { name, exact: true }).click();
  await page
    .getByRole('dialog', { name })
    .getByRole('link', { name: 'View on Article coverage' })
    .click();

  await expect(page).toHaveURL(/\/coverage\?.*system=sys-credit/);
  await expect(page).toHaveURL(/role=/);
  await expect(page).toHaveURL(/risk=/);
  await expect(page.getByText(`Showing articles for ${name}`)).toBeVisible();
  const filtered = rowsForSystem('sys-credit').length;
  await expect(page.getByText(`Showing ${filtered} of 57 articles`)).toBeVisible();

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText(`Showing articles for ${name}`)).toBeHidden();
  await expect(page).not.toHaveURL(/system=/);
  await expect(page.getByText('Showing 57 of 57 articles')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(57);

  // "Clear filters" drops the system with the other filters.
  await page.goto('/coverage?system=sys-credit&role=both&risk=high&status=needs-attention');
  await expect(page.getByText(`Showing articles for ${name}`)).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByText(`Showing articles for ${name}`)).toBeHidden();
  await expect(page).not.toHaveURL(/system=/);
  await expect(page.getByText('Showing 57 of 57 articles')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the NAG role filter lists the three articles outside NAG scope', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/coverage');
  await expect(page.getByText(ORIENTATION)).toBeVisible();
  await expect(page.getByText('Showing 57 of 57 articles')).toBeVisible();
  for (const id of ['aia-26-3', 'aia-99']) {
    await expect(page.locator(`tr#${id}`)).toContainText(
      articleMap.find((r) => r.id === id)!.note!,
    );
  }
  for (const label of ['Group', 'My role', 'Risk tier']) {
    await expect(page.getByRole('combobox', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('searchbox', { name: 'Search articles' })).toBeVisible();

  await page
    .getByRole('combobox', { name: "NAG's role", exact: true })
    .selectOption({ label: 'Outside NAG scope' });
  await expect(page).toHaveURL(/nag=outside/);
  await expect(page.locator('tbody tr')).toHaveCount(3);
  for (const id of ['aia-22', 'aia-26-7', 'aia-48']) {
    await expect(page.locator(`tr#${id}`)).toBeVisible();
  }
  await expect(page.getByText('Showing 3 of 57 articles')).toBeVisible();
  expect(errors).toEqual([]);
});

test('every article that needs attention says why and links to the failing test', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const attention = articleRows().filter((r) => r.status === 'needs-attention');
  await page.goto('/coverage?status=needs-attention');
  await expect(page.locator('tbody tr')).toHaveCount(attention.length);
  for (const row of attention) {
    const failing = getTest(row.attention!.testId)!;
    const line = page.locator(`tr#${row.id}`).getByTestId('attention-line');
    await expect(line, row.id).toContainText(getControl(row.attention!.controlId)!.name);
    await expect(line.getByRole('link', { name: failing.name }), row.id).toHaveAttribute(
      'href',
      `/tests/${failing.id}`,
    );
  }

  const art14 = attention.find((r) => r.id === 'aia-14')!;
  await page.locator('tr#aia-14').getByTestId('attention-line').getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/tests/${art14.attention!.testId}$`));
  expect(errors).toEqual([]);
});

test('the coverage strip filters the table, writes the filter to the URL and clears again', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const counts = coverageCounts(articleRows());
  await page.goto('/coverage');
  await expect(page.getByTestId('demo-label')).toHaveCount(1);
  const strip = page.getByRole('list', { name: 'Coverage by status' });
  for (const [status, label] of [
    ['needs-attention', 'Needs attention'],
    ['covered', 'Covered'],
    ['shared', 'Shared'],
    ['outside', 'Outside NAG scope'],
  ] as const) {
    const tile = strip.getByTestId(`tile-${status}`);
    await expect(tile).toContainText(label);
    await expect(tile).toContainText(String(counts[status]));
    await tile.getByRole('button').click();
    await expect(page).toHaveURL(new RegExp(`status=${status}`));
    await expect(tile.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('tbody tr')).toHaveCount(counts[status]);
    await expect(page.getByText(`Showing ${counts[status]} of 57 articles`)).toBeVisible();
  }
  // The filter survives a reload; the active tile clears it.
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(counts.outside);
  await strip.getByTestId('tile-outside').getByRole('button').click();
  await expect(page).not.toHaveURL(/status=/);
  await expect(page.locator('tbody tr')).toHaveCount(57);
  expect(errors).toEqual([]);
});

test('rows sit under group headings with needs-attention first, one date line, and status chips', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/coverage');
  const headings = page.locator('section[aria-labelledby^="group-"] > h2');
  await expect(headings.first()).toContainText('P. Prohibited practices');
  await expect(headings.last()).toContainText('T. Transparency');
  await expect(headings).toHaveCount(9);

  // Inside a group the needs-attention rows come first.
  const classification = page.locator('section[aria-labelledby="group-B"]');
  const statuses = await classification.locator('tbody tr td:last-child').allTextContents();
  const firstOther = statuses.findIndex((t) => !t.includes('Needs attention'));
  expect(statuses.slice(firstOther).some((t) => t.includes('Needs attention'))).toBe(false);
  expect(statuses[0]).toContain('Needs attention');

  // Dates read "2 Aug 2026"; "Applies now" shows only on dates that have passed (now is 30 Sep 2026).
  const prohibited = page.locator('tr#aia-5');
  await expect(prohibited).toContainText('2 Feb 2025');
  await expect(prohibited).toContainText('Applies now');
  const highRisk = page.locator('tr#aia-14');
  await expect(highRisk).toContainText('2 Dec 2027');
  await expect(highRisk).not.toContainText('Applies now');
  const rowText = (await page.locator('tbody tr').allTextContents()).join(' ');
  expect(rowText).not.toMatch(/\d{4}-\d{2}-\d{2}/);

  // No row is taller than three lines at 1280x800, and the page does not scroll sideways.
  const tallest = await page
    .locator('tbody tr')
    .evaluateAll((trs) => Math.max(...trs.map((tr) => tr.getBoundingClientRect().height)));
  expect(tallest).toBeLessThanOrEqual(84);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  // Every status chip follows the registry, and Shared says in plain words who splits the duty.
  const shared = page.locator('tbody [data-chip="info"]').filter({ hasText: 'Shared' }).first();
  await shared.hover();
  await expect(
    page.getByRole('tooltip').filter({ hasText: 'NAG and the customer split this duty' }),
  ).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});
