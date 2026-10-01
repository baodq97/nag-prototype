// Conformity packages at 1280x800: the readiness line sits above the fold, one descriptive line
// under the heading, neutral and distinct source chips, and missing items link to where they live.

import { expect, test } from '@playwright/test';
import { packageElements, packageReadiness, packageSections } from '../src/data';
import { collectErrors } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

test('readiness line, header and chips on Conformity packages', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/packages');
  await expect(page.getByRole('heading', { level: 1, name: 'Conformity packages' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('packages-1280x800.png') });

  // The readiness line is visible without scrolling and its numbers add up.
  const line = page.getByTestId('package-readiness');
  await expect(line).toBeVisible();
  const box = (await line.boundingBox())!;
  expect(box.y + box.height).toBeLessThan(800);
  const text = (await line.textContent())!;
  const m = /^(\d+) of (\d+) items complete, (\d+) missing, (\d+) of them yours$/.exec(text.trim());
  expect(m).not.toBeNull();
  const [c, t, miss, yours] = m!.slice(1).map(Number) as [number, number, number, number];
  expect(c + miss).toBe(t);
  expect(yours).toBeLessThanOrEqual(miss);
  expect({ total: t, complete: c, missing: miss, missingYours: yours }).toEqual(packageReadiness());
  const depBox = (await page.getByTestId('package-deployment').boundingBox())!;
  expect(box.y).toBeLessThan(depBox.y);

  // Exactly one descriptive line under the h1.
  await expect(page.getByTestId('page-purpose')).toHaveCount(1);
  await expect(page.locator('header > div > p')).toHaveCount(1);

  // Source chips: neutral, 3 distinct looks, none equal to a state chip's look.
  const look = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          cls: el.className,
          look: [s.backgroundColor, s.color, s.borderTopColor, s.borderTopStyle, s.boxShadow].join(
            '|',
          ),
          svg: el.querySelector('svg')?.getAttribute('class') ?? '',
          icon: el.querySelector('svg')?.innerHTML ?? '',
        };
      });
  const sources = await Promise.all(
    ['runtime', 'customer', 'template'].map((s) => look(`[data-source="${s}"]`)),
  );
  const states = await Promise.all(['success', 'warning'].map((v) => look(`[data-chip="${v}"]`)));
  for (const s of sources) {
    expect(s.cls).not.toMatch(/amber|red-|yellow|orange|rose|emerald/);
  }
  expect(new Set(sources.map((s) => s.look)).size).toBe(3);
  expect(new Set(sources.map((s) => s.icon)).size).toBe(3);
  for (const s of sources) {
    for (const st of states) {
      expect(s.look).not.toBe(st.look);
      expect(s.icon).not.toBe(st.icon);
    }
  }
  // No source chip carries a state variant.
  await expect(page.locator('[data-source][data-chip]')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('checklist item names take at most 2 lines, chips sit under the name', async ({ page }) => {
  await page.goto('/packages');
  const names = page.locator(
    '[aria-label="Package checklist"] :is([data-testid="checklist-name"], [data-testid="missing-item"])',
  );
  const count = packageElements().reduce((n, g) => n + g.elements.length, 0);
  await expect(names).toHaveCount(count);
  for (let i = 0; i < count; i++) {
    const m = await names.nth(i).evaluate((el) => {
      const li = el.closest('li')!;
      const chip = li.querySelector('[data-source]')!;
      // An inline element's own box spans its lines, so measure the rendered line boxes.
      const rects = Array.from(el.getClientRects());
      const lines = new Set(rects.map((r) => Math.round(r.top))).size;
      return {
        lines,
        text: el.textContent,
        nameBottom: Math.max(...rects.map((r) => r.bottom)),
        chipTop: chip.getBoundingClientRect().top,
        nameWidth: el.getBoundingClientRect().width,
        liWidth: li.getBoundingClientRect().width,
      };
    });
    expect(m.lines, m.text ?? '').toBeLessThanOrEqual(2);
    expect(m.chipTop, m.text ?? '').toBeGreaterThanOrEqual(m.nameBottom - 1);
  }
});

test('sections are numbered S-01..S-N without gaps on each route and the export agrees', async ({
  page,
}) => {
  await page.goto('/packages');
  const counts: Record<string, number> = {};
  for (const route of [/Self-assessment/, /Notified body/]) {
    await page.getByRole('radio', { name: route }).check();
    const list = page.getByRole('region', { name: 'Sections' });
    const onScreen = (await list.getByTestId('section-number').allTextContents()).map((t) =>
      t.trim(),
    );
    expect(onScreen.length).toBeGreaterThan(0);
    expect(onScreen).toEqual(onScreen.map((_, i) => `S-${String(i + 1).padStart(2, '0')}`));
    counts[String(route)] = onScreen.length;
    const titles = (await list.locator('li > div > p:first-child').allTextContents()).map((t) =>
      t.trim(),
    );

    await page.getByRole('button', { name: 'Export' }).click();
    const modal = page.getByRole('dialog');
    const exported = (await modal.getByTestId('export-section').allTextContents()).map((t) =>
      t.trim(),
    );
    expect(exported).toEqual(titles);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  }
  expect(counts).toEqual({
    [String(/Self-assessment/)]: packageSections.filter((s) => s.routes.includes('self-assessment'))
      .length,
    [String(/Notified body/)]: packageSections.filter((s) => s.routes.includes('notified-body'))
      .length,
  });
});

test('each missing item links to a page that shows it', async ({ page }) => {
  await page.goto('/packages');
  const missing = packageElements().flatMap((g) => g.elements.filter((e) => e.state === 'missing'));
  expect(missing.length).toBe(packageReadiness().missing);
  await expect(page.getByTestId('missing-item')).toHaveCount(missing.length);

  for (const e of missing) {
    expect(e.href).toBeTruthy();
    await page.goto('/packages');
    const link = page.getByRole('link', { name: e.title, exact: true });
    await expect(link).toHaveAttribute('href', e.href!);
    await link.click();
    const [path, query] = e.href!.split('?');
    await expect(page).toHaveURL(new RegExp(`${path}\\?`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const id = new URLSearchParams(query).get('open');
    if (id) await expect(page.getByText(id, { exact: false }).first()).toBeVisible();
  }
});
