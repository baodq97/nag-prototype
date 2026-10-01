// Seeded runtime behaviour. No runtime is connected; every value below is demo data.

import { bandFor } from '../domain/classifier';
import type {
  CircuitBreaker,
  ClassifierConfig,
  CodeId,
  ErasureRequest,
  EvidenceRecord,
  Failover,
  FallbackMode,
  LatencyProfile,
  LedgerSchedule,
  LineageNode,
  LineageTrace,
  McpSession,
  PipelineStage,
  PolicyBundle,
  PrivacyEndpoint,
  QuarantineItem,
  TimestampAuthority,
  ToolCall,
} from '../domain/types';
import { NOW, tenant } from './base';
import { fakeHash, pick, rng } from './prng';

const random = rng(4242);

/** The sequence number missing from the evidence chain, to show a detected gap. */
export const MISSING_SEQ = 137;
const LAST_SEQ = 211;
const BATCH_SIZE = 16;

// Seven entries, drawn once per record: the draw count fixes every subject id after it.
const RECORD_CODES: CodeId[] = [
  'NAG-D001',
  'NAG-D001',
  'NAG-D001',
  'NAG-D002',
  'NAG-D003',
  'NAG-D001',
  'NAG-D005',
];

/** Timestamp authorities (stubs with generic names); B took over from A in the night. */
export const timestampAuthorities: TimestampAuthority[] = [
  { id: 'tsa-a', name: 'Timestamp authority A (stub)', role: 'standby' },
  { id: 'tsa-b', name: 'Timestamp authority B (stub)', role: 'active' },
];

/** Falls between the anchors of Merkle batches 7 and 8, so no batch has two authorities. */
export const lastFailover: Failover = {
  at: '2026-09-30T03:20:00.000Z',
  fromId: 'tsa-a',
  toId: 'tsa-b',
  reason: 'Authority A timed out on three anchoring requests in a row',
};

const authorityAt = (anchoredAt: string) =>
  timestampAuthorities.find(
    (a) => a.id === (anchoredAt < lastFailover.at ? lastFailover.fromId : lastFailover.toId),
  )!.name;

/** The weekly full verification of the ledger, in tenant time. */
export const ledgerSchedule: LedgerSchedule = {
  name: 'Weekly full verification',
  weekday: 3,
  hour: 8,
  minute: 0,
};

const ENDPOINTS = [
  '/v1/credit-score',
  '/v1/support-chat',
  '/v1/document-summary',
  '/v1/agent-tools',
];

function buildEvidence(): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  let prevHash = '0'.repeat(64);
  let index = 0;
  for (let seq = 1; seq <= LAST_SEQ; seq++) {
    const timestamp = new Date(Date.parse(NOW) - (LAST_SEQ - seq) * 173_000).toISOString();
    const hash = fakeHash(`record:${seq}:${prevHash}`);
    if (seq === MISSING_SEQ) {
      // The record was written to the chain but is missing from the store.
      prevHash = hash;
      continue;
    }
    const batchId = Math.floor(index / BATCH_SIZE) + 1;
    const anchoredAt = new Date(Date.parse(timestamp) + 240_000).toISOString();
    records.push({
      seq,
      timestamp,
      tenantId: tenant.id,
      code: pick(random, RECORD_CODES),
      endpoint: pick(random, ENDPOINTS),
      subjectId: `subj-${String(1 + Math.floor(random() * 40)).padStart(4, '0')}`,
      digest: `hmac-sha256:${fakeHash(`content:${seq}`)}`,
      prevHash,
      hash,
      leafIndex: index % BATCH_SIZE,
      batchId,
      merkleRoot: fakeHash(`batch:${batchId}`),
      anchor: {
        provider: authorityAt(anchoredAt),
        token: `tsa-${fakeHash(`anchor:${batchId}`).slice(0, 24)}`,
        anchoredAt,
      },
    });
    prevHash = hash;
    index += 1;
  }
  return records;
}

export const evidence: EvidenceRecord[] = buildEvidence();

/** Subjects the erasure demo uses: one with records next to the gap, one whose ranges all verify. */
export const ERASURE_SUBJECTS = { withGap: 'subj-0007', clean: 'subj-0011' };

