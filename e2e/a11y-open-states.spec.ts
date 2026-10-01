// Accessibility scan of the console with a drawer or dialog open: the object drawers, the
// quarantine item, the kill switch dialog, the command search, the erasure confirmation and the
// fallback mode confirmation in both directions. Each scan covers the whole page.

import { expect, test } from '@playwright/test';
import {
  ERASURE_SUBJECTS,
  controls,
  documents,
  policies,
  quarantine,
  risks,
  tests,
} from '../src/data';
import { collectErrors, expectNoSeriousA11y } from './helpers';

// Tests open on their own page; the drawer there is the remediation drawer.
test('the test drawer passes the accessibility scan', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`/tests/${tests[0]!.id}`);
  await page.getByRole('button', { name: 'Remediate' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});

const drawers = [
  { kind: 'control', path: '/controls', id: controls[0]!.id },
  { kind: 'document', path: '/documents', id: documents[0]!.id },
  { kind: 'policy', path: '/policies', id: policies[0]!.id },
  { kind: 'risk', path: '/risks', id: risks[0]!.id },
];

for (const d of drawers) {
  test(`the ${d.kind} drawer passes the accessibility scan`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${d.path}?open=${d.id}`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoSeriousA11y(page);
    expect(errors).toEqual([]);
  });
}

test('the quarantine item drawer passes the accessibility scan', async ({ page }) => {
  const errors = collectErrors(page);
  const item = quarantine[0]!;
  await page.goto('/quarantine');
  await page.getByRole('button', { name: `Open ${item.id}` }).click();
  await expect(page.getByRole('dialog', { name: `Quarantine item ${item.id}` })).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});

test('the kill switch dialog passes the accessibility scan', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/kill-switch');
  await page.getByRole('button', { name: 'Activate kill switch' }).click();
  await expect(page.getByRole('dialog', { name: 'Activate kill switch' })).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});

test('the command search passes the accessibility scan, empty and with results', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: 'Command search' });
  await expect(dialog).toBeVisible();
  await expectNoSeriousA11y(page);

  await dialog.getByRole('combobox', { name: 'Search' }).fill('oversight training');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});

test('the erasure confirmation passes the accessibility scan', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/privacy');
  await page.getByLabel('Subject ID').fill(ERASURE_SUBJECTS.withGap);
  await page.getByRole('button', { name: 'Start erasure' }).click();
  await expect(page.getByRole('button', { name: 'Confirm and destroy key' })).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});

// The Bypass direction is also scanned in flows-demo-readiness.spec.ts.
test('the fallback confirmation passes the accessibility scan in both directions', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/runtime-health');
  const group = page.getByRole('group', { name: 'Behaviour when NAG is unreachable' });
  const dialog = page.getByRole('dialog', { name: 'Change behaviour when NAG is unreachable' });

  await group.getByRole('radio', { name: /^Bypass/ }).click();
  await expect(dialog).toBeVisible();
  await expectNoSeriousA11y(page);
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog).toBeHidden();

  await group.getByRole('radio', { name: /^Hard stop/ }).click();
  await expect(dialog).toBeVisible();
  await expectNoSeriousA11y(page);
  expect(errors).toEqual([]);
});
