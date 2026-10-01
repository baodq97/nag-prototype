// R14: the top-bar search trigger keeps its placeholder text and its "Ctrl K" hint on one line,
// with the full text visible, at 1280x800 and at 1024x800.

import { expect, test, type Locator } from '@playwright/test';
import { collectErrors } from './helpers';

const viewports = [
  { width: 1280, height: 800 },
  { width: 1024, height: 800 },
];

/** Box height, computed line height and overflow of one element. */
function measure(el: Locator) {
  return el.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      height: node.getBoundingClientRect().height,
      lineHeight: parseFloat(style.lineHeight),
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    };
  });
}

for (const viewport of viewports) {
  test(`top-bar search trigger stays on one line at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const trigger = page.getByRole('button', { name: /Search tests, controls, documents/ });
    await expect(trigger).toBeVisible();
    const placeholder = trigger.getByText('Search tests, controls, documents…', { exact: true });
    const hint = trigger.locator('kbd');
    await expect(hint).toHaveText('Ctrl K');

    for (const [name, el] of [
      ['placeholder', placeholder],
      ['hint', hint],
    ] as const) {
      const m = await measure(el);
      testInfo.annotations.push({
        type: `${name} @${viewport.width}`,
        description: `height ${m.height}, line-height ${m.lineHeight}`,
      });
      expect(Number.isFinite(m.lineHeight), `${name} has a numeric line-height`).toBe(true);
      expect(m.height, `${name} is one line`).toBeLessThanOrEqual(m.lineHeight + 1);
      expect(m.scrollWidth, `${name} shows its full text`).toBeLessThanOrEqual(m.clientWidth);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal scroll at ${viewport.width} px`).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}