/** Erasure requests received before the session; none is completed yet. */
export const erasureRequests: ErasureRequest[] = [
  { id: 'ER-0101', subjectId: 'subj-0021', receivedAt: '2026-09-21T07:12:00.000Z', state: 'open' },
  { id: 'ER-0102', subjectId: 'subj-0029', receivedAt: '2026-09-24T13:40:00.000Z', state: 'open' },
  { id: 'ER-0103', subjectId: 'subj-0003', receivedAt: '2026-09-25T09:05:00.000Z', state: 'open' },
  { id: 'ER-0104', subjectId: 'subj-0017', receivedAt: '2026-09-30T06:45:00.000Z', state: 'open' },
];

// [id, name, budget, p50, p95, p99, breaches in 24 h, breaches in 7 days]. Seeded, not measured.
const STAGES: [string, string, number, number, number, number, number, number][] = [
  ['ingress', 'Ingress and tenant lookup', 5, 1, 3, 4, 0, 0],
  ['class-a', 'Class A checks (blocking)', 30, 9, 21, 27, 0, 2],
  ['class-b', 'Class B checks', 45, 14, 38, 52, 3, 17],
  ['class-c', 'Class C checks', 120, 41, 96, 138, 6, 29],
  ['evidence', 'Evidence write', 10, 2, 6, 9, 0, 1],
];

export const pipelineStages: PipelineStage[] = STAGES.map(
  ([id, name, budgetMs, p50Ms, p95Ms, p99Ms, breaches24h, breaches7d]) => ({
    id,
    name,
    budgetMs,
    p50Ms,
    p95Ms,
    p99Ms,
    breaches24h,
    breaches7d,
  }),
);

/** The customer-side circuit breaker (stub): closed again after a short trip this morning. */
export const circuitBreaker: CircuitBreaker = {
  state: 'closed',
  tripFailures: 5,
  windowSeconds: 30,
  lastTransition: { at: '2026-09-30T06:42:00.000Z', from: 'half-open', to: 'closed' },
};

/** The tenant's configured behaviour when NAG cannot be reached. */
export const defaultFallbackMode: FallbackMode = 'hard-stop';

// Received times spread across business hours, a weekend and older items, relative to NOW
// (Wednesday 30 September 2026, 10:00 Berlin).
const QUARANTINE: [string, number, string][] = [
  ['2026-09-30T07:55:00.000Z', 0.91, 'Possible personal data in a credit explanation'],
  ['2026-09-30T07:30:00.000Z', 0.64, 'Unverified claim about a loan condition'],
  ['2026-09-30T06:00:00.000Z', 0.58, 'Tone check flagged a support answer'],
  ['2026-09-29T14:30:00.000Z', 0.77, 'Advice that may read as a credit decision'],
  ['2026-09-29T13:00:00.000Z', 0.88, 'Tool call result with account numbers'],
  ['2026-09-29T12:00:00.000Z', 0.69, 'Summary leaves out a risk warning'],
  ['2026-09-29T11:00:00.000Z', 0.52, 'Low-confidence translation of terms'],
  ['2026-09-29T09:00:00.000Z', 0.95, 'Answer refers to a protected characteristic'],
  ['2026-09-29T07:00:00.000Z', 0.73, 'Agent proposed a refund above its limit'],
  ['2026-09-28T12:00:00.000Z', 0.61, 'Unclear source for an interest-rate figure'],
  ['2026-09-26T10:00:00.000Z', 0.86, 'Prompt-injection pattern in a tool result'],
  ['2026-09-25T14:00:00.000Z', 0.67, 'Draft letter without the required notice'],
  ['2026-09-24T08:00:00.000Z', 0.82, 'Possible profiling of a customer group'],
  ['2026-09-23T10:00:00.000Z', 0.55, 'Answer cites an outdated policy version'],
];

/** The scoring classifier (stub). Routing describes the band only; escalation is the same for all. */
export const classifierConfig: ClassifierConfig = {
  modelVersion: 'quarantine-scorer 0.9.2',
  releaseThreshold: 0.5,
  bands: [
    { band: 'low', min: 0.5, routing: 'Held for a reviewer; the flag is most likely harmless.' },
    {
      band: 'medium',
      min: 0.6,
      routing: 'Held for a reviewer; the flag may point to a real issue.',
    },
    { band: 'high', min: 0.85, routing: 'Held for a reviewer; the flag is likely a real issue.' },
  ],
  belowRelease: 'Released without review; the score stays on the evidence record.',
};

export const quarantine: QuarantineItem[] = QUARANTINE.map(([receivedAt, score, summary], i) => {
  const band = bandFor(score, classifierConfig);
  if (!band) throw new Error(`Seeded item ${i} scores below the release threshold`);
  return {
    id: `Q-${String(1041 + i)}`,
    receivedAt,
    endpoint: ENDPOINTS[i % 3]!,
    policyBundleId: ['PB-09', 'PB-11', 'PB-12'][i % 3]!,
    score,
    band,
    summary,
  };
});

