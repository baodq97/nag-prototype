// Lineage polish at 1280×800: the call table shows labels instead of ids, the trace picker is wide
// enough for the selected trace's full name, and the whole call graph of each deep trace fits its
// card with readable labels.

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

for (const traceId of ['TR-91c2', 'TR-b604']) {
  const trace = traces.find((t) => t.id === traceId)!;

  test(`the whole call graph of "${trace.name}" fits its card, readable`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/lineage');
    await page.getByLabel('Trace').selectOption(traceId);

    const graph = page.getByTestId('call-graph');
    const card = page.locator('section', { has: graph });
    const calls = traceNodes(traceId);
    const nodes = graph.getByTestId('call-node');
    await expect(nodes).toHaveCount(calls.length);

    const overflow = await graph.evaluate((el) => el.scrollWidth - el.clientWidth);
    const cardOverflow = await card.evaluate((el) => el.scrollWidth - el.clientWidth);
    console.log(`${trace.name}: graph overflow ${overflow} px, card overflow ${cardOverflow} px`);
    expect(overflow, 'graph horizontal overflow').toBeLessThanOrEqual(0);
    expect(cardOverflow, 'card horizontal overflow').toBeLessThanOrEqual(0);

    // Every node lies inside the card, not just the rejected one.
    const cardBox = (await card.boundingBox())!;
    for (let i = 0; i < calls.length; i++) {
      const box = (await nodes.nth(i).boundingBox())!;
      expect(box.x, `node ${i} left edge`).toBeGreaterThanOrEqual(cardBox.x);
      expect(box.x + box.width, `node ${i} right edge`).toBeLessThanOrEqual(
        cardBox.x + cardBox.width,
      );
      expect(box.y, `node ${i} top edge`).toBeGreaterThanOrEqual(cardBox.y);
      expect(box.y + box.height, `node ${i} bottom edge`).toBeLessThanOrEqual(
        cardBox.y + cardBox.height,
      );
    }

    // Labels keep a readable size, and each node still names its kind and outcome.
    const sizes = await graph
      .locator('[data-testid="call-node"] div')
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    expect(Math.min(...sizes), 'smallest node font size').toBeGreaterThanOrEqual(12);
    for (const [i, call] of calls.entries()) {
      const text = await nodes.nth(i).innerText();
      expect(text, call.label).toContain(call.label);
      expect(text, call.label).toMatch(/Agent|Model call|MCP tool call|Rejected call/);
      expect(text, call.label).toMatch(/Success|Error|Cancelled|Abandoned/);
    }

    // Depth is a fixed indent of at most 32 px per level.
    const lefts = await nodes.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().left),
    );
    const items = await graph
      .locator('li[data-depth]')
      .evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.depth)));
    const base = Math.min(...lefts);
    for (const [i, left] of lefts.entries()) {
      expect(left - base, `node ${i} indent`).toBeLessThanOrEqual((items[i]! - 1) * 32);
    }

    if (traceId === 'TR-b604') {
      const rejected = graph.getByTestId('call-node').filter({ hasText: 'Rejected call' });
      await expect(rejected).toHaveCount(1);
      await expect(page.getByRole('row', { name: /Rejected call/ })).toContainText('Not run');
    }
    expect(errors).toEqual([]);
  });
}

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
