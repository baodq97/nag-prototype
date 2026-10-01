// Flows added for demo readiness: what an erasure says about the gap in the evidence, the
// trust claims that are under remediation, and the fallback choice on the runtime health screen.

import { expect, test, type Page } from '@playwright/test';
import { ERASURE_SUBJECTS } from '../src/data';
import { FALLBACK_EFFECT } from '../src/domain/health';
import { collectErrors, expectNoSeriousA11y } from './helpers';

const ALL_VERIFY = 'all 3 layers still verify';

/** Runs the erasure flow for one subject up to the attestation. */
async function eraseSubject(page: Page, subject: string) {
  await page.getByLabel('Subject ID').fill(subject);
  await page.getByRole('button', { name: 'Start erasure' }).click();
  await page.getByRole('button', { name: 'Confirm and destroy key' }).click();
  await page.getByRole('button', { name: 'Count remaining records' }).click();
}

test('erasing a subject next to the gap reports the failure as already there', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy and erasure' })).toBeVisible();

  await eraseSubject(page, ERASURE_SUBJECTS.withGap);
  const countable = page.getByTestId('countable');
  await expect(countable).toContainText('101–150');
  await expect(countable).toContainText('seq 137');
  await expect(countable).toContainText('already there before the erasure');
  await expect(countable).not.toContainText(ALL_VERIFY);
  await expect(countable).toHaveAttribute('data-verify', 'failing');

  await page.getByRole('button', { name: 'Record attestation' }).click();
  const attestation = page
    .getByRole('list', { name: 'Erasure attestations' })
    .getByRole('listitem')
    .filter({ hasText: ERASURE_SUBJECTS.withGap });
  await expect(attestation).toContainText('seq 137');
  await expect(attestation).toContainText('already there before the erasure');
  await expect(attestation).not.toContainText(ALL_VERIFY);

  expect(errors).toEqual([]);
});

test('erasing a subject whose ranges all verify says so', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/privacy');

  await eraseSubject(page, ERASURE_SUBJECTS.clean);
  const countable = page.getByTestId('countable');
  await expect(countable).toContainText(ALL_VERIFY);
  await expect(countable).toHaveAttribute('data-verify', 'ok');
  await expect(countable).not.toContainText('already there before the erasure');

  await page.getByRole('button', { name: 'Record attestation' }).click();
  const attestation = page
    .getByRole('list', { name: 'Erasure attestations' })
    .getByRole('listitem')
    .filter({ hasText: ERASURE_SUBJECTS.clean });
  await expect(attestation).toContainText(ALL_VERIFY);

  expect(errors).toEqual([]);
});

test('the trust page shows the failing claims as under remediation', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/trust');
  await expect(page.getByRole('heading', { level: 1, name: 'Trust page' })).toBeVisible();

  for (const name of [
    'Human review of uncertain output',
    'Prompt-injection screening',
    'Tamper-evident records with three integrity layers',
    'AI policy approved by leadership',
    'MCP server allow-list',
    'Independent timestamp anchoring',
    'Emergency stop with dual approval to resume',
  ]) {
    const item = page.getByRole('listitem').filter({ hasText: name });
    await expect(item, name).toContainText('Under remediation');
  }
  // A claim backed by passing checks keeps its own status.
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Agent call depth limit' }),
  ).not.toContainText('Under remediation');

  expect(errors).toEqual([]);
});

test('documents and policies past their date show the same state in table and search', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/policies');
  await expect(page.getByRole('row', { name: /^AI policy/ })).toContainText('Expired');

  await page.goto('/documents');
  for (const name of ['Model card', 'Kill switch runbook', 'Serious incident playbook']) {
    await expect(page.getByRole('row', { name: new RegExp(`^${name}`) }), name).toContainText(
      'Review overdue',
    );
  }

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command search' });
  await dialog.getByRole('combobox', { name: 'Search' }).fill('kill switch runbook');
  await expect(dialog.getByRole('option').first()).toContainText('Review overdue');

  expect(errors).toEqual([]);
});

const MODE = 'Behaviour when NAG is unreachable';
const DIALOG = 'Change behaviour when NAG is unreachable';

test('bypass needs a confirmation that says it creates no evidence', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/runtime-health');
  await expect(page.getByRole('heading', { level: 1, name: 'Runtime health' })).toBeVisible();

  const group = page.getByRole('group', { name: MODE });
  const current = page.getByTestId('fallback-mode');
  await expect(current).toContainText('Hard stop');

  // Cancel keeps the old value.
  await group.getByRole('radio', { name: /^Bypass/ }).click();
  const dialog = page.getByRole('dialog', { name: DIALOG });
  await expect(dialog).toContainText(FALLBACK_EFFECT.bypass);
  await expect(dialog).toContainText('no evidence records');
  await expect(dialog).toContainText('gap in the evidence log');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(current).toContainText('Hard stop');
  await expect(group.getByRole('radio', { name: /^Hard stop/ })).toBeChecked();

  // Confirm changes it, for this session only.
  await group.getByRole('radio', { name: /^Bypass/ }).click();
  await expect(dialog).toContainText('for this session only');
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog).toBeHidden();
  await expect(current).toContainText('Bypass');
  await expect(group.getByRole('radio', { name: /^Bypass/ })).toBeChecked();

  // The seeded choice is back after a reload.
  await page.reload();
  await expect(page.getByTestId('fallback-mode')).toContainText('Hard stop');

  expect(errors).toEqual([]);
});

test('the bypass confirmation passes the accessibility scan', async ({ page }) => {
  await page.goto('/runtime-health');
  await page
    .getByRole('group', { name: MODE })
    .getByRole('radio', { name: /^Bypass/ })
    .click();
  await expect(page.getByRole('dialog', { name: DIALOG })).toBeVisible();

  await expectNoSeriousA11y(page);
});