export const traces: LineageTrace[] = [
  {
    id: 'TR-7f3a',
    name: 'Customer support agent with MCP tools',
    description: 'An orchestrator calls a model, a sub-agent and five MCP tools.',
  },
  {
    id: 'TR-91c2',
    name: 'Research chain at the depth limit',
    description: 'Agents delegate down to depth 10, the deepest call allowed.',
  },
  {
    id: 'TR-b604',
    name: 'Runaway delegation stopped at depth 11',
    description: 'A chain tries to go one level deeper than allowed and is rejected.',
  },
];

function node(
  traceId: string,
  id: string,
  parentId: string | null,
  kind: LineageNode['kind'],
  label: string,
  outcome: LineageNode['outcome'],
  offsetMs: number,
): LineageNode {
  return {
    id,
    traceId,
    parentId,
    kind,
    label,
    outcome,
    startedAt: new Date(Date.parse(NOW) - 3_600_000 + offsetMs).toISOString(),
    durationMs: 120 + Math.floor(random() * 900),
  };
}

function chain(traceId: string, length: number, prefix: string): LineageNode[] {
  return Array.from({ length }, (_, i) =>
    node(
      traceId,
      `${prefix}-${i + 1}`,
      i === 0 ? null : `${prefix}-${i}`,
      i === 0 ? 'agent' : i % 3 === 0 ? 'llm' : 'agent',
      i === 0 ? 'planner' : `delegate-${i + 1}`,
      'success',
      i * 400,
    ),
  );
}

export const lineage: LineageNode[] = [
  node('TR-7f3a', 'a1', null, 'agent', 'support-orchestrator', 'success', 0),
  node('TR-7f3a', 'a2', 'a1', 'llm', 'draft answer', 'success', 300),
  node('TR-7f3a', 'a3', 'a1', 'mcp-tool', 'crm.lookup_customer', 'success', 500),
  node('TR-7f3a', 'a4', 'a1', 'mcp-tool', 'kb.search', 'success', 700),
  node('TR-7f3a', 'a5', 'a1', 'agent', 'billing-agent', 'success', 900),
  node('TR-7f3a', 'a6', 'a5', 'mcp-tool', 'invoice.fetch', 'success', 1100),
  node('TR-7f3a', 'a7', 'a5', 'mcp-tool', 'payments.refund', 'cancelled', 1300),
  node('TR-7f3a', 'a8', 'a1', 'mcp-tool', 'ticket.create', 'error', 1500),
  node('TR-7f3a', 'a9', 'a1', 'mcp-tool', 'email.send', 'abandoned', 1700),
  ...chain('TR-91c2', 10, 'b'),
  ...chain('TR-b604', 10, 'c'),
  node(
    'TR-b604',
    'c-11',
    'c-10',
    'rejected',
    'delegate-11 (rejected: depth 11 > 10)',
    'error',
    4400,
  ),
];

// MCP sessions the inspector saw before it lost its heartbeat (05:12 UTC). The refund session
// was cut off when a refund above the agent's limit was blocked.
export const mcpSessions: McpSession[] = [
  {
    id: 'MCP-S-301',
    client: 'support-orchestrator',
    serverId: 'crm',
    startedAt: '2026-09-30T04:02:10.000Z',
    lastActivityAt: '2026-09-30T04:09:02.451Z',
    state: 'closed',
  },
  {
    id: 'MCP-S-302',
    client: 'billing-agent',
    serverId: 'payments',
    startedAt: '2026-09-30T04:31:00.000Z',
    lastActivityAt: '2026-09-30T04:38:12.035Z',
    state: 'terminated',
  },
  {
    id: 'MCP-S-303',
    client: 'support-orchestrator',
    serverId: 'crm',
    startedAt: '2026-09-30T04:58:00.000Z',
    lastActivityAt: '2026-09-30T05:08:16.210Z',
    state: 'open',
  },
];

