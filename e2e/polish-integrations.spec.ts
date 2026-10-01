// Integration type labels come from one map: acronyms keep their casing on the list, in the
// "Type" filter and on the detail screen.

import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('/integrations shows "MCP inspector" and never "Mcp"', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/integrations');
  await expect(page.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible();

  // The Type cell of the MCP inspector row, and the Type filter option.
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: 'MCP inspector' }) });
  await expect(row.getByRole('cell', { name: 'MCP inspector', exact: true })).toHaveCount(2);
  await expect(page.getByLabel('Type').getByRole('option', { name: 'MCP inspector' })).toHaveCount(
    1,
  );

  // Case-sensitive, over the text of the whole page, including the filter options.
  const text = await page.locator('body').evaluate((el) => el.textContent ?? '');
  expect(text).not.toContain('Mcp');

  // The filter finds the source by its label.
  await page.getByRole('searchbox', { name: 'Filter integrations' }).fill('MCP inspector');
  await expect(page.getByRole('link', { name: 'MCP inspector' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('the integration detail screen shows the type label', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/integrations/int-mcp');
  await expect(page.getByRole('heading', { level: 1, name: 'MCP inspector' })).toBeVisible();
  await expect(page.getByText('Type: MCP inspector')).toBeVisible();
  const text = await page.locator('body').evaluate((el) => el.textContent ?? '');
  expect(text).not.toContain('Mcp');

  await page.goto('/integrations/int-proxy');
  await expect(page.getByText('Type: Reverse proxy')).toBeVisible();
  expect(errors).toEqual([]);
});
