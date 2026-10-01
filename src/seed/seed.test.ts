// Checks that the seed holds what the screens promise.

import { describe, expect, it } from 'vitest';
import { bandFor } from '../domain/classifier';
import { getCode, isCode } from '../domain/codes';
import { erasureClock, erasureDue } from '../domain/erasure-deadline';
import { depths, isDepthAllowed } from '../domain/lineage';
import { articleMap } from './articles';
import { NOW, frameworkItems, integrations, tenant } from './base';
import { controls, documents, policies, tests } from './catalogue';
import { audits, declarationElements, packageSections, qmsTemplates, risks } from './governance';
import {
  ERASURE_SUBJECTS,
  MISSING_SEQ,
  circuitBreaker,
  classifierConfig,
  erasureRequests,
  evidence,
  lineage,
  mcpSessions,
  pipelineStages,
  policyBundles,
  privacyEndpoints,
  quarantine,
  toolCalls,
  traces,
} from './runtime';
import { aiSystems } from './systems';

const itemIds = new Set(frameworkItems.map((i) => i.id));

describe('catalogue', () => {
  it('has at least 40 tests and 30 controls, each mapped to a valid framework item', () => {
    expect(tests.length).toBeGreaterThanOrEqual(40);
    expect(controls.length).toBeGreaterThanOrEqual(30);
    for (const x of [...tests, ...controls, ...documents, ...policies, ...risks]) {
      expect(x.frameworkItemIds.length, x.id).toBeGreaterThan(0);
      for (const id of x.frameworkItemIds) expect(itemIds.has(id), `${x.id} → ${id}`).toBe(true);
    }
  });

  it('links controls only to existing tests, documents and policies', () => {
    const ids = new Set([...tests, ...documents, ...policies].map((x) => x.id));
    for (const c of controls) {
      for (const id of [...c.testIds, ...c.documentIds, ...c.policyIds]) {
        expect(ids.has(id), `${c.id} → ${id}`).toBe(true);
      }
    }
  });

  it('gives every test at least 3 remediation steps and a known integration', () => {
    const sources = new Set(integrations.map((i) => i.id));
    for (const t of tests) {
      expect(t.remediation.length).toBeGreaterThanOrEqual(3);
      expect(sources.has(t.integrationId)).toBe(true);
      expect(t.failingEntities.length > 0).toBe(t.status === 'failing');
    }
  });

  it('flags at least two documents', () => {
    expect(documents.filter((d) => d.assistantFlag).length).toBeGreaterThanOrEqual(2);
  });
});

const paragraphs = (n: number, count: number) =>
  Array.from({ length: count }, (_, i) => `aia-${n}-${i + 1}`);

const ARTICLE_IDS = [
  ...['aia-6-1', 'aia-6-2', 'aia-6-3', 'aia-6-4', 'aia-7'],
  ...[8, 9, 10, 11, 12, 13, 14, 15].map((n) => `aia-${n}`),
  ...[16, 17, 18, 19, 20, 21, 22].map((n) => `aia-${n}`),
  ...['aia-40', 'aia-41', 'aia-42', 'aia-43', 'aia-43-4', 'aia-47', 'aia-48', 'aia-49'],
  ...paragraphs(26, 11),
  'aia-27',
  'aia-86',
  ...[23, 24, 25, 72, 73, 80].map((n) => `aia-${n}`),
  'aia-4',
  'aia-99',
  ...paragraphs(50, 7),
  'aia-5',
];

const byRole = (role: string) =>
  articleMap
    .filter((r) => r.nagRole === role)
    .map((r) => r.id)
    .sort();

