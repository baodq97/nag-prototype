// Read-only selectors over the seed. Screens import data only from here; a real backend
// would plug in behind these functions.

import { appliesTo, attentionFor, coverageStatus } from '../domain/aiact';
import type { AssistantContext } from '../domain/assistant';
import { type DerivedCategory, deriveTrust } from '../domain/claims';
import { classify } from '../domain/classification';
import { erasureLayers } from '../domain/erasure';
import { escalationOf } from '../domain/escalation';
import { blastRadius, breachTotals, stageHealth } from '../domain/health';
import { integrationUnlocks } from '../domain/integrations';
import {
  attentionCounts,
  controlPostureByFramework,
  controlTestStatus,
  postureTrend,
  testPassingPct,
} from '../domain/posture';
import { documentReviewState, policyRenewalState } from '../domain/review';
import { verifyRanges } from '../domain/verification';
import type {
  AiSystemView,
  ComplianceDocument,
  Control,
  CoverageRow,
  FrameworkId,
  FrameworkItem,
  Policy,
  QuarantineItem,
  ReviewState,
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
import { ARTICLE_GROUPS, articleMap } from '../seed/articles';
import { controls, documents, policies, tests } from '../seed/catalogue';
import {
  audits,
  packageSections,
  qmsTemplates,
  risks,
  seedTasks,
  trustCategories,
} from '../seed/governance';
import {
  ERASURE_SUBJECTS,
  circuitBreaker,
  defaultFallbackMode,
  evidence,
  latencyProfiles,
  lineage,
  pipelineStages,
  policyBundles,
  privacyEndpoints,
  quarantine,
  traces,
} from '../seed/runtime';
import { aiSystems as seededSystems } from '../seed/systems';

export {
  ARTICLE_GROUPS,
  ERASURE_SUBJECTS,
  NOW,
  audits,
  controls,
  currentUserId,
  defaultFallbackMode,
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

export function documentReview(doc: ComplianceDocument): ReviewState {
  return documentReviewState(doc, NOW, tenant.timeZone);
}

export function policyRenewal(policy: Policy): ReviewState {
  return policyRenewalState(policy, NOW, tenant.timeZone);
}

/** How many approved documents and policies are past their review or renewal date. */
export function reviewCounts() {
  return {
    documentsOverdue: documents.filter((d) => documentReview(d) === 'review-overdue').length,
    policiesExpired: policies.filter((p) => policyRenewal(p) === 'renewal-expired').length,
  };
}

/** The public trust claims with the status each derives from the console state. */
export function trustEntries(): DerivedCategory[] {
  return deriveTrust(trustCategories, {
    controls: controlsById,
    tests: testsById,
    documents: byId(documents),
    policies: byId(policies),
    ranges: verification(),
    now: NOW,
    timeZone: tenant.timeZone,
  });
}

/** The three evidence layers of every range that holds a record of the subject. */
export function erasureFor(subjectId: string) {
  return erasureLayers(subjectId, evidence, verification());
}

export function runtimeHealth() {
  return {
    stages: pipelineStages.map(stageHealth),
    totals: breachTotals(pipelineStages),
    blastRadius: blastRadius(policyBundles),
    breaker: circuitBreaker,
  };
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

/** Ids of the controls and tests that map to a framework item. */
const linkedTo = (itemId: string) => ({
  controlIds: controls.filter((c) => c.frameworkItemIds.includes(itemId)).map((c) => c.id),
  testIds: tests.filter((t) => t.frameworkItemIds.includes(itemId)).map((t) => t.id),
});

const rows: CoverageRow[] = articleMap.map((row) => {
  const links = linkedTo(row.id);
  const linked = links.controlIds.map((id) => controlsById.get(id)!);
  const controlsOk = linked.map((c) => controlStatus(c).ok);
  const attention = attentionFor(linked, (id) => testsById.get(id)?.status === 'failing');
  return {
    ...row,
    ...links,
    status: coverageStatus(row.nagRole, controlsOk, links.testIds.length),
    ...(attention && { attention }),
  };
});
const rowsById = byId(rows);

/** The EU AI Act article map with its linked controls and tests and the derived status. */
export function articleRows(): CoverageRow[] {
  return rows;
}

export const getArticleRow = (id: string) => rowsById.get(id);

const systems: AiSystemView[] = seededSystems.map((s) => ({
  ...s,
  endpoint: privacyEndpoints.find((e) => e.id === s.endpointId)?.path,
  classification: classify(s.answers, s.roleAnswers),
}));

/** The AI system inventory with the classification replayed from each system's answers. */
export function aiSystems(): AiSystemView[] {
  return systems;
}

export const getSystem = (id: string) => systems.find((s) => s.id === id);

/** The article rows that apply to a system's risk tier and roles, in map order. */
export function rowsForSystem(systemId: string): CoverageRow[] {
  const system = getSystem(systemId);
  return system ? rows.filter((r) => appliesTo(r, system.classification)) : [];
}

/** Articles with a row open on it; every other item filters the controls table. */
const itemHref = (i: FrameworkItem) =>
  rowsById.has(i.id) ? `/coverage#${i.id}` : `/controls?q=${encodeURIComponent(i.ref)}`;

/** Everything the command search can find: tests, controls, documents, policies, risks, articles, systems. */
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
  ...systems.map((s) => ({
    kind: 'system' as const,
    id: s.id,
    label: s.name,
    href: `/ai-systems?open=${s.id}`,
  })),
];
