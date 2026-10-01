// Flows for the two views outside the console: the read-only auditor view and the public trust page.

import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test.describe('auditor view', () => {
  test('is read-only: no editable input and no mutating button', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/auditor/AUD-2026-01');
    await expect(
      page.getByRole('heading', { level: 1, name: 'ISO/IEC 42001 surveillance audit 2026' }),
    ).toBeVisible();
    await expect(page.getByText('Read-only auditor view')).toBeVisible();

    expect(await page.locator('input, textarea, select, [contenteditable="true"]').count()).toBe(0);
    await expect(
      page.getByRole('button', {
        name: /save|approve|reject|submit|delete|upload|edit|create|sign|accept|flag|add/i,
      }),
    ).toHaveCount(0);

    const counts = page.getByRole('list', { name: 'Evidence requests by state' });
    for (const state of ['Not ready', 'Flagged', 'Ready', 'Accepted', 'Not applicable']) {
      await expect(counts.getByText(state, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('table')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('an unknown audit id shows "Audit not found"', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/auditor/AUD-0000-00');
    await expect(page.getByRole('heading', { level: 1, name: 'Audit not found' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('public trust page', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('fits 375 px, shows the age and confirms both forms locally', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/trust');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Trust page', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('updated 18 minutes ago')).toBeVisible();
    await expect(page.getByText('Powered by')).toBeVisible();

    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);

    const access = page.getByRole('form', { name: 'Request access' });
    await access.getByLabel('Your name').fill('Sam Reviewer');
    await access.getByLabel('Work email').fill('sam@example.com');
    await access.getByRole('button', { name: 'Request access' }).click();
    await expect(access.getByRole('status')).toContainText('Request noted for sam@example.com');

    const subscribe = page.getByRole('form', { name: 'Subscribe' });
    await subscribe.getByLabel('Work email').fill('sam@example.com');
    await subscribe.getByRole('button', { name: 'Subscribe' }).click();
    await expect(subscribe.getByRole('status')).toContainText(
      'Subscription noted for sam@example.com',
    );

    expect(errors).toEqual([]);
  });
});