describe('article map', () => {
  it('has exactly one row for each of the 57 ids', () => {
    expect(ARTICLE_IDS).toHaveLength(57);
    expect(articleMap.map((r) => r.id).sort()).toEqual([...ARTICLE_IDS].sort());
    expect(articleMap.find((r) => r.id === 'aia-49')?.article).toBe('Art. 49 and 71');
  });

  it('fills every field and stores no status', () => {
    for (const r of articleMap) {
      for (const text of [r.title, r.nagDoes, r.customerKeeps]) expect(text, r.id).not.toBe('');
      expect(r.riskTiers.length, r.id).toBeGreaterThan(0);
      expect(r.dates.length, r.id).toBeGreaterThan(0);
      expect(Object.keys(r), r.id).not.toContain('status');
      for (const d of [r.provider, r.deployer]) {
        if (d.kind === 'only-if') expect(d.condition, r.id).not.toBe('');
      }
    }
  });

  it('names exactly three rows outside NAG scope, each with a reason and no link', () => {
    expect(byRole('outside')).toEqual(['aia-22', 'aia-26-7', 'aia-48']);
    const linked = new Set([...controls, ...tests].flatMap((x) => x.frameworkItemIds));
    for (const r of articleMap) {
      expect(Boolean(r.outsideReason), r.id).toBe(r.nagRole === 'outside');
      if (r.nagRole === 'outside') expect(linked.has(r.id), r.id).toBe(false);
    }
  });

  it('gives every row a duty for the provider, the deployer or both, except the information rows', () => {
    const noDuty = articleMap.filter(
      (r) => r.provider.kind === 'not-applicable' && r.deployer.kind === 'not-applicable',
    );
    expect(noDuty.map((r) => r.id).sort()).toEqual(['aia-26-3', 'aia-99']);
    for (const r of noDuty) {
      expect(r.note, r.id).toBeTruthy();
      expect(r.nagRole, r.id).toBe('supports');
    }
  });

  it('says on the monitoring and log rows how a financial institution meets them', () => {
    const noted = articleMap.filter((r) => r.note?.startsWith('Financial institutions'));
    expect(noted.map((r) => r.id)).toEqual(['aia-26-5', 'aia-26-6', 'aia-72']);
  });

  it('makes NAG the control on exactly the seventeen continuous-evidence rows', () => {
    expect(byRole('control')).toEqual(
      [
        'aia-9',
        'aia-12',
        'aia-14',
        'aia-15',
        'aia-19',
        'aia-20',
        'aia-21',
        'aia-25',
        'aia-26-1',
        'aia-26-2',
        'aia-26-4',
        'aia-26-5',
        'aia-26-6',
        'aia-43-4',
        'aia-72',
        'aia-73',
        'aia-86',
      ].sort(),
    );
  });

  it('follows the application calendar', () => {
    const dates = (id: string) => articleMap.find((r) => r.id === id)!.dates.map((d) => d.date);
    expect(dates('aia-4')).toEqual(['2025-02-02']);
    expect(dates('aia-5')).toEqual(['2025-02-02']);
    expect(dates('aia-99')).toEqual(['2025-08-02']);
    expect(dates('aia-50-1')).toEqual(['2026-08-02']);
    expect(dates('aia-50-2')).toEqual(['2026-08-02', '2026-12-02']);
    expect(dates('aia-6-1')).toEqual(['2028-08-02']);
    expect(dates('aia-6-2')).toEqual(['2027-12-02']);
    for (const r of articleMap.filter((x) => 'ABCDEF'.includes(x.group))) {
      if (r.id === 'aia-6-1' || r.id === 'aia-6-2') continue;
      expect(r.dates, r.id).toEqual([
        { date: '2027-12-02', path: 'annex-iii' },
        { date: '2028-08-02', path: 'annex-i' },
      ]);
    }
  });

  it('gives every row an own-words title on its framework item', () => {
    for (const r of articleMap) {
      expect(frameworkItems.find((i) => i.id === r.id)?.title, r.id).toBe(r.title);
    }
  });
});

