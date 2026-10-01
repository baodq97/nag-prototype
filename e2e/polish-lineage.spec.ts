// Lineage polish (R17): the call table shows labels instead of ids, and the trace picker is wide
// enough for the selected trace's full name at 1280×800.

import { expect, test } from '@playwright/test';
import { traceNodes, traces } from '../src/data';
import { collectErrors } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

test('the call table never shows a call id and marks each root once', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/lineage');
  await expect(page.getByRole('heading', { level: 1, name: 'Lineage' })).toBeVisible();

  const picker = page.getByLabel('Trace');
  const table = page.getByRole('table');
  for (const trace of traces) {
    await picker.selectOption(trace.id);
    await expect(picker.locator('option:checked')).toHaveText(trace.name);

    const calls = traceNodes(trace.id);
    const ids = new Set(calls.map((n) => n.id));
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(calls.length);

    const cells = (await table.locator('tbody th, tbody td').allInnerTexts()).map((t) => t.trim());
    expect(
      cells.filter((c) => ids.has(c)),
      `${trace.name}: cells that equal a call id`,
    ).toEqual([]);

    // The Parent column is the third data cell of each row, after Call, Depth and Kind.
    const parents = await rows.locator('td:nth-of-type(3)').allInnerTexts();
    const roots = calls.filter((n) => n.parentId === null).length;
    expect(parents.filter((p) => p.trim() === 'Root')).toHaveLength(roots);
    expect(roots, `${trace.name} has a root`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('the trace picker is wide enough for the selected trace name', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/lineage');
  const picker = page.getByLabel('Trace');
  await expect(picker).toBeVisible();

  for (const trace of traces) {
    await picker.selectOption(trace.id);
    const m = await picker.evaluate((el) => {
      const select = el as HTMLSelectElement;
      const cs = getComputedStyle(select);
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = cs.font;
      const text = select.selectedOptions[0]!.text;
      return {
        text,
        textWidth: ctx.measureText(text).width,
        // clientWidth excludes the border; the padding is still inside it.
        contentWidth: select.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      };
    });
    console.log(
      `${trace.name}: content ${m.contentWidth.toFixed(1)} px, text ${m.textWidth.toFixed(1)} px`,
    );
    expect(m.text).toBe(trace.name);
    expect(m.text).not.toContain(trace.id);
    expect(m.contentWidth, `${trace.name}: picker content width`).toBeGreaterThanOrEqual(
      m.textWidth,
    );
  }
  expect(errors).toEqual([]);
});
