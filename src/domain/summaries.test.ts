import { describe, expect, it } from 'vitest';
import { articleRows, postureSummary, verification } from '../data';
import { NOW, integrations, tenant } from '../seed/base';
import { controls, tests } from '../seed/catalogue';
import { MISSING_SEQ, evidence } from '../seed/runtime';
import { frameworkItems } from '../seed/base';
import { integrationUnlocks } from './integrations';
import {
  ARTICLE_GROUPS,
  coverageByGroup,
  coverageCounts,
  dependentTests,
  inTestTile,
  integrationTabCounts,
  integrationTabs,
  scopeGroups,
  signalCount,
  testCategory,
  testProblemRank,
  testStrip,
  verificationSummary,
} from './summaries';
import { verifyRanges } from './verification';
import type { ComplianceTest, RangeVerification } from './types';

const tz = tenant.timeZone;

describe('tests strip', () => {
  it('shows the same numbers as the posture page', () => {
    const strip = testStrip(tests, NOW, tz);
    const posture = postureSummary();
    expect(strip).toEqual({
      passingPct: posture.passingPct,
      overdue: posture.attention.overdue,
      needsRemediation: posture.attention['needs-remediation'],
      dueSoon: posture.attention['due-soon'],
    });
  });

  it('puts each failing test in exactly one tile, and every tile filter counts its tests', () => {
    const strip = testStrip(tests, NOW, tz);
    const count = (tile: Parameters<typeof inTestTile>[1]) =>
      tests.filter((t) => inTestTile(t, tile, NOW, tz)).length;
    expect(count('overdue')).toBe(strip.overdue);
    expect(count('due-soon')).toBe(strip.dueSoon);
    expect(count('needs-remediation')).toBe(strip.needsRemediation);
    expect(count('passing') + strip.overdue + strip.dueSoon + strip.needsRemediation).toBe(
      tests.length,
    );
  });

  it('ranks problems first: overdue, due soon, needs remediation, then passing', () => {
    const ranks = [...tests]
      .sort((a, b) => testProblemRank(a, NOW, tz) - testProblemRank(b, NOW, tz))
      .map((t) => t.status);
    const firstPassing = ranks.indexOf('passing');
    expect(ranks.slice(firstPassing).every((s) => s === 'passing')).toBe(true);
    expect(firstPassing).toBe(tests.filter((t) => t.status === 'failing').length);
  });

  it('tags every test with a category from its source', () => {
    for (const t of tests) expect(testCategory(t, integrations)).not.toBe('Other');
    const orphan = { ...tests[0]!, integrationId: 'none' } as ComplianceTest;
    expect(testCategory(orphan, integrations)).toBe('Other');
  });
});

describe('integrations', () => {
  it('puts the MCP inspector in error on row 1 of Connected', () => {
    const tabs = integrationTabs(integrations);
    expect(tabs.connected[0]!.id).toBe('int-mcp');
    expect(tabs.errors.map((i) => i.id)).toEqual(['int-mcp']);
    expect(tabs.available.every((i) => i.status === 'not-connected')).toBe(true);
  });

  it('counts each tab and splits every source between Connected and Available', () => {
    const counts = integrationTabCounts(integrations);
    expect(counts.connected + counts.available).toBe(integrations.length);
    expect(counts.errors).toBe(1);
    expect(counts.available).toBeGreaterThan(0);
  });

  it('derives "unlocks N" from the seed for every source', () => {
    for (const i of integrations) {
      const unlocks = integrationUnlocks(i.id, tests, controls, frameworkItems);
      expect(unlocks.tests, i.id).toBe(tests.filter((t) => t.integrationId === i.id).length);
      expect(unlocks.tests, i.id).toBeGreaterThan(0);
    }
  });

  it('lists the tests that depend on a source, failing first', () => {
    const deps = dependentTests('int-mcp', tests);
    expect(deps.map((t) => t.integrationId)).toEqual(deps.map(() => 'int-mcp'));
    const firstPassing = deps.findIndex((t) => t.status === 'passing');
    if (firstPassing >= 0) {
      expect(deps.slice(firstPassing).every((t) => t.status === 'passing')).toBe(true);
    }
    expect(deps.some((t) => t.status === 'failing')).toBe(true);
  });

  it('groups scope by kind with "n of m in scope"', () => {
    const mcp = integrations.find((i) => i.id === 'int-mcp')!;
    expect(scopeGroups(mcp.scope).map((g) => [g.label, g.included, g.total])).toEqual([
      ['MCP servers', 2, 3],
      ['Tools', 1, 2],
    ]);
    expect(scopeGroups([])).toEqual([]);
  });
});

describe('verification summary', () => {
  it('reads the seeded gap as one line', () => {
    const s = verificationSummary(verification());
    expect(s.line).toBe(`4 of 5 ranges verify; gap at seq ${MISSING_SEQ} in 101–150`);
    expect(s.gap).toEqual({ seq: MISSING_SEQ, fromSeq: 101, toSeq: 150 });
  });

  it('has no gap when every range verifies, and names a range when no seq is given', () => {
    const clean = verifyRanges(evidence.filter((r) => r.seq < 100));
    expect(verificationSummary(clean)).toEqual({
      verified: 2,
      total: 2,
      line: '2 of 2 ranges verify',
    });
    const odd: RangeVerification[] = [
      { fromSeq: 1, toSeq: 50, ok: false, layers: [{ layer: 'L2', ok: false, message: 'bad' }] },
    ];
    expect(verificationSummary(odd).line).toBe('0 of 1 ranges verify; failure in 1–50');
  });
});

describe('article coverage', () => {
  it('counts every row once', () => {
    const rows = articleRows();
    const c = coverageCounts(rows);
    expect(c['needs-attention'] + c.covered + c.shared + c.outside).toBe(rows.length);
    expect(c['needs-attention']).toBeGreaterThan(0);
  });

  it('groups rows in P, A–G, T order with needs-attention rows first in each group', () => {
    const groups = coverageByGroup(articleRows());
    expect(groups.map((g) => g.group)).toEqual(
      ARTICLE_GROUPS.filter((g) => articleRows().some((r) => r.group === g)),
    );
    for (const g of groups) {
      const first = g.rows.findIndex((r) => r.status !== 'needs-attention');
      if (first >= 0) {
        expect(g.rows.slice(first).some((r) => r.status === 'needs-attention')).toBe(false);
      }
    }
    expect(groups.flatMap((g) => g.rows).length).toBe(articleRows().length);
  });
});

it('counts signals in words', () => {
  expect(signalCount(1)).toBe('1 signal');
  expect(signalCount(2)).toBe('2 signals');
});
