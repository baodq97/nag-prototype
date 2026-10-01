// Interactive flows of the runtime oversight screens: evidence verification, quarantine
// decisions and the kill switch.

import { expect, test } from '@playwright/test';
import { evidence } from '../src/data';
import { collectErrors } from './helpers';

test('verify shows the gap at seq 137 and the other ranges as verified', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/evidence');
  await expect(page.getByRole('heading', { level: 1, name: 'Evidence' })).toBeVisible();

  await page.getByRole('button', { name: 'Verify' }).click();

  const gap = page.getByTestId('range-101');
  await expect(gap).toContainText('101–150');
  await expect(gap).toContainText('gap detected at seq 137');
  for (const from of [1, 51, 151, 201]) {
    await expect(page.getByTestId(`range-${from}`)).toContainText('Verified');
    await expect(page.getByTestId(`range-${from}`)).not.toContainText('gap detected');
  }

  // A record opens with the three integrity layers.
  await page.getByRole('button', { name: 'Open record 211' }).click();
  const drawer = page.getByRole('dialog', { name: 'Record 211' });
  await expect(drawer).toContainText('L1');
  await expect(drawer).toContainText('L2');
  await expect(drawer).toContainText('L3');
  await expect(drawer.getByTestId('stub-label')).toBeVisible();

  expect(errors).toEqual([]);
});

test('a quarantine decision needs a justification of 20 characters or more', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/quarantine');
  await expect(page.getByRole('heading', { level: 1, name: 'Quarantine queue' })).toBeVisible();

  // An expired item shows the tenant's terminal decision as an explicit event.
  await expect(
    page.getByText('Expired after 24 business hours – rejected by tenant policy').first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Open Q-1041' }).click();
  const drawer = page.getByRole('dialog', { name: 'Quarantine item Q-1041' });
  const approve = drawer.getByRole('button', { name: 'Approve' });
  const reject = drawer.getByRole('button', { name: 'Reject' });

  await drawer.getByLabel('Justification').fill('too short');
  await expect(drawer.getByText('9/20 characters – 11 more needed')).toBeVisible();
  await expect(approve).toBeDisabled();
  await expect(reject).toBeDisabled();

  await drawer.getByLabel('Justification').fill('Reviewed the answer, no personal data present.');
  await expect(approve).toBeEnabled();
  await expect(reject).toBeEnabled();
  await approve.click();

  await expect(drawer.getByTestId('decision')).toContainText('Decision: Approved');
  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('row', { name: /Q-1041/ })).toContainText('Approved');

  expect(errors).toEqual([]);
});

test('the kill switch activates with any 6-digit code and resumes with two distinct roles', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/kill-switch');
  await expect(page.getByRole('heading', { level: 1, name: 'Kill switch' })).toBeVisible();
  const state = page.getByTestId('kill-state');
  await expect(state).toHaveText('Normal – AI requests are served');

  await page.getByRole('button', { name: 'Activate kill switch' }).click();
  const modal = page.getByRole('dialog', { name: 'Activate kill switch' });
  await expect(modal.getByTestId('stub-label')).toBeVisible();
  await modal.getByLabel('MFA code').fill('123456');
  await modal.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(state).toHaveText('Active – AI requests receive 503');

  const role = page.getByLabel('Approving role');
  const approve = page.getByRole('button', { name: 'Approve resume' });
  await role.selectOption('Compliance Lead');
  await approve.click();
  await approve.click();
  await expect(page.getByRole('alert')).toContainText('has already approved');
  await expect(state).toHaveText('Active – AI requests receive 503');

  await role.selectOption('CEO');
  await approve.click();
  await expect(state).toHaveText('Normal – AI requests are served');

  const timeline = page.getByRole('list', { name: 'Kill switch timeline' });
  await expect(timeline.getByRole('listitem')).toHaveCount(5);
  await expect(timeline).toContainText('Kill switch activated');
  await expect(timeline).toContainText('Resume approved by Compliance Lead');
  await expect(timeline).toContainText(
    'Resume approval refused: Compliance Lead has already approved',
  );
  await expect(timeline).toContainText('Resume approved by CEO');
  await expect(timeline).toContainText('Kill switch resumed');

  expect(errors).toEqual([]);
});

test('erasure refuses an unknown subject and walks every stage for a known one', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const subject = evidence[0]!.subjectId;
  const count = evidence.filter((r) => r.subjectId === subject).length;
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy and erasure' })).toBeVisible();

  const field = page.getByLabel('Subject ID');
  const start = page.getByRole('button', { name: 'Start erasure' });
  await field.fill('subj-9999');
  await start.click();
  await expect(page.getByText('No evidence record has the subject ID subj-9999')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Erasure stages' })).toBeHidden();

  await field.fill(subject);
  await start.click();
  await page.getByRole('button', { name: 'Confirm and destroy key' }).click();
  await expect(page.getByText('2. Key destroyed (done)')).toBeAttached();
  await expect(page.getByTestId('countable')).toBeHidden();

  await page.getByRole('button', { name: 'Count remaining records' }).click();
  await expect(page.getByTestId('countable')).toContainText(`${count} record`);
  await page.getByRole('button', { name: 'Record attestation' }).click();
  await expect(page.getByRole('list', { name: 'Erasure attestations' })).toContainText(subject);

  expect(errors).toEqual([]);
});