describe('AI systems', () => {
  it('has three systems that store answers but no risk tier', () => {
    expect(aiSystems.map((s) => s.id)).toEqual(['sys-credit', 'sys-support', 'sys-router']);
    for (const s of aiSystems) {
      expect(Object.keys(s), s.id).not.toContain('riskTier');
      expect(Object.keys(s.answers), s.id).not.toContain('riskTier');
    }
  });

  it('reuses gateway endpoint ids for discovered systems only', () => {
    const endpointIds = new Set(privacyEndpoints.map((e) => e.id));
    for (const s of aiSystems) {
      expect(s.discovery === 'gateway', s.id).toBe(s.endpointId !== undefined);
      if (s.endpointId) expect(endpointIds.has(s.endpointId), s.id).toBe(true);
    }
  });

  it('carries one drift alert on the support agent and one modification flag on credit', () => {
    const signals = aiSystems.flatMap((s) => s.signals.map((x) => [s.id, x.kind]));
    expect(signals).toEqual([
      ['sys-credit', 'modification'],
      ['sys-support', 'drift'],
    ]);
    const drift = aiSystems[1]!.signals[0]!;
    expect(drift.text).toBe('Observed requests touching credit decisions, reassess');
    expect(quarantine.some((q) => q.summary === drift.quarantineSummary)).toBe(true);
  });
});

describe('integrations', () => {
  it('has at least 6 sources, one in error, covering the three ways of observing traffic', () => {
    expect(integrations.length).toBeGreaterThanOrEqual(6);
    expect(integrations.some((i) => i.status === 'error')).toBe(true);
    const kinds = new Set(integrations.map((i) => i.kind));
    for (const k of ['reverse-proxy', 'lifecycle-hooks', 'mcp-inspector'] as const) {
      expect(kinds.has(k)).toBe(true);
    }
  });
});

