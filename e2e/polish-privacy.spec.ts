// Demo polish for the privacy screen: each content logging toggle keeps its accessible name,
// and the endpoint name shows once per row as visible text (the row heading).

import { expect, test } from '@playwright/test';
import { privacyEndpoints } from '../src/data';
import { collectErrors } from './helpers';

test('every content logging toggle keeps its name and the endpoint shows once per row', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy and erasure' })).toBeVisible();
  expect(privacyEndpoints.length).toBeGreaterThan(0);

  for (const ep of privacyEndpoints) {
    const toggle = page.getByRole('switch', {
      name: `Content logging for ${ep.name}`,
      exact: true,
    });
    await expect(toggle, ep.name).toHaveCount(1);

    const row = page.getByRole('listitem').filter({ has: toggle });
    await expect(row, ep.name).toHaveCount(1);

    // Count text nodes with the name that are not inside a visually hidden element.
    const visible = await row.evaluate((el, name) => {
      const hidden = (node: Element | null): boolean => {
        for (let n = node; n && n !== el.parentElement; n = n.parentElement) {
          const s = getComputedStyle(n);
          const clipped = s.clip !== 'auto' || s.clipPath !== 'none';
          const tiny = parseFloat(s.width) <= 1 && parseFloat(s.height) <= 1;
          if (s.display === 'none' || s.visibility === 'hidden' || clipped || tiny) return true;
        }
        return false;
      };
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let count = 0;
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if ((t.textContent ?? '').includes(name) && !hidden(t.parentElement)) count += 1;
      }
      return count;
    }, ep.name);
    expect(visible, `${ep.name} as visible text in its row`).toBe(1);

    // The one visible occurrence is the row heading.
    await expect(row.locator('p', { hasText: ep.name }), ep.name).toHaveCount(1);
  }

  expect(errors).toEqual([]);
});

test('a content logging toggle still switches by its accessible name', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/privacy');

  const [ep] = privacyEndpoints;
  if (!ep) throw new Error('no seeded privacy endpoints');
  const toggle = page.getByRole('switch', { name: `Content logging for ${ep.name}`, exact: true });
  const before = await toggle.getAttribute('aria-checked');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');

  expect(errors).toEqual([]);
});
