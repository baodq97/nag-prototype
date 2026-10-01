// The integrations screens: tabs with counts, the problems-first list, the connect flow, the scope
// dialog, the error panel and the detail page. Expected numbers come from the seed.

import { expect, test } from '@playwright/test';
import { getIntegration, integrations, tenant, unlocksFor } from '../src/data';
import { formatDateTime } from '../src/domain/time';
import { integrationTabCounts } from '../src/domain/summaries';
import { collectErrors, expectNoSeriousA11y } from './helpers';

const counts = integrationTabCounts(integrations);
const mcp = getIntegration('int-mcp')!;
const since = formatDateTime(mcp.failure!.since, tenant.timeZone);

/** A tab's accessible name is its label followed by its count. */
const tabName = (label: string, count: number) => new RegExp(`^${label} ?${count}$`);

const noHorizontalScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('/integrations has the tabs Connected, Available and Errors with their counts', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations');
  await expect(page.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible();

  const tabs = page.getByRole('tablist', { name: 'Integration views' });
  await expect(
    tabs.getByRole('tab', { name: tabName('Connected', counts.connected) }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    tabs.getByRole('tab', { name: tabName('Available', counts.available) }),
  ).toBeVisible();
  await expect(tabs.getByRole('tab', { name: tabName('Errors', counts.errors) })).toBeVisible();

  // The category label shows under the name; no column repeats it.
  await expect(page.getByRole('columnheader', { name: 'Type' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Last heartbeat' })).toBeVisible();

  // Acronyms keep their casing everywhere.
  const text = await page.locator('body').evaluate((el) => el.textContent ?? '');
  expect(text).not.toContain('Mcp');

  // The active tab lives in the URL and survives a reload.
  await tabs.getByRole('tab', { name: /^Available/ }).click();
  await expect(page).toHaveURL(/tab=available/);
  await page.reload();
  await expect(tabs.getByRole('tab', { name: /^Available/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await tabs.getByRole('tab', { name: /^Errors/ }).click();
  await expect(page).toHaveURL(/tab=errors/);
  await expect(page.getByRole('row').filter({ hasText: 'MCP inspector' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Connected lists the error row first, with its icon, chip, tags, heartbeat and actions', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(counts.connected);

  const first = rows.first();
  await expect(first).toContainText('MCP inspector');
  await expect(first).toContainText('Error');
  await expect(first.getByRole('list', { name: 'Capabilities of MCP inspector' })).toBeVisible();
  await expect(
    first.getByRole('button', { name: 'Configure scope of MCP inspector' }),
  ).toBeVisible();
  await first.getByRole('link', { name: 'Manage MCP inspector' }).click();
  await expect(page).toHaveURL(/\/integrations\/int-mcp$/);
  expect(errors).toEqual([]);
});

test('the error panel names what broke, since when, numbered fix steps and the dependent tests', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const dependent = page.getByRole('region', { name: 'MCP inspector needs a fix' });

  for (const path of ['/integrations', '/integrations/int-mcp']) {
    await page.goto(path);
    await expect(dependent).toBeVisible();
    await expect(dependent.getByText('No heartbeat since 07:12')).toBeVisible();
    await expect(dependent.getByText(mcp.failure!.what)).toBeVisible();
    await expect(dependent.getByText(since)).toBeVisible();
    const steps = dependent.getByRole('list').filter({ hasText: mcp.failure!.fixSteps[0]! });
    await expect(steps.getByRole('listitem')).toHaveCount(mcp.failure!.fixSteps.length);
    expect(await steps.evaluate((el) => el.tagName)).toBe('OL');
    expect(await dependent.getByRole('link').count()).toBeGreaterThan(0);
  }

  // A link goes to the test that depends on the source.
  await dependent.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/tests\/[\w-]+$/);
  expect(errors).toEqual([]);
});

test('Available shows cards with the unlocked tests and controls', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/integrations?tab=available');
  const cards = page.getByRole('list', { name: 'Available integrations' }).locator('> li');
  await expect(cards).toHaveCount(counts.available);

  const ts = getIntegration('int-hooks-ts')!;
  const u = unlocksFor(ts.id);
  const card = cards.filter({ hasText: ts.name });
  await expect(card).toContainText('Agent SDK hooks');
  await expect(card).toContainText(
    `unlocks ${u.tests} ${u.tests === 1 ? 'test' : 'tests'} · ${u.controls} ${u.controls === 1 ? 'control' : 'controls'}`,
  );
  await card.getByRole('link', { name: `View details of ${ts.name}` }).click();
  await expect(page).toHaveURL(/\/integrations\/int-hooks-ts$/);
  await expect(page.getByRole('heading', { level: 1, name: ts.name })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the connect flow runs four steps, labels the stubs and adds the source to Connected', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations?tab=available');
  await page.getByRole('button', { name: 'Connect Agent hooks for TypeScript' }).click();

  const dialog = page.getByRole('dialog', { name: 'Connect Agent hooks for TypeScript' });
  const progress = dialog.getByRole('list', { name: 'Progress' });
  await expect(progress.getByRole('listitem')).toHaveText([
    /Choose$/,
    /Configure$/,
    /Test connection$/,
    /First heartbeat$/,
  ]);
  await expect(progress.getByRole('listitem').first()).toHaveAttribute('aria-current', 'step');
  await expectNoSeriousA11y(page);

  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByText('int-hooks-ts-key')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Copy Configuration snippet' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Next' }).click();

  // The test result and the heartbeat are fixed stub results.
  await expect(dialog.getByTestId('stub-label')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Run test' }).click();
  await expect(dialog.getByText('Test passed')).toBeVisible();
  await dialog.getByRole('button', { name: 'Next' }).click();

  await expect(dialog.getByTestId('stub-label')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Finish and connect' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Check for heartbeat' }).click();
  await expect(dialog.getByText('Heartbeat received')).toBeVisible();
  await expectNoSeriousA11y(page);
  await dialog.getByRole('button', { name: 'Finish and connect' }).click();

  await expect(dialog).toBeHidden();
  const toast = page
    .getByRole('status')
    .filter({ hasText: 'Agent hooks for TypeScript connected' });
  await expect(toast).toBeVisible();
  const tabs = page.getByRole('tablist', { name: 'Integration views' });
  await expect(
    tabs.getByRole('tab', { name: tabName('Connected', counts.connected + 1) }),
  ).toBeVisible();
  await expect(
    tabs.getByRole('tab', { name: tabName('Available', counts.available - 1) }),
  ).toBeVisible();

  await tabs.getByRole('tab', { name: /^Connected/ }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Agent hooks for TypeScript' }),
  ).toContainText('Connected');

  // The detail page shows it as connected, and a reload forgets it: the session holds it only.
  await page.getByRole('link', { name: 'Manage Agent hooks for TypeScript' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Agent hooks for TypeScript' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Configure scope' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Configure scope groups resources by kind and asks for confirmation before saving', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations');
  await page.getByRole('button', { name: 'Configure scope of MCP inspector' }).click();

  const dialog = page.getByRole('dialog', { name: 'Configure scope: MCP inspector' });
  const servers = dialog.getByRole('region', { name: 'MCP servers' });
  const toolsGroup = dialog.getByRole('region', { name: 'Tools' });
  await expect(servers).toContainText('2 of 3 in scope');
  await expect(toolsGroup).toContainText('1 of 2 in scope');
  await expectNoSeriousA11y(page);

  // Nothing changed yet, so there is nothing to save.
  await expect(dialog.getByRole('button', { name: 'Save scope' })).toBeDisabled();
  await servers.getByRole('button', { name: 'Include all mcp servers' }).click();
  await expect(servers).toContainText('3 of 3 in scope');
  await toolsGroup.getByRole('button', { name: 'Exclude all tools' }).click();
  await expect(toolsGroup).toContainText('0 of 2 in scope');
  await expect(toolsGroup.getByRole('switch', { name: 'Customer lookup tool' })).toHaveAttribute(
    'aria-checked',
    'false',
  );

  await dialog.getByRole('button', { name: 'Save scope' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm scope change' });
  await expect(confirm).toContainText('Change 2 resources');
  await expect(page.getByTestId('toast')).toHaveCount(0);
  await confirm.getByRole('button', { name: 'Apply changes' }).click();

  await expect(confirm).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'Scope of MCP inspector saved' }),
  ).toBeVisible();

  // The saved choice shows when the dialog opens again.
  await page.getByRole('button', { name: 'Configure scope of MCP inspector' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Configure scope: MCP inspector' }).getByRole('region', {
      name: 'Tools',
    }),
  ).toContainText('0 of 2 in scope');
  expect(errors).toEqual([]);
});

test('the scope of a gateway holds its state while browsing, and cancel discards it', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations/int-proxy');
  await page.getByRole('tab', { name: /^Resources/ }).click();
  await expect(page).toHaveURL(/tab=resources/);
  await expect(page.getByText(/Connecting this source unlocks \d+ tests?/)).toBeVisible();

  const configure = page.getByRole('tabpanel').getByRole('button', { name: 'Configure scope' });
  await configure.click();
  const dialog = page.getByRole('dialog', { name: 'Configure scope: Reverse proxy gateway' });
  const sandbox = dialog.getByRole('switch', { name: 'Internal sandbox' });
  await expect(sandbox).toHaveAttribute('aria-checked', 'false');
  await sandbox.click();
  await expect(sandbox).toHaveAttribute('aria-checked', 'true');

  // Cancel throws the change away.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await configure.click();
  await expect(sandbox).toHaveAttribute('aria-checked', 'false');
  await sandbox.click();
  await dialog.getByRole('button', { name: 'Save scope' }).click();
  await page.getByRole('button', { name: 'Apply changes' }).click();

  await expect(page.getByText('3 of 3 in scope')).toBeVisible();

  // Browsing away and back keeps the saved choice (a reload would not: it lasts for the session).
  await page.getByRole('link', { name: 'All integrations' }).click();
  await page.getByRole('link', { name: 'Manage Reverse proxy gateway' }).click();
  await page.getByRole('button', { name: 'Configure scope' }).click();
  await expect(
    page.getByRole('dialog').getByRole('switch', { name: 'Internal sandbox' }),
  ).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('the detail page has Overview, Resources and Automated tests plus a side panel', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations/int-proxy');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Reverse proxy gateway' }),
  ).toBeVisible();

  const tabs = page.getByRole('tablist', { name: 'Integration sections' });
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // Overview: connection details, health and at least five activity entries, all demo data.
  const proxy = getIntegration('int-proxy')!;
  await expect(page.getByRole('heading', { name: 'Connection details' })).toBeVisible();
  await expect(page.getByText(proxy.connection.endpoint)).toBeVisible();
  await expect(page.getByText(proxy.connection.keyId)).toBeVisible();
  await expect(page.getByText('Last rotated')).toBeVisible();
  await expect(page.getByText('Events per minute')).toBeVisible();
  await expect(page.getByText('Error rate')).toBeVisible();
  expect(await page.getByText('Demo data', { exact: true }).count()).toBeGreaterThanOrEqual(3);
  expect(
    await page.getByRole('list', { name: 'Recent activity' }).getByRole('listitem').count(),
  ).toBeGreaterThanOrEqual(5);
  const raw = await page.locator('body').evaluate((el) => el.textContent ?? '');
  expect(raw).not.toMatch(/\d{4}-\d{2}-\d{2}T/);

  // Side panel.
  const side = page.getByRole('complementary', { name: 'About this source' });
  await expect(side).toContainText('AI gateway');
  await expect(side).toContainText('Works with');
  await expect(
    side.getByRole('list', { name: 'Capabilities of Reverse proxy gateway' }),
  ).toBeVisible();
  await expect(side.getByRole('heading', { name: 'Help' })).toBeVisible();

  await tabs.getByRole('tab', { name: /^Automated tests/ }).click();
  await expect(page).toHaveURL(/tab=tests/);
  await expect(page.getByRole('heading', { name: /Tests fed by this source/ })).toBeVisible();
  await page.reload();
  await expect(tabs.getByRole('tab', { name: /^Automated tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // The category label of a gateway is "AI gateway".
  await expect(page.getByText('Type: Reverse proxy')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the inspector detail page keeps its sessions and the label "MCP inspector"', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/integrations/int-mcp');
  await expect(page.getByRole('heading', { level: 1, name: 'MCP inspector' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'About this source' })).toContainText(
    'MCP inspector',
  );
  const text = await page.locator('body').evaluate((el) => el.textContent ?? '');
  expect(text).not.toContain('Mcp');
  expect(errors).toEqual([]);
});

test('no integrations route scrolls horizontally at 1280x800', async ({ page }) => {
  const errors = collectErrors(page);
  for (const path of [
    '/integrations',
    '/integrations?tab=available',
    '/integrations?tab=errors',
    '/integrations/int-mcp',
    '/integrations/int-mcp?tab=resources',
    '/integrations/int-proxy?tab=tests',
    '/integrations/int-hooks-ts',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await noHorizontalScroll(page), path).toBe(true);
  }
  await page.goto('/integrations');
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});
