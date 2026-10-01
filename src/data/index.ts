// Read-only selectors over the seed. Screens import data only from here; a real backend
// would plug in behind these functions.

import type { AssistantContext } from '../domain/assistant';
import { escalationOf } from '../domain/escalation';
import { integrationUnlocks } from '../domain/integrations';
import {
  attentionCounts,
  controlPostureByFramework,
  controlTestStatus,
  postureTrend,
  testPassingPct,
} from '../domain/posture';
import { verifyRanges } from '../domain/verification';
import type {
  Control,
  FrameworkId,
  FrameworkItem,
  QuarantineItem,
  SearchEntry,
} from '../domain/types';
import {
  NOW,
  currentUserId,
  detectionQuality,
  frameworkItems,
  integrations,
  people,
  tenant,
  trustUpdatedAt,
} from '../seed/base';
import { controls, coverage, documents, policies, tests } from '../seed/catalogue';
import {
  audits,
  packageSections,
  qmsTemplates,
  risks,
  seedTasks,
  trustCategories,
} from '../seed/governance';
import {
  evidence,
  latencyProfiles,
  lineage,
  policyBundles,
  privacyEndpoints,
  quarantine,
  traces,
} from '../seed/runtime';

export {
  NOW,
  audits,
  controls,
  coverage,
  currentUserId,
  detectionQuality,
  documents,
  evidence,
  frameworkItems,
  integrations,
  latencyProfiles,
  lineage,
  packageSections,
  people,
  policies,
  policyBundles,
  privacyEndpoints,
  qmsTemplates,
  quarantine,
  risks,
  seedTasks,
  tenant,
  tests,
  traces,
  trustCategories,
  trustUpdatedAt,
};

export const FRAMEWORK_NAMES: Record<FrameworkId, string> = {
  'eu-ai-act': 'EU AI Act',
  'iso-42001': 'ISO/IEC 42001',
};

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

const testsById = byId(tests);
const controlsById = byId(controls);
const itemsById = byId(frameworkItems);
const peopleById = byId(people);

export const getTest = (id: string) => testsById.get(id);
export const getControl = (id: string) => controlsById.get(id);
export const getIntegration = (id: string) => integrations.find((i) => i.id === id);
export const getDocument = (id: string) => documents.find((d) => d.id === id);
export const getPolicy = (id: string) => policies.find((p) => p.id === id);
export const getRisk = (id: string) => risks.find((r) => r.id === id);
export const getAudit = (id: string) => audits.find((a) => a.id === id);
export const getBundle = (id: string) => policyBundles.find((b) => b.id === id);

export function personName(id: string): string {
  return peopleById.get(id)?.name ?? id;
}

export function getItems(ids: string[]): FrameworkItem[] {
  return ids.flatMap((id) => itemsById.get(id) ?? []);
}

/** Item references grouped for display, e.g. "Art. 14, A.6.2.6". */
export function itemRefs(ids: string[]): string {
  return getItems(ids)
    .map((i) => i.ref)
    .join(', ');
}

export function controlStatus(control: Control) {
  return controlTestStatus(control, testsById);
}

export function controlsForTest(testId: string): Control[] {
  return controls.filter((c) => c.testIds.includes(testId));
}

export function postureSummary() {
  return {
    passingPct: testPassingPct(tests),
    passing: tests.filter((t) => t.status === 'passing').length,
    total: tests.length,
    attention: attentionCounts(tests, NOW, tenant.timeZone),
    byFramework: controlPostureByFramework(controls, tests, frameworkItems),
    trend: postureTrend(tests, NOW, 30),
  };
}

export function unlocksFor(integrationId: string) {
  return integrationUnlocks(integrationId, tests, controls, frameworkItems);
}

export function escalationFor(item: QuarantineItem) {
  return escalationOf(item.receivedAt, NOW, tenant);
}

export function verification() {
  return verifyRanges(evidence);
}

export function traceNodes(traceId: string) {
  return lineage.filter((n) => n.traceId === traceId);
}

export function assistantContext(): AssistantContext {
  return {
    now: NOW,
    timeZone: tenant.timeZone,
    tests,
    controls,
    items: frameworkItems,
    integrations,
    risks,
    documents,
  };
}

const coverageRows = new Set(coverage.map((c) => c.frameworkItemId));

/** Articles with a coverage row open on it; every other item filters the controls table. */
const itemHref = (i: FrameworkItem) =>
  coverageRows.has(i.id) ? `/coverage#${i.id}` : `/controls?q=${encodeURIComponent(i.ref)}`;

/** Everything the command search can find: tests, controls, documents, policies, risks, articles. */
export const searchIndex: SearchEntry[] = [
  ...tests.map((t) => ({ kind: 'test' as const, id: t.id, label: t.name, href: `/tests/${t.id}` })),
  ...controls.map((c) => ({
    kind: 'control' as const,
    id: c.id,
    label: c.name,
    href: `/controls?open=${c.id}`,
  })),
  ...documents.map((d) => ({
    kind: 'document' as const,
    id: d.id,
    label: d.name,
    href: `/documents?open=${d.id}`,
  })),
  ...policies.map((p) => ({
    kind: 'policy' as const,
    id: p.id,
    label: p.name,
    href: `/policies?open=${p.id}`,
  })),
  ...risks.map((r) => ({
    kind: 'risk' as const,
    id: r.id,
    label: r.scenario,
    href: `/risks?open=${r.id}`,
  })),
  ...frameworkItems.map((i) => ({
    kind: 'article' as const,
    id: i.id,
    label: `${i.ref} ${i.title}`,
    href: itemHref(i),
  })),
];