// [session, tool, code, outcome, started at, duration in ms].
const CALLS: [string, string, CodeId, ToolCall['outcome'], string, number][] = [
  ['MCP-S-301', 'crm.lookup_customer', 'NAG-D001', 'success', '2026-09-30T04:02:11.000Z', 412],
  ['MCP-S-301', 'crm.lookup_customer', 'NAG-D001', 'success', '2026-09-30T04:05:40.000Z', 388],
  ['MCP-S-301', 'crm.lookup_customer', 'NAG-D001', 'success', '2026-09-30T04:09:02.000Z', 451],
  ['MCP-S-302', 'invoice.fetch', 'NAG-D001', 'success', '2026-09-30T04:31:01.000Z', 296],
  ['MCP-S-302', 'invoice.fetch', 'NAG-D001', 'success', '2026-09-30T04:33:20.000Z', 310],
  ['MCP-S-302', 'payments.refund', 'NAG-D001', 'success', '2026-09-30T04:36:45.000Z', 742],
  ['MCP-S-302', 'payments.refund', 'NAG-D002', 'cancelled', '2026-09-30T04:38:12.000Z', 35],
  ['MCP-S-303', 'crm.lookup_customer', 'NAG-D001', 'success', '2026-09-30T04:58:01.000Z', 402],
  ['MCP-S-303', 'crm.lookup_customer', 'NAG-D001', 'success', '2026-09-30T05:03:30.000Z', 377],
  ['MCP-S-303', 'crm.lookup_customer', 'NAG-D001', 'error', '2026-09-30T05:08:15.000Z', 1210],
];

export const toolCalls: ToolCall[] = CALLS.map(
  ([sessionId, tool, code, outcome, startedAt, durationMs], i) => ({
    id: `call-${String(i + 1).padStart(2, '0')}`,
    sessionId,
    tool,
    code,
    outcome,
    startedAt,
    durationMs,
  }),
);

const ART5 = [
  'Manipulative or deceptive techniques',
  'Exploiting vulnerable groups',
  'Social scoring',
  'Crime prediction from profiling alone',
  'Untargeted scraping of facial images',
  'Emotion recognition at work or school',
  'Biometric categorisation of sensitive traits',
  'Real-time remote biometric identification',
];

export const policyBundles: PolicyBundle[] = [
  ...ART5.map((name, i): PolicyBundle => ({
    id: `PB-0${i + 1}`,
    name,
    description: 'Blocks requests that fall under this prohibited practice.',
    article5: true,
    class: 'A',
    budgetMs: 15 + i * 2,
    breach: 'fail-closed',
    version: `1.${i % 3}.0`,
  })),
  {
    id: 'PB-09',
    name: 'Personal data redaction',
    description: 'Masks personal data in model output before it leaves the gateway.',
    article5: false,
    class: 'B',
    budgetMs: 40,
    breach: 'quarantine',
    version: '2.3.1',
  },
  {
    id: 'PB-10',
    name: 'Prompt-injection screen',
    description: 'Screens prompts and tool results for injection patterns.',
    article5: false,
    class: 'A',
    budgetMs: 25,
    breach: 'fail-closed',
    version: '3.0.0',
  },
  {
    id: 'PB-11',
    name: 'Credit decision explanation check',
    description: 'Checks that credit answers carry a reason and a route to a person.',
    article5: false,
    class: 'C',
    budgetMs: 120,
    breach: 'quarantine',
    version: '1.4.2',
  },
  {
    id: 'PB-12',
    name: 'Tone and wording filter',
    description: 'Flags support answers whose tone breaks the house style.',
    article5: false,
    class: 'B',
    budgetMs: 30,
    breach: 'fail-open',
    version: '1.1.0',
  },
  {
    id: 'PB-13',
    name: 'Legacy keyword list',
    description: 'An old keyword list imported without a class or a budget.',
    article5: false,
    breach: 'fail-open',
    version: '0.3.0',
  },
];

export const latencyProfiles: LatencyProfile[] = [
  { id: 'lite', name: 'Lite profile', budgetMs: 30 },
  { id: 'full', name: 'Full profile', budgetMs: 150 },
];

export const privacyEndpoints: PrivacyEndpoint[] = [
  {
    id: 'ep-credit',
    name: 'Credit scoring assistant',
    path: '/v1/credit-score',
    contentLogging: false,
  },
  {
    id: 'ep-support',
    name: 'Customer support agent',
    path: '/v1/support-chat',
    contentLogging: false,
  },
  {
    id: 'ep-summary',
    name: 'Document summariser',
    path: '/v1/document-summary',
    contentLogging: false,
  },
  { id: 'ep-tools', name: 'Agent tool gateway', path: '/v1/agent-tools', contentLogging: false },
  { id: 'ep-sandbox', name: 'Internal sandbox', path: '/v1/sandbox', contentLogging: true },
];
