// In every table of the console, an object ID ("MCP-S-301", "Q-1044", "TST-019") renders on one
// line at 1280x800: the ID's own text box is at most 1.5 line-heights tall and never breaks at
// one of its hyphens.

import { expect, test } from '@playwright/test';
import { routes } from '../src/routes';

// The route samples, plus the inspector, whose Sessions card holds the MCP sessions table.
const paths = [...new Set([...routes.map((r) => r.sample), '/integrations/int-mcp'])];

for (const path of paths) {
  test(`IDs in the tables of ${path} stay on one line`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const result = await page.evaluate(() => {
      const ID = /\b[A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+)+\b/g;
      const wrapped: string[] = [];
      for (const table of document.querySelectorAll('table')) {
        const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const parent = n.parentElement!;
          if (parent.closest('.sr-only')) continue;
          const style = getComputedStyle(parent);
          const lineHeight =
            style.lineHeight === 'normal'
              ? parseFloat(style.fontSize) * 1.2
              : parseFloat(style.lineHeight);
          for (const m of (n.textContent ?? '').matchAll(ID)) {
            const range = document.createRange();
            range.setStart(n, m.index);
            range.setEnd(n, m.index + m[0].length);
            const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
            const height = range.getBoundingClientRect().height;
            if (tops.size > 1 || height > 1.5 * lineHeight) wrapped.push(m[0]);
          }
        }
      }
      return wrapped;
    });

    expect(result, `IDs that wrap on ${path}`).toEqual([]);
  });
}

test('the MCP sessions table shows MCP-S-301 on one line', async ({ page }) => {
  await page.goto('/integrations/int-mcp');
  const id = page.getByRole('button', { name: 'MCP-S-301', exact: true });
  await expect(id).toBeVisible();
  const { height, lineHeight } = await id.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(height).toBeLessThanOrEqual(1.5 * lineHeight);
});
