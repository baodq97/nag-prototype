// Flows of the demo capabilities: the erasure deadline clock, an MCP inspector session with its
// tool calls, onboarding with the tenant's integration level, and the cards on the quarantine,
// evidence and package screens. Every expected value comes from the seed through the selectors.

import { expect, test } from '@playwright/test';
import { deployment, packageElements } from '../src/data';
import { collectErrors } from './helpers';

test('erasure requests show their deadline clock, and an attested erasure stops its clock', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/privacy');
  const table = page.getByRole('table', { name: 'Erasure requests' });
  await expect(table.getByRole('row', { name: /ER-0101/ })).toContainText(
    'overdue by 2 working days',
  );
  await expect(table.getByRole('row', { name: /ER-0102/ })).toContainText('due in 1 working day');
  await expect(table.getByRole('row', { name: /ER-0103/ })).toContainText('due in 2 working days');

  await page.getByLabel('Subject ID').fill('subj-0011');
  await page.getByRole('button', { name: 'Start erasure' }).click();
  const row = table.getByRole('row', { name: /ER-S01/ });
  await expect(row).toContainText('subj-0011');
  await expect(row).toContainText('Started in this session');
  await expect(row).toContainText('7 Oct 2026');
  await expect(row).toContainText('due in 5 working days');
  await expect(row).toContainText('Open');

  await page.getByRole('button', { name: 'Confirm and destroy key' }).click();
  await page.getByRole('button', { name: 'Count remaining records' }).click();
  await page.getByRole('button', { name: 'Record attestation' }).click();
  await expect(row).toContainText('Completed');
  await expect(row).toContainText('Stopped');
  await expect(row).not.toContainText('working day');

  expect(errors).toEqual([]);
});

test('an MCP session opens with its tool calls and the call that ended it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/integrations/int-mcp');
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
  await expect(page.getByText('3 of 3 sessions')).toBeVisible();

  await page.getByRole('button', { name: 'MCP-S-302' }).click();
  await expect(page).toHaveURL(/open=MCP-S-302/);
  const drawer = page.getByRole('dialog', { name: 'Session MCP-S-302' });
  const calls = drawer.getByRole('table', { name: 'Tool calls of MCP-S-302' });
  await expect(calls.locator('tbody tr')).toHaveCount(4);
  const blocked = calls.getByRole('row').filter({ hasText: 'NAG-D002' });
  await expect(blocked).toContainText('payments.refund');
  await expect(blocked).toContainText('Blocked fail-closed');
  await expect(blocked).toContainText('35');
  await expect(drawer).toContainText('terminated');

  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();
  expect(errors).toEqual([]);
});

test('posture links to onboarding, which marks the tenant level and scenario', async ({ page }) => {
  const errors = collectErrors(page);
  const { label, level, scenario } = deployment();
  await page.goto('/');
  await page.getByRole('link', { name: label }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Onboarding' })).toBeVisible();

  await expect(page.getByRole('figure', { name: /Before/ })).toContainText(
    'models.provider.example/v1',
  );
  await expect(page.getByRole('figure', { name: /After/ })).toContainText('gateway.nag.example/v1');

  const current = page.locator('tr[aria-current="true"]');
  await expect(current).toHaveCount(2);
  await expect(current.nth(0)).toContainText(level.name);
  await expect(current.nth(0)).toContainText('Your tenant');
  await expect(current.nth(1)).toContainText(scenario.id);
  await expect(page.getByText('NAG never signs it')).toBeVisible();
  await expect(page.getByText(/illustrative/i)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('the classifier, ledger operations and package checklist cards show their figures', async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto('/quarantine');
  await page.getByText('How it works').click();
  await expect(page.getByRole('heading', { name: 'Classifier' })).toBeVisible();
  await expect(page.getByText('0.60 to < 0.85')).toBeVisible();
  await page.getByRole('button', { name: 'Open Q-1044' }).click();
  await expect(page.getByRole('dialog', { name: 'Quarantine item Q-1044' })).toContainText(
    '0.77 ≥ 0.60 (medium)',
  );

  await page.goto('/evidence');
  await expect(page.getByText('Failed: 1 range (seq 101–150)')).toBeVisible();
  await expect(page.getByText('L1: gap detected at seq 137')).toBeVisible();
  await expect(
    page.getByText(/Timestamp authority A \(stub\) → Timestamp authority B/),
  ).toBeVisible();
  await expect(page.getByTestId('code-NAG-E003')).toContainText('NAG unreachable bypass');

  await page.goto('/packages');
  for (const g of packageElements()) {
    await expect(page.getByText(`${g.complete} of ${g.total} complete`)).toBeVisible();
  }
  await expect(page.getByTestId('package-deployment')).toContainText(deployment().label);
  await expect(page.getByRole('radio', { name: /Self-assessment/ })).toBeChecked();

  expect(errors).toEqual([]);
});
