// Interactive flows of the catalogue screens: tests, remediation, controls.

import { expect, test } from '@playwright/test';
import { getControl, tests } from '../src/data';
import { collectErrors } from './helpers';

const failing = tests.find((t) => t.status === 'failing')!;

test('filter tests, open a failing test, remediate and see the task', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/tests');
  await expect(page.getByRole('heading', { level: 1, name: 'Tests', exact: true })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Filter tests' }).fill(failing.name);
  await page.getByLabel('Status').selectOption('failing');
  await expect(page.getByRole('row')).toHaveCount(2); // header + the one match
  await page.getByRole('link', { name: failing.name, exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/tests/${failing.id}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: failing.name, exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Remediate' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  expect(await drawer.getByRole('listitem').count()).toBeGreaterThanOrEqual(3);

  await drawer.getByRole('button', { name: 'Create task' }).click();
  await expect(drawer.getByRole('status')).toContainText('created');

  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await expect(
    page.getByRole('list', { name: 'Tasks' }).getByText(`Remediate: ${failing.name}`),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('a filter that matches nothing shows the empty state, and can be cleared', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/tests');
  await page.getByRole('searchbox', { name: 'Filter tests' }).fill('no such test anywhere');
  await expect(page.getByText('No tests match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.getByText('No tests match these filters')).toBeHidden();
  expect(await page.getByRole('row').count()).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('/tests/:id for an unknown test shows a not-found page', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/tests/TST-999');
  await expect(page.getByRole('heading', { level: 1, name: 'Test not found' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('/controls?open=CTL-10 opens the drawer with the mapped tests', async ({ page }) => {
  const errors = collectErrors(page);
  const control = getControl('CTL-10')!;
  await page.goto('/controls?open=CTL-10');

  const drawer = page.getByRole('dialog', { name: control.name });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: /Mapped tests/ })).toBeVisible();
  const links = drawer.getByRole('link');
  expect(await links.count()).toBeGreaterThanOrEqual(control.testIds.length);
  await expect(drawer.getByRole('tab', { name: 'Tasks' })).toBeVisible();

  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();
  await expect(page).not.toHaveURL(/open=/);
  expect(errors).toEqual([]);
});

test('/controls?q= seeds the filter and a row opens the drawer', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/controls?q=A.6.2.6');
  await expect(page.getByRole('searchbox', { name: 'Filter controls' })).toHaveValue('A.6.2.6');
  const first = page.getByRole('row').nth(1).getByRole('button').first();
  await first.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(errors).toEqual([]);
});

test('integration scope toggles hold their state while browsing', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/integrations/int-proxy');
  const sandbox = page.getByRole('switch', { name: 'Internal sandbox' });
  await expect(sandbox).toHaveAttribute('aria-checked', 'false');
  await sandbox.click();
  await expect(sandbox).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/Connecting this source unlocks \d+ tests?/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('command-search deep link /coverage#aia-14 shows the row', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/coverage#aia-14');
  await expect(page.locator('tr#aia-14')).toBeVisible();
  expect(await page.locator('tbody tr').count()).toBe(9);
  expect(errors).toEqual([]);
});