describe('runtime', () => {
  it('has at least 200 evidence records with one missing sequence number', () => {
    expect(evidence.length).toBeGreaterThanOrEqual(200);
    const seqs = new Set(evidence.map((r) => r.seq));
    expect(seqs.has(MISSING_SEQ)).toBe(false);
    expect(seqs.has(MISSING_SEQ - 1) && seqs.has(MISSING_SEQ + 1)).toBe(true);
  });

  it('is deterministic and keeps the gap at seq 137', () => {
    expect(MISSING_SEQ).toBe(137);
    expect(evidence.map((r) => r.subjectId).slice(0, 3)).toEqual([
      'subj-0038',
      'subj-0012',
      'subj-0014',
    ]);
  });

  it('has one erasure subject next to the gap and one whose ranges all verify', () => {
    const seqs = (s: string) => evidence.filter((r) => r.subjectId === s).map((r) => r.seq);
    expect(seqs(ERASURE_SUBJECTS.withGap).some((s) => s >= 101 && s <= 150)).toBe(true);
    const clean = seqs(ERASURE_SUBJECTS.clean);
    expect(clean.length).toBeGreaterThan(0);
    expect(clean.some((s) => s >= 101 && s <= 150)).toBe(false);
  });

  it('has a budget, seeded percentiles and breach counters for every pipeline stage', () => {
    expect(pipelineStages.length).toBeGreaterThanOrEqual(4);
    for (const s of pipelineStages) {
      expect(s.p50Ms <= s.p95Ms && s.p95Ms <= s.p99Ms, s.id).toBe(true);
      expect(s.breaches24h <= s.breaches7d, s.id).toBe(true);
    }
    expect(['closed', 'open', 'half-open']).toContain(circuitBreaker.state);
  });

  it('has at least 12 quarantined items', () => {
    expect(quarantine.length).toBeGreaterThanOrEqual(12);
  });

  it('puts every quarantined item in the band the classifier bounds give', () => {
    for (const q of quarantine) expect(q.band, q.id).toBe(bandFor(q.score, classifierConfig));
    expect(classifierConfig.bands.map((b) => [b.band, b.min])).toEqual([
      ['low', 0.5],
      ['medium', 0.6],
      ['high', 0.85],
    ]);
    expect(classifierConfig.releaseThreshold).toBe(0.5);
  });

  it('uses only catalogue codes: at least 3 in evidence and 2 in tool calls', () => {
    for (const x of [...evidence, ...toolCalls]) expect(isCode(x.code), String(x.code)).toBe(true);
    expect(new Set(evidence.map((r) => r.code)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(toolCalls.map((c) => c.code)).size).toBeGreaterThanOrEqual(2);
  });

  it('has an erasure request overdue and one due within 2 working days at NOW', () => {
    expect(erasureRequests.length).toBeGreaterThanOrEqual(4);
    const clocks = erasureRequests.map((r) =>
      erasureClock(erasureDue(r.receivedAt, tenant.timeZone), NOW, tenant.timeZone),
    );
    expect(clocks.some((c) => c.state === 'overdue')).toBe(true);
    expect(clocks.some((c) => c.state === 'upcoming' && c.workingDays <= 2)).toBe(true);
    expect(clocks.map((c) => c.text)).toContain('overdue by 2 working days');
    expect(clocks.map((c) => c.text)).toContain('due in 2 working days');
  });

  it('has 3 or more MCP sessions with 10 or more calls, one cut off by a fail-closed block', () => {
    expect(mcpSessions.length).toBeGreaterThanOrEqual(3);
    expect(toolCalls.length).toBeGreaterThanOrEqual(10);
    for (const c of toolCalls) {
      expect(
        mcpSessions.some((s) => s.id === c.sessionId),
        c.id,
      ).toBe(true);
    }
    const lastCode = (id: string) => toolCalls.filter((c) => c.sessionId === id).at(-1)?.code;
    const blocked = mcpSessions.filter(
      (s) => lastCode(s.id) && getCode(lastCode(s.id)!).label === 'Blocked fail-closed',
    );
    expect(blocked).toHaveLength(1);
    expect(blocked[0]!.state).toBe('terminated');
    expect(mcpSessions.filter((s) => s.state === 'terminated')).toEqual(blocked);
  });

  it('has the lineage traces the screen needs', () => {
    expect(traces.length).toBeGreaterThanOrEqual(3);
    const d = depths(lineage);
    const outcomes = new Set(lineage.filter((n) => n.kind === 'mcp-tool').map((n) => n.outcome));
    expect([...outcomes].sort()).toEqual(['abandoned', 'cancelled', 'error', 'success']);
    expect(
      Math.max(...lineage.filter((n) => n.traceId === 'TR-91c2').map((n) => d.get(n.id)!)),
    ).toBe(10);
    const rejected = lineage.filter((n) => n.kind === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(d.get(rejected[0]!.id)).toBe(11);
    expect(isDepthAllowed(d.get(rejected[0]!.id)!)).toBe(false);
    expect(rejected[0]!.outcome).toBe('error');
  });

  it('has the 8 Art. 5 bundles and at least 4 others', () => {
    expect(policyBundles.filter((b) => b.article5)).toHaveLength(8);
    expect(policyBundles.filter((b) => !b.article5).length).toBeGreaterThanOrEqual(4);
  });
});

describe('governance', () => {
  it('has 13 QMS templates with the three-step chain', () => {
    expect(qmsTemplates).toHaveLength(13);
    for (const t of qmsTemplates) {
      expect(t.chain.map((s) => s.role)).toEqual(['Drafter', 'Compliance Lead', 'CEO']);
      // Approved steps always come first.
      const approved = t.chain.map((s) => Boolean(s.approvedAt));
      expect(approved).toEqual([...approved].sort().reverse());
      expect(t.frameworkItemIds.every((id) => id.startsWith('iso-'))).toBe(true);
    }
  });

  it('has 4 runtime-derived and 5 template Annex IV sections', () => {
    const annex = packageSections.filter((s) => s.annexIv);
    expect(annex.filter((s) => s.source === 'runtime')).toHaveLength(4);
    expect(annex.filter((s) => s.source === 'template')).toHaveLength(5);
  });

  it('has the declaration, deployer and supplier elements the package lists', () => {
    const titles = (group: string) =>
      declarationElements.filter((e) => e.group === group).map((e) => e.title);
    expect(titles('declaration').length).toBeGreaterThanOrEqual(8);
    expect(titles('deployer').length).toBeGreaterThanOrEqual(2);
    expect(titles('supplier')).toEqual(['Supplier attestation', 'Component list']);
    expect(new Set(declarationElements.map((e) => e.id)).size).toBe(declarationElements.length);
  });

  it('has an audit using all five tracker states', () => {
    const states = new Set(audits[0]!.requests.map((r) => r.state));
    expect(states.size).toBe(5);
  });
});
