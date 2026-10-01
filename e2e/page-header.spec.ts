// Every console route opens with one line saying what it is for, and nothing else: the header
// holds exactly one paragraph, the route's purpose, it fits on one line at 1280x800, and no
// paragraph of supporting text sits between the header and the first content block. The auditor
// view and the trust page have their own layouts without the console header.

import { expect, test } from '@playwright/test';
import { routes } from '../src/routes';

for (const route of routes.filter((r) => r.layout === 'console')) {
  test(`${route.sample} has one purpose line and nothing else under its heading`, async ({
    page,
  }) => {
    await page.goto(route.sample);
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();

    const header = await page.evaluate(() => {
      const h = document.querySelector('h1')!.closest('header')!;
      const purpose = h.querySelector<HTMLElement>('[data-testid="page-purpose"]');
      const style = purpose ? getComputedStyle(purpose) : undefined;
      const lineHeight =
        style && style.lineHeight !== 'normal'
          ? parseFloat(style.lineHeight)
          : parseFloat(style?.fontSize ?? '0') * 1.2;
      const next = h.nextElementSibling;
      return {
        paragraphs: h.querySelectorAll('p').length,
        purposes: h.querySelectorAll('[data-testid="page-purpose"]').length,
        text: purpose?.textContent ?? '',
        height: purpose?.getBoundingClientRect().height ?? 0,
        lineHeight,
        // A block of bare text right after the header is a second description line.
        nextIsText:
          next !== null &&
          (next.tagName === 'P' || (next.children.length === 0 && !!next.textContent?.trim())),
      };
    });

    expect(header.purposes, 'purpose paragraphs').toBe(1);
    expect(header.paragraphs, 'paragraphs in the header').toBe(1);
    expect(header.text).toBe(route.purpose);
    expect(header.height, 'purpose height').toBeLessThanOrEqual(1.5 * header.lineHeight);
    expect(header.nextIsText, 'text right after the header').toBe(false);
  });
}
