// Holds the numbers and statuses the screens show together: every figure below is read
// through the selector layer, so a screen that shows it cannot disagree with another one.

import { describe, expect, it } from 'vitest';
import { countStates, staleRecords } from '../screens/auditor/states';
import { appliesTo, coverageStatus } from '../domain/aiact';
import { classify } from '../domain/classification';
import { erasureSummary } from '../domain/erasure';
import { daysUntil } from '../domain/time';
import {
  ERASURE_SUBJECTS,
  NOW,
  aiSystems,
  articleRows,
  audits,
  controlStatus,
  controls,
  documentReview,
  documents,
  erasureFor,
  evidence,
  getControl,
  getDocument,
  getPolicy,
  getSystem,
  getTest,
  policies,
  policyRenewal,
  postureSummary,
  reviewCounts,
  rowsForSystem,
  runtimeHealth,
  searchIndex,
  tenant,
  tests,
  trustEntries,
  verification,
} from './index';

const allEntries = () => trustEntries().flatMap((c) => c.entries);
const entry = (name: string) => {
  const found = allEntries().find((e) => e.name === name);
  if (!found) throw new Error(`No trust entry named ${name}`);
  return found;
};

describe('erasure and verification agree', () => {
  const gap = erasureFor(ERASURE_SUBJECTS.withGap);

  it('reports the failing range with the gap at seq 137 for the gap subject', () => {
    const failing = gap.ranges.filter((r) => !r.ok);
    expect(gap.allVerify).toBe(false);
    expect(failing.map((r) => [r.fromSeq, r.toSeq])).toEqual([[101, 150]]);
    const l1 = failing[0]!.layers.find((l) => l.layer === 'L1')!;
    expect(l1.ok).toBe(false);
    expect(l1.message).toContain('seq 137');
  });

  it('never claims that all layers verify when a range fails, and says the failure pre-existed', () => {
    const text = erasureSummary(gap);
    expect(text).not.toContain('all 3 layers still verify');
    expect(text).toContain('101–150');
    expect(text).toContain('already there before the erasure');
  });

  it('reports exactly the layers verification() reports for each range it names', () => {
    for (const subject of [ERASURE_SUBJECTS.withGap, ERASURE_SUBJECTS.clean]) {
      for (const range of erasureFor(subject).ranges) {
        const same = verification().find(
          (v) => v.fromSeq === range.fromSeq && v.toSeq === range.toSeq,
        );
        expect(same, `range ${range.fromSeq}–${range.toSeq}`).toBeDefined();
        expect(range.ok).toBe(same!.ok);
        expect(range.layers).toEqual(same!.layers);
      }
    }
  });

  it('counts the subject records and only names ranges that hold one', () => {
    for (const subject of [ERASURE_SUBJECTS.withGap, ERASURE_SUBJECTS.clean]) {
      const e = erasureFor(subject);
      const seqs = evidence.filter((r) => r.subjectId === subject).map((r) => r.seq);
      expect(e.records).toBe(seqs.length);
      expect(e.ranges.reduce((n, r) => n + r.records, 0)).toBe(seqs.length);
    }
  });

  it('lets every layer of every range verify for the clean subject', () => {
    const clean = erasureFor(ERASURE_SUBJECTS.clean);
    expect(clean.ranges.length).toBeGreaterThan(0);
    expect(clean.allVerify).toBe(true);
    expect(clean.ranges.every((r) => r.ok && r.layers.every((l) => l.ok))).toBe(true);
    expect(erasureSummary(clean)).toContain('all 3 layers still verify');
  });
});

describe('trust claims', () => {
  it('has at least one reference on every entry', () => {
    for (const e of allEntries()) expect(e.refs.length, e.name).toBeGreaterThanOrEqual(1);
  });

  // "In progress" is checked too: the planned flag must not hide a failing reference.
  it('is never in place or in progress while something behind it fails', () => {
    const verificationFails = verification().some((r) => !r.ok);
    const holds = (name: string, kind: 'document' | 'policy', id: string) => {
      if (kind === 'document') {
        const doc = getDocument(id);
        expect(doc?.status, `${name}: ${id}`).toBe('approved');
        expect(documentReview(doc!), `${name}: ${id}`).toBe('current');
      } else {
        const policy = getPolicy(id);
        expect(policy?.status, `${name}: ${id}`).toBe('approved');
        expect(policyRenewal(policy!), `${name}: ${id}`).toBe('current');
      }
    };
    const checked = allEntries().filter((x) => x.status !== 'under-remediation');
    expect(checked.some((x) => x.planned)).toBe(true);
    for (const e of checked) {
      for (const ref of e.refs) {
        if (ref.kind === 'control') {
          const control = getControl(ref.id);
          expect(control, `${e.name}: ${ref.id}`).toBeDefined();
          expect(controlStatus(control!).ok, `${e.name}: ${ref.id}`).toBe(true);
          for (const id of control!.documentIds) holds(e.name, 'document', id);
          for (const id of control!.policyIds) holds(e.name, 'policy', id);
        } else if (ref.kind === 'verification') {
          expect(verificationFails, `${e.name}: verification`).toBe(false);
        } else {
          holds(e.name, ref.kind, ref.id);
        }
      }
    }
  });

  it('shows the seeded failing claims as not in place', () => {
    for (const name of [
      'Human review of uncertain output',
      'Prompt-injection screening',
      'Tamper-evident records with three integrity layers',
      'AI policy approved by leadership',
      'MCP server allow-list',
      'Independent timestamp anchoring',
      'Emergency stop with dual approval to resume',
    ]) {
      expect(entry(name).status, name).not.toBe('in-place');
      expect(entry(name).status, name).toBe('under-remediation');
    }
  });
});

