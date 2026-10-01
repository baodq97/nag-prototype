// Checks that the seed holds what the screens promise.

import { describe, expect, it } from 'vitest';
import { depths, isDepthAllowed } from '../domain/lineage';
import { frameworkItems, integrations } from './base';
import { controls, coverage, documents, policies, tests } from './catalogue';
import { audits, packageSections, qmsTemplates, risks } from './governance';
import { MISSING_SEQ, evidence, lineage, policyBundles, quarantine, traces } from './runtime';

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

  it('covers the nine articles with Art. 11 partial', () => {
    expect(coverage.map((c) => c.article)).toEqual([
      'Art. 5',
      'Art. 11',
      'Art. 12',
      'Art. 13',
      'Art. 14',
      'Art. 18',
      'Art. 26',
      'Art. 43',
      'Art. 47',
    ]);
    expect(coverage.find((c) => c.article === 'Art. 11')?.status).toBe('partial');
  });

  it('flags at least two documents', () => {
    expect(documents.filter((d) => d.assistantFlag).length).toBeGreaterThanOrEqual(2);
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

  it('has at least 12 quarantined items', () => {
    expect(quarantine.length).toBeGreaterThanOrEqual(12);
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

  it('has an audit using all five tracker states', () => {
    const states = new Set(audits[0]!.requests.map((r) => r.state));
    expect(states.size).toBe(5);
  });
});
