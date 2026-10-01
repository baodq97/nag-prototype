// Headline numbers and orderings the screens show. Screens only render: every count in a summary
// strip, every "unlocks N" and every problems-first order comes from here, derived from the seed.

import { type AttentionBucket, attentionBucket, attentionCounts, testPassingPct } from './posture';
import type {
  ArticleGroup,
  ComplianceTest,
  CoverageRow,
  CoverageStatus,
  Integration,
  IntegrationKind,
  RangeVerification,
  ResourceKind,
  ScopeEntry,
} from './types';

// ---- Tests -----------------------------------------------------------------------------------

/** The tests strip; the same figures the posture page shows. */
export interface TestStrip {
  passingPct: number;
  overdue: number;
  needsRemediation: number;
  dueSoon: number;
}

export function testStrip(tests: ComplianceTest[], now: string, timeZone: string): TestStrip {
  const a = attentionCounts(tests, now, timeZone);
  return {
    passingPct: testPassingPct(tests),
    overdue: a.overdue,
    needsRemediation: a['needs-remediation'],
    dueSoon: a['due-soon'],
  };
}

/** Whether a test belongs to a strip tile: "passing" or one of the attention buckets. */
export function inTestTile(
  test: ComplianceTest,
  tile: 'passing' | AttentionBucket,
  now: string,
  timeZone: string,
): boolean {
  return tile === 'passing'
    ? test.status === 'passing'
    : attentionBucket(test, now, timeZone) === tile;
}

/** Rank for problems first: overdue, then due soon, then needs remediation, then passing. */
export function testProblemRank(test: ComplianceTest, now: string, timeZone: string): number {
  const b = attentionBucket(test, now, timeZone);
  return b === 'overdue' ? 0 : b === 'due-soon' ? 1 : b === 'needs-remediation' ? 2 : 3;
}

/** The category tag of a test, from the kind of source that runs it. */
export const TEST_CATEGORY: Record<IntegrationKind, string> = {
  'ai-gateway': 'Runtime policy',
  'agent-hooks': 'Agent oversight',
  'mcp-inspector': 'Tool calls',
  'model-endpoint': 'Transparency',
  identity: 'Human oversight',
  ticketing: 'Governance',
  chat: 'Human oversight',
  'key-management': 'Privacy',
  'evidence-archive': 'Evidence',
  'security-export': 'Incidents',
  'timestamp-authority': 'Evidence',
  'source-repository': 'Documentation',
  cloud: 'Data',
};

export function testCategory(test: ComplianceTest, integrations: Integration[]): string {
  const source = integrations.find((i) => i.id === test.integrationId);
  return source ? TEST_CATEGORY[source.kind] : 'Other';
}

// ---- Integrations ----------------------------------------------------------------------------

export type IntegrationTab = 'connected' | 'available' | 'errors';

/** Connected holds every source that was set up, errors included; Available the rest. */
export function integrationTabs(
  integrations: Integration[],
): Record<IntegrationTab, Integration[]> {
  const connected = integrations.filter((i) => i.status !== 'not-connected');
  return {
    // Errors sort first; otherwise the seed order holds.
    connected: [
      ...connected.filter((i) => i.status === 'error'),
      ...connected.filter((i) => i.status !== 'error'),
    ],
    available: integrations.filter((i) => i.status === 'not-connected'),
    errors: integrations.filter((i) => i.status === 'error'),
  };
}

export function integrationTabCounts(integrations: Integration[]): Record<IntegrationTab, number> {
  const tabs = integrationTabs(integrations);
  return {
    connected: tabs.connected.length,
    available: tabs.available.length,
    errors: tabs.errors.length,
  };
}

/** The tests that read from a source, failing first: what breaks when it is in error. */
export function dependentTests(integrationId: string, tests: ComplianceTest[]): ComplianceTest[] {
  const own = tests.filter((t) => t.integrationId === integrationId);
  return [
    ...own.filter((t) => t.status === 'failing'),
    ...own.filter((t) => t.status !== 'failing'),
  ];
}

export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  endpoint: 'Endpoints',
  agent: 'Agents',
  'mcp-server': 'MCP servers',
  tool: 'Tools',
  other: 'Other resources',
};

const RESOURCE_ORDER: ResourceKind[] = ['endpoint', 'agent', 'mcp-server', 'tool', 'other'];

export interface ScopeGroup {
  kind: ResourceKind;
  label: string;
  entries: ScopeEntry[];
  included: number;
  total: number;
}

/** Scope entries grouped by kind, in a fixed order, each with "n of m in scope". */
export function scopeGroups(scope: ScopeEntry[]): ScopeGroup[] {
  return RESOURCE_ORDER.flatMap((kind) => {
    const entries = scope.filter((e) => e.kind === kind);
    if (entries.length === 0) return [];
    return [
      {
        kind,
        label: RESOURCE_KIND_LABEL[kind],
        entries,
        included: entries.filter((e) => e.included).length,
        total: entries.length,
      },
    ];
  });
}

// ---- Evidence --------------------------------------------------------------------------------

export interface VerificationSummary {
  verified: number;
  total: number;
  /** The first failing range and the sequence number its chain layer names, if any. */
  gap?: { seq: number | null; fromSeq: number; toSeq: number };
  /** "3 of 4 ranges verify; gap at seq 137 in 101–150". */
  line: string;
}

export function verificationSummary(ranges: RangeVerification[]): VerificationSummary {
  const verified = ranges.filter((r) => r.ok).length;
  const failed = ranges.find((r) => !r.ok);
  const head = `${verified} of ${ranges.length} ranges verify`;
  if (!failed) return { verified, total: ranges.length, line: head };
  const message = failed.layers.find((l) => !l.ok)?.message ?? '';
  const match = /seq (\d+)/.exec(message);
  const seq = match ? Number(match[1]) : null;
  const where = `${failed.fromSeq}–${failed.toSeq}`;
  return {
    verified,
    total: ranges.length,
    gap: { seq, fromSeq: failed.fromSeq, toSeq: failed.toSeq },
    line: seq === null ? `${head}; failure in ${where}` : `${head}; gap at seq ${seq} in ${where}`,
  };
}

// ---- Article coverage ------------------------------------------------------------------------

export const COVERAGE_ORDER: CoverageStatus[] = ['needs-attention', 'covered', 'shared', 'outside'];

export function coverageCounts(rows: CoverageRow[]): Record<CoverageStatus, number> {
  const counts = { 'needs-attention': 0, covered: 0, shared: 0, outside: 0 };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

export const ARTICLE_GROUPS: ArticleGroup[] = ['P', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'T'];

/** Rows under their group headings (P, A–G, T); inside a group, needs-attention rows first. */
export function coverageByGroup(
  rows: CoverageRow[],
): { group: ArticleGroup; rows: CoverageRow[] }[] {
  return ARTICLE_GROUPS.flatMap((group) => {
    const inGroup = rows.filter((r) => r.group === group);
    if (inGroup.length === 0) return [];
    const ordered = COVERAGE_ORDER.flatMap((s) => inGroup.filter((r) => r.status === s));
    return [{ group, rows: ordered }];
  });
}

// ---- AI systems ------------------------------------------------------------------------------

/** "1 signal", "2 signals". */
export const signalCount = (n: number) => `${n} ${n === 1 ? 'signal' : 'signals'}`;