describe('article map and AI systems', () => {
  const controlsOk = (ids: string[]) => ids.map((id) => controlStatus(getControl(id)!).ok);

  it('derives every row status from the live controls and tests', () => {
    for (const row of articleRows()) {
      const expected = coverageStatus(row.nagRole, controlsOk(row.controlIds), row.testIds.length);
      expect(row.status, row.id).toBe(expected);
      const mapped = controls.filter((c) => c.frameworkItemIds.includes(row.id)).map((c) => c.id);
      expect(row.controlIds, row.id).toEqual(mapped);
      const mappedTests = tests.filter((t) => t.frameworkItemIds.includes(row.id)).map((t) => t.id);
      expect(row.testIds, row.id).toEqual(mappedTests);
    }
  });

  it('keeps the outside-scope and NAG-is-the-control sets', () => {
    const ids = (role: string) =>
      articleRows()
        .filter((r) => r.nagRole === role)
        .map((r) => r.id);
    expect(ids('outside')).toEqual(['aia-22', 'aia-48', 'aia-26-7']);
    for (const r of articleRows().filter((x) => x.nagRole === 'outside')) {
      expect([r.controlIds, r.testIds, r.status], r.id).toEqual([[], [], 'outside']);
    }
    expect(ids('control').sort()).toEqual(
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
    for (const r of articleRows().filter((x) => x.nagRole === 'control')) {
      expect(r.controlIds.length, r.id).toBeGreaterThan(0);
      expect(r.testIds.length, r.id).toBeGreaterThan(0);
    }
  });

  it('links only controls and tests that exist', () => {
    for (const row of articleRows()) {
      for (const id of row.controlIds) expect(getControl(id), `${row.id}: ${id}`).toBeDefined();
      for (const id of row.testIds) expect(getTest(id), `${row.id}: ${id}`).toBeDefined();
    }
  });

  it('never shows a row as covered while a linked control fails', () => {
    for (const row of articleRows()) {
      if (controlsOk(row.controlIds).some((ok) => !ok)) {
        expect(row.status, row.id).not.toBe('covered');
      }
    }
    const humanReview = allEntries().find((e) => e.name === 'Human review of uncertain output');
    expect(humanReview?.status).toBe('under-remediation');
    expect(articleRows().find((r) => r.id === 'aia-14')?.status).toBe('needs-attention');
  });

  it('says on every row that needs attention which linked control and test fail', () => {
    for (const row of articleRows()) {
      expect(Boolean(row.attention), row.id).toBe(row.status === 'needs-attention');
      if (!row.attention) continue;
      const { controlId, testId } = row.attention;
      expect(row.controlIds, row.id).toContain(controlId);
      expect(controlStatus(getControl(controlId)!).ok, row.id).toBe(false);
      expect(getControl(controlId)!.testIds, row.id).toContain(testId);
      expect(getTest(testId)?.status, row.id).toBe('failing');
    }
  });

  it('shows each system the risk tier and role its answers give', () => {
    for (const s of aiSystems()) {
      expect(s.classification, s.id).toEqual(classify(s.answers, s.roleAnswers));
    }
    const summary = aiSystems().map((s) => [
      s.id,
      s.classification.riskTier,
      s.classification.roles,
    ]);
    expect(summary).toEqual([
      ['sys-credit', 'high', ['provider', 'deployer']],
      ['sys-support', 'transparency', ['provider', 'deployer']],
      ['sys-router', 'minimal', ['deployer']],
    ]);
  });

  it('lists for each system exactly the rows that apply to it', () => {
    for (const s of aiSystems()) {
      const expected = articleRows().filter((r) => appliesTo(r, s.classification));
      expect(
        rowsForSystem(s.id).map((r) => r.id),
        s.id,
      ).toEqual(expected.map((r) => r.id));
    }
    const ids = (id: string) => rowsForSystem(id).map((r) => r.id);
    expect(ids('sys-router')).toContain('aia-4');
    expect(ids('sys-support')).toContain('aia-50-1');
    for (const id of [
      'aia-12',
      'aia-14',
      'aia-19',
      'aia-20',
      'aia-26-5',
      'aia-26-6',
      'aia-72',
      'aia-73',
      'aia-86',
    ]) {
      expect(ids('sys-credit'), id).toContain(id);
    }
    expect(rowsForSystem('sys-unknown')).toEqual([]);
    expect(getSystem('sys-credit')?.endpoint).toBe('/v1/credit-score');
  });
});

describe('review state', () => {
  const daysLeft = (date: string) => daysUntil(date, NOW, tenant.timeZone);

  it('follows the review and renewal dates of every approved item', () => {
    for (const d of documents) {
      const expected =
        d.status === 'approved' && daysLeft(d.nextReview) < 0 ? 'review-overdue' : 'current';
      expect(documentReview(d), d.id).toBe(expected);
    }
    for (const p of policies) {
      const expected =
        p.status === 'approved' && daysLeft(p.renewalDate) < 0 ? 'renewal-expired' : 'current';
      expect(policyRenewal(p), p.id).toBe(expected);
    }
  });

  it('counts what the states say', () => {
    expect(reviewCounts()).toEqual({
      documentsOverdue: documents.filter((d) => documentReview(d) === 'review-overdue').length,
      policiesExpired: policies.filter((p) => policyRenewal(p) === 'renewal-expired').length,
    });
  });

  it('marks the seeded items that are past their date', () => {
    expect(policyRenewal(getPolicy('POL-01')!)).toBe('renewal-expired');
    for (const id of ['DOC-04', 'DOC-08', 'DOC-12']) {
      expect(documentReview(getDocument(id)!), id).toBe('review-overdue');
    }
  });

  it('keeps the overdue items findable in the command search', () => {
    const find = (kind: string, id: string) =>
      searchIndex.find((s) => s.kind === kind && s.id === id);
    expect(find('policy', 'POL-01')).toBeDefined();
    for (const id of ['DOC-04', 'DOC-08', 'DOC-12']) expect(find('document', id), id).toBeDefined();
  });
});

describe('screen numbers', () => {
  it('derives the posture figures from the tests', () => {
    const passing = tests.filter((t) => t.status === 'passing').length;
    const summary = postureSummary();
    expect(summary.total).toBe(tests.length);
    expect(summary.passing).toBe(passing);
    expect(summary.passingPct).toBe(Math.round((passing / tests.length) * 100));

    const failing = tests.length - passing;
    const { overdue, 'due-soon': dueSoon, 'needs-remediation': needs } = summary.attention;
    expect(overdue + dueSoon + needs).toBe(failing);
  });

  it('points every coverage row at tests and controls that exist', () => {
    const testIds = new Set(tests.map((t) => t.id));
    expect(articleRows().length).toBeGreaterThan(0);
    for (const row of articleRows()) {
      for (const id of row.testIds) expect(testIds.has(id), `${row.article}: ${id}`).toBe(true);
      for (const id of row.controlIds) {
        expect(getControl(id), `${row.article}: ${id}`).toBeDefined();
      }
    }
  });

  it('splits every audit into states that add up to its requests', () => {
    for (const audit of audits) {
      const counts = countStates(audit);
      const sum = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(sum, audit.id).toBe(audit.requests.length);
    }
  });

  it('lists in the auditor view the same stale items the review selectors find', () => {
    const shown = [...staleRecords('eu-ai-act'), ...staleRecords('iso-42001')];
    for (const r of shown) {
      const state =
        r.kind === 'Document'
          ? documentReview(getDocument(r.id)!)
          : policyRenewal(getPolicy(r.id)!);
      expect(r.state, r.id).toBe(state);
    }
    const ids = new Set(shown.map((r) => r.id));
    const counts = reviewCounts();
    expect(ids.size).toBe(counts.documentsOverdue + counts.policiesExpired);
  });

  it('splits the trust entries into the three statuses without remainder', () => {
    const entries = allEntries();
    const by = (s: string) => entries.filter((e) => e.status === s).length;
    expect(by('in-place') + by('under-remediation') + by('in-progress')).toBe(entries.length);
  });

  it('sums the runtime breach totals from the stage counters', () => {
    const health = runtimeHealth();
    expect(health.totals.last24h).toBe(health.stages.reduce((n, s) => n + s.breaches24h, 0));
    expect(health.totals.last7d).toBe(health.stages.reduce((n, s) => n + s.breaches7d, 0));
  });

  it('marks a percentile over budget exactly when it is above the stage budget', () => {
    for (const s of runtimeHealth().stages) {
      const over = (['p50', 'p95', 'p99'] as const).filter((p) => s[`${p}Ms`] > s.budgetMs);
      expect(s.over, s.id).toEqual(over);
    }
    const byId = Object.fromEntries(runtimeHealth().stages.map((s) => [s.id, s.over]));
    expect(byId['class-b']).toContain('p99');
    expect(byId['class-c']).toContain('p99');
    expect(byId['ingress']).toEqual([]);
  });
});
