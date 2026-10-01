// Keeps docs/demo-paths.md honest: every screen it names must be a route of the app, and
// each persona keeps a path of a walkable length.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

const doc = readFileSync(new URL('../docs/demo-paths.md', import.meta.url), 'utf8');

const PERSONAS = ['Compliance Officer', 'AI/ML Engineer', 'Platform and SRE owner'];

/** The text of each "## Heading" section, keyed by heading. */
function sections(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const parts = text.split(/^## /m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    found.set(part.slice(0, newline).trim(), part.slice(newline + 1));
  }
  return found;
}

const segments = (path: string) => path.split('/').filter(Boolean);

/** A route pattern such as /tests/:id matches a concrete path segment by segment. */
function matches(pattern: string, path: string): boolean {
  const want = segments(pattern);
  const got = segments(path);
  return (
    want.length === got.length && want.every((seg, i) => seg.startsWith(':') || seg === got[i])
  );
}

/** Every `/path` in backticks, without a query string or fragment. */
function routePaths(text: string): string[] {
  return [...text.matchAll(/`(\/[^`\s]*)`/g)].map((m) => m[1]!.split(/[?#]/)[0]!);
}

describe('docs/demo-paths.md', () => {
  it('names only screens that exist in the route table', () => {
    const named = routePaths(doc);
    expect(named.length).toBeGreaterThan(0);
    const unknown = [...new Set(named)].filter((p) => !routes.some((r) => matches(r.path, p)));
    expect(unknown).toEqual([]);
  });

  it('has one section per persona with 5 to 9 numbered steps', () => {
    const byHeading = sections(doc);
    for (const persona of PERSONAS) {
      const body = byHeading.get(persona);
      expect(body, persona).toBeDefined();
      const steps = [...body!.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
      expect(steps.length, persona).toBeGreaterThanOrEqual(5);
      expect(steps.length, persona).toBeLessThanOrEqual(9);
      expect(steps, persona).toEqual(steps.map((_, i) => i + 1));
    }
  });

  it('names a screen in every step', () => {
    for (const persona of PERSONAS) {
      const body = sections(doc).get(persona)!;
      const steps = body.split(/^(?=\d+\. )/m).filter((s) => /^\d+\. /.test(s));
      for (const step of steps) expect(routePaths(step).length, step).toBeGreaterThan(0);
    }
  });

  it('walks through onboarding and the cards that show the demo capabilities', () => {
    const byHeading = sections(doc);
    expect(routePaths(byHeading.get('Compliance Officer')!)).toContain('/onboarding');
    for (const text of [
      'Integration level: App context · Scenario S1',
      'Operations card',
      'Classifier card',
      'Sessions card',
      'Erasure requests table',
      'Codes card',
      'checklist cards',
    ]) {
      expect(doc.replace(/\s+/g, ' '), text).toContain(text);
    }
    expect(doc).not.toMatch(/event type/i);
  });

  it('has the matcher accept parameter routes and reject unknown ones', () => {
    expect(matches('/tests/:id', '/tests/TST-019')).toBe(true);
    expect(matches('/auditor/:auditId', '/auditor/AUD-2026-01')).toBe(true);
    expect(matches('/tests/:id', '/tests')).toBe(false);
    expect(matches('/trust', '/trust/extra')).toBe(false);
  });
});
