// Interactive flows of the governance screens: the risk register (R9.2), QMS approval order
// (R8.3), the assistant (R9.1) and the conformity package (R8.2).

import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

const leadingNumber = (text: string | null) => Number(/\d+/.exec(text ?? '')?.[0]);

test('risk register: filter, sort by residual score, open a risk', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/risks');
  await expect(page.getByRole('heading', { level: 1, name: 'Risk register' })).toBeVisible();

  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  const total = await rows.count();
  expect(total).toBeGreaterThanOrEqual(10);

  await page.getByLabel('Status').selectOption('open');
  await expect.poll(async () => rows.count()).toBeLessThan(total);
  expect(await rows.count()).toBeGreaterThan(0);

  const residualHeader = page.getByRole('columnheader', { name: 'Residual' });
  await residualHeader.getByRole('button').click();
  await residualHeader.getByRole('button').click();
  await expect(residualHeader).toHaveAttribute('aria-sort', 'descending');

  // Residual must not exceed inherent on any visible row, and the sort must hold.
  const count = await rows.count();
  let previous = Infinity;
  for (let i = 0; i < count; i++) {
    const cells = rows.nth(i).getByRole('cell');
    const inherent = leadingNumber(await cells.nth(1).textContent());
    const residual = leadingNumber(await cells.nth(3).textContent());
    expect(residual).toBeLessThanOrEqual(inherent);
    expect(residual).toBeLessThanOrEqual(previous);
    previous = residual;
  }

  const first = rows.first();
  const firstInherent = leadingNumber(await first.getByRole('cell').nth(1).textContent());
  const firstResidual = leadingNumber(await first.getByRole('cell').nth(3).textContent());
  await first.getByRole('button').first().click();

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Inherent score')).toBeVisible();
  await expect(drawer.getByText('Residual score')).toBeVisible();
  await expect(drawer.getByTestId('inherent-score')).toHaveText(String(firstInherent));
  await expect(drawer.getByTestId('residual-score')).toHaveText(String(firstResidual));
  await expect(drawer.getByRole('heading', { name: 'Linked controls' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('QMS library: approvals go in order', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/qms');
  await expect(page.getByRole('heading', { level: 1, name: 'QMS library' })).toBeVisible();
  await expect(page.getByRole('row').filter({ has: page.getByRole('cell') })).toHaveCount(13);

  // The data procedure has only its drafter step approved.
  await page.getByRole('button', { name: 'Data quality procedure' }).click();
  const drawer = page.getByRole('dialog');
  const lead = drawer.getByRole('button', { name: 'Approve Compliance Lead' });
  const ceo = drawer.getByRole('button', { name: 'Approve CEO' });

  await expect(lead).toBeEnabled();
  await expect(ceo).toBeDisabled();
  await expect(drawer.getByText('Compliance Lead must approve first')).toBeVisible();

  await lead.click();
  await expect(ceo).toBeEnabled();
  await expect(drawer.getByText('2 of 3 approved')).toBeVisible();

  expect(errors).toEqual([]);
});

test('assistant: answers from demo data and falls back for anything else', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { level: 1, name: 'Assistant' })).toBeVisible();

  await page
    .getByRole('button', { name: 'Which controls are failing for Art. 14 and why?' })
    .click();
  const answers = page.getByTestId('assistant-answer');
  await expect(answers).toHaveCount(1);
  await expect(answers.first()).toContainText('CTL-10');
  await expect(answers.first().getByRole('link', { name: 'CTL-10' })).toBeVisible();

  await page.getByLabel('Your question').fill('What is the weather in Berlin?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(answers).toHaveCount(2);
  await expect(answers.nth(1)).toContainText('I can only answer from demo data');

  expect(errors).toEqual([]);
});

test('packages: the unsigned watermark is visible and nothing signs the declaration', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/packages');
  await expect(page.getByRole('heading', { level: 1, name: 'Conformity packages' })).toBeVisible();
  await expect(page.getByTestId('doc-watermark')).toHaveText(
    'Unsigned draft – requires the provider’s signature',
  );
  await expect(page.getByTestId('doc-watermark')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign/i })).toHaveCount(0);

  await page.getByRole('radio', { name: /Notified body/ }).check();
  await expect(page.getByText('Application to a notified body')).toBeVisible();

  await page.getByRole('button', { name: 'Export' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Target: 1,000 records in under 60 s')).toBeVisible();
  await expect(modal.getByText(/No file is produced/)).toBeVisible();

  expect(errors).toEqual([]);
});
