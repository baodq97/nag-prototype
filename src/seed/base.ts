import type {
  FrameworkItem,
  Integration,
  IntegrationLevelInfo,
  Person,
  ScenarioInfo,
  Tenant,
  TenantDeployment,
} from '../domain/types';
import { articleMap } from './articles';

/** The fixed "now" of the demo: Wednesday 30 September 2026, 10:00 in Berlin. */
export const NOW = '2026-09-30T08:00:00.000Z';

export const tenant: Tenant = {
  id: 'tenant-example-bank',
  name: 'Example Bank (demo tenant)',
  timeZone: 'Europe/Berlin',
  businessHours: { start: 9, end: 17 },
  quarantineTerminalDecision: 'reject',
  quarantineExpiryBusinessHours: 24,
};

export const people: Person[] = [
  { id: 'p-lena', name: 'Lena Hofmann', role: 'Compliance Lead' },
  { id: 'p-jonas', name: 'Jonas Becker', role: 'AI/ML Engineer' },
  { id: 'p-amira', name: 'Amira Khalil', role: 'Platform/SRE owner' },
  { id: 'p-tobias', name: 'Tobias Wagner', role: 'CEO' },
  { id: 'p-sofia', name: 'Sofia Richter', role: 'Data Protection Officer' },
  { id: 'p-marek', name: 'Marek Nowak', role: 'Security Engineer' },
  { id: 'p-clara', name: 'Clara Schulz', role: 'Risk Manager' },
  { id: 'p-david', name: 'David Okafor', role: 'Product Owner' },
];

/** The signed-in demo user. */
export const currentUserId = 'p-lena';

/** The one value onboarding, posture and the package screen read the tenant's depth from. */
export const tenantDeployment: TenantDeployment = { level: 'app-context', scenario: 'S1' };

export const integrationLevels: IntegrationLevelInfo[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    adds: 'A reverse proxy in front of the model endpoints',
    effort: 'Minutes',
  },
  {
    id: 'app-context',
    name: 'App context',
    adds: 'Adds lifecycle hooks inside the agent runtime',
    effort: 'Hours to days',
  },
  {
    id: 'evidence-grade',
    name: 'Evidence grade',
    adds: 'Adds the MCP inspector',
    effort: '1–2 weeks, plus months of evidence build-up',
  },
];

export const scenarios: ScenarioInfo[] = [
  {
    id: 'S1',
    name: 'Internal control',
    route: 'self-assessment',
    evidence: 'About 5 months',
  },
  {
    id: 'S2',
    name: 'Notified-body assessed',
    route: 'notified-body',
    evidence: 'About 14–24 months',
  },
];

const iso = (ref: string, title: string): FrameworkItem => ({
  id: `iso-${ref.toLowerCase()}`,
  framework: 'iso-42001',
  ref,
  title,
});

// Titles are short descriptions in our own words. Every row of the EU AI Act article map is
// a framework item, so controls, tests and the posture by framework can point at it.
export const frameworkItems: FrameworkItem[] = [
  ...articleMap.map((a) => ({
    id: a.id,
    framework: 'eu-ai-act' as const,
    ref: a.article,
    title: a.title,
  })),
  iso('4.1', 'Understanding the organisation'),
  iso('5.2', 'Setting an AI policy'),
  iso('6.1.2', 'Assessing AI risks'),
  iso('6.1.4', 'Assessing impact on people'),
  iso('7.5', 'Controlling documents and records'),
  iso('8.2', 'Running risk assessments'),
  iso('9.1', 'Monitoring and measuring'),
  iso('9.2', 'Auditing internally'),
  iso('10.2', 'Fixing nonconformities'),
  iso('A.2.2', 'Documented AI policy'),
  iso('A.3.2', 'Defined AI roles'),
  iso('A.5.2', 'Impact assessment process'),
  iso('A.6.2.4', 'Checking and validating models'),
  iso('A.6.2.6', 'Operating and watching AI systems'),
  iso('A.6.2.8', 'Recording events'),
  iso('A.7.4', 'Quality of data'),
  iso('A.8.2', 'Documentation for users'),
  iso('A.10.3', 'Working with suppliers'),
];

// Generic sources only; no real vendor, product or logo is named. Connection details, health and
// activity are demo data.

const at = (hhmm: string, daysAgo = 0) =>
  new Date(Date.parse(`2026-09-30T${hhmm}:00.000Z`) - daysAgo * 86_400_000).toISOString();

/** Five recent activity entries ending at the last heartbeat, newest first. */
function activity(last: string, texts: string[]) {
  return texts.map((text, i) => ({
    at: new Date(Date.parse(last) - i * 47 * 60_000).toISOString(),
    text,
  }));
}

const HEARTBEATS = [
  'Heartbeat received',
  'Configuration reloaded',
  'Heartbeat received',
  'Scope change applied',
  'Credentials verified',
];

const snippet = (id: string, extra: string) =>
  `nag:
  source: ${id}
  collector: https://collector.nag.example/v1
  key_id: ${id}-key  # issued in the console; never paste a secret here
${extra}`;

export const integrations: Integration[] = [
  {
    id: 'int-proxy',
    name: 'Reverse proxy gateway',
    kind: 'ai-gateway',
    description: 'Sits in front of model endpoints and applies policy bundles to every request.',
    capabilities: ['Request blocking', 'Latency budgets', 'Evidence capture'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:58:00.000Z',
    scope: [
      { id: 'credit', label: 'Credit scoring assistant', included: true, kind: 'endpoint' },
      { id: 'support', label: 'Customer support agent', included: true, kind: 'endpoint' },
      { id: 'sandbox', label: 'Internal sandbox', included: false, kind: 'endpoint' },
    ],
    worksWith: ['HTTP model endpoints', 'Streaming responses'],
    connection: {
      endpoint: 'gateway.example-bank.internal:8443',
      authMethod: 'Mutual TLS',
      keyId: 'int-proxy-key-07',
      lastRotatedAt: at('09:00', 33),
    },
    health: { eventsPerMinute: 412, errorRatePct: 0.2 },
    activity: activity('2026-09-30T07:58:00.000Z', [
      'Heartbeat received',
      'Policy bundle B-07 reloaded',
      'Heartbeat received',
      '3 requests blocked on /v1/credit-score',
      'Credentials verified',
    ]),
    snippet: snippet(
      'int-proxy',
      '  upstream: https://models.example-bank.internal\n  listen: 0.0.0.0:8443\n',
    ),
  },
  {
    id: 'int-hooks',
    name: 'Agent lifecycle hooks',
    kind: 'agent-hooks',
    description:
      'Hooks inside the agent runtime that report each call, its parent and its outcome. Python SDK.',
    capabilities: ['Lineage', 'Depth limit', 'Kill switch', 'Python'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:57:00.000Z',
    scope: [
      { id: 'orchestrator', label: 'Support orchestrator', included: true, kind: 'agent' },
      { id: 'research', label: 'Research agents', included: true, kind: 'agent' },
    ],
    worksWith: ['Python agent runtimes', 'Multi-agent orchestrators'],
    connection: {
      endpoint: 'agents.example-bank.internal',
      authMethod: 'Signed API key',
      keyId: 'int-hooks-key-03',
      lastRotatedAt: at('09:00', 61),
    },
    health: { eventsPerMinute: 138, errorRatePct: 0.4 },
    activity: activity('2026-09-30T07:57:00.000Z', HEARTBEATS),
    snippet: snippet('int-hooks', '  sdk: python\n  report: [call, parent, outcome]\n'),
  },
  {
    id: 'int-hooks-ts',
    name: 'Agent hooks for TypeScript',
    kind: 'agent-hooks',
    description: 'The lifecycle hooks for agents written in TypeScript or JavaScript.',
    capabilities: ['Lineage', 'Depth limit', 'TypeScript'],
    status: 'not-connected',
    scope: [{ id: 'web-agents', label: 'Web assistant agents', included: true, kind: 'agent' }],
    worksWith: ['Node.js agent runtimes', 'Serverless functions'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'Signed API key',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet('int-hooks-ts', '  sdk: typescript\n  report: [call, parent, outcome]\n'),
  },
  {
    id: 'int-hooks-java',
    name: 'Agent hooks for Java',
    kind: 'agent-hooks',
    description: 'The lifecycle hooks for agents running on the JVM.',
    capabilities: ['Lineage', 'Kill switch', 'Java'],
    status: 'not-connected',
    scope: [{ id: 'batch-agents', label: 'Batch review agents', included: true, kind: 'agent' }],
    worksWith: ['JVM agent runtimes', 'Batch jobs'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'Signed API key',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet('int-hooks-java', '  sdk: java\n  report: [call, parent, outcome]\n'),
  },
  {
    id: 'int-mcp',
    name: 'MCP inspector',
    kind: 'mcp-inspector',
    description: 'Watches tool calls between agents and MCP servers.',
    capabilities: ['Tool-call outcomes', 'Server allow-list', 'Lineage'],
    status: 'error',
    errorMessage: 'No heartbeat since 07:12 – inspector unreachable',
    lastSyncAt: '2026-09-30T05:12:00.000Z',
    scope: [
      { id: 'crm', label: 'CRM tool server', included: true, kind: 'mcp-server' },
      { id: 'payments', label: 'Payments tool server', included: true, kind: 'mcp-server' },
      { id: 'experimental', label: 'Experimental servers', included: false, kind: 'mcp-server' },
      { id: 'tool-lookup', label: 'Customer lookup tool', included: true, kind: 'tool' },
      { id: 'tool-refund', label: 'Refund tool', included: false, kind: 'tool' },
    ],
    worksWith: ['MCP servers', 'Agent tool calls'],
    connection: {
      endpoint: 'mcp-inspector.example-bank.internal:7443',
      authMethod: 'Mutual TLS',
      keyId: 'int-mcp-key-02',
      lastRotatedAt: at('09:00', 88),
    },
    health: { eventsPerMinute: 0, errorRatePct: 100 },
    activity: activity('2026-09-30T05:12:00.000Z', [
      'Last heartbeat received',
      'Tool call to payments server recorded',
      'Heartbeat received',
      'Tool call to CRM server recorded',
      'Heartbeat received',
    ]),
    failure: {
      what: 'The inspector stopped sending heartbeats, so tool-call outcomes are not recorded.',
      since: '2026-09-30T05:12:00.000Z',
      fixSteps: [
        'Check that the inspector process runs on the agent host.',
        'Confirm the host can reach the collector on port 7443.',
        'Restart the inspector and wait for the first heartbeat.',
        'Re-run the tests that depend on this source.',
      ],
    },
    snippet: snippet('int-mcp', '  watch: [tools/call, tools/list]\n  allow_list: required\n'),
  },
  {
    id: 'int-model',
    name: 'Model endpoint monitor',
    kind: 'model-endpoint',
    description: 'Reads responses from hosted model endpoints to check notices and output format.',
    capabilities: ['Response checks', 'AI interaction notice'],
    status: 'not-connected',
    scope: [
      { id: 'chat-model', label: 'Chat model endpoint', included: true, kind: 'endpoint' },
      { id: 'embed-model', label: 'Embedding endpoint', included: false, kind: 'endpoint' },
    ],
    worksWith: ['Hosted model APIs', 'Self-hosted inference servers'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'API key',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet('int-model', '  endpoints: [chat-model]\n'),
  },
  {
    id: 'int-idp',
    name: 'Identity provider',
    kind: 'identity',
    description: 'Supplies reviewer roles and the MFA step for sensitive actions.',
    capabilities: ['Reviewer roles', 'MFA (Stub)'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:30:00.000Z',
    scope: [
      { id: 'reviewers', label: 'Reviewer groups', included: true, kind: 'other' },
      { id: 'all-staff', label: 'All staff', included: false, kind: 'other' },
    ],
    worksWith: ['SAML or OIDC directories'],
    connection: {
      endpoint: 'login.example-bank.internal',
      authMethod: 'OIDC client credentials',
      keyId: 'int-idp-client-01',
      lastRotatedAt: at('09:00', 120),
    },
    health: { eventsPerMinute: 6, errorRatePct: 0 },
    activity: activity('2026-09-30T07:30:00.000Z', [
      'Group oversight-l1 synced',
      'Heartbeat received',
      'MFA challenge answered (stub)',
      'Heartbeat received',
      'Group oversight-l2 synced',
    ]),
    snippet: snippet('int-idp', '  protocol: oidc\n  groups: [oversight-l1, oversight-l2]\n'),
  },
  {
    id: 'int-ticket',
    name: 'Ticketing system',
    kind: 'ticketing',
    description: 'Keeps remediation tasks and review cycles in sync.',
    capabilities: ['Task sync', 'Review reminders'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:45:00.000Z',
    scope: [
      { id: 'compliance', label: 'Compliance project', included: true, kind: 'other' },
      { id: 'it', label: 'IT service desk', included: false, kind: 'other' },
    ],
    worksWith: ['Issue trackers', 'Service desks'],
    connection: {
      endpoint: 'tickets.example-bank.internal',
      authMethod: 'OAuth app',
      keyId: 'int-ticket-app-04',
      lastRotatedAt: at('09:00', 45),
    },
    health: { eventsPerMinute: 2, errorRatePct: 0 },
    activity: activity('2026-09-30T07:45:00.000Z', [
      'Task for TST-019 updated',
      'Heartbeat received',
      'Review reminder sent for DOC-07',
      'Heartbeat received',
      'Task for TST-009 closed',
    ]),
    snippet: snippet('int-ticket', '  project: compliance\n'),
  },
  {
    id: 'int-chat',
    name: 'Chat notifications',
    kind: 'chat',
    description: 'Posts quarantine alerts and reviewer rota changes to team chat channels.',
    capabilities: ['Reviewer alerts', 'Rota updates'],
    status: 'not-connected',
    scope: [{ id: 'oversight-channel', label: 'Oversight channel', included: true, kind: 'other' }],
    worksWith: ['Team chat workspaces', 'Incoming webhooks'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'Webhook signing secret',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet(
      'int-chat',
      '  channel: oversight\n  events: [quarantine.created, rota.changed]\n',
    ),
  },
  {
    id: 'int-kms',
    name: 'Key management',
    kind: 'key-management',
    description:
      "Holds the per-subject keys; destroying one makes that subject's content unreadable.",
    capabilities: ['Key destruction (Stub)', 'Rotation checks'],
    status: 'not-connected',
    scope: [{ id: 'subject-keys', label: 'Subject key ring', included: true, kind: 'other' }],
    worksWith: ['Cloud key services', 'Hardware security modules'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'Workload identity',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet('int-kms', '  key_ring: subject-keys\n'),
  },
  {
    id: 'int-archive',
    name: 'Evidence archive storage',
    kind: 'evidence-archive',
    description: 'Write-once storage that keeps evidence records for the retention period.',
    capabilities: ['Retention checks', 'Write-once buckets'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:52:00.000Z',
    scope: [
      { id: 'evidence-archive', label: 'Evidence archive bucket', included: true, kind: 'other' },
    ],
    worksWith: ['Object storage with retention locks'],
    connection: {
      endpoint: 's3-compatible://evidence-archive',
      authMethod: 'Workload identity',
      keyId: 'int-archive-role-01',
      lastRotatedAt: at('09:00', 20),
    },
    health: { eventsPerMinute: 27, errorRatePct: 0 },
    activity: activity('2026-09-30T07:52:00.000Z', [
      'Batch 13 archived',
      'Heartbeat received',
      'Retention lock verified',
      'Batch 12 archived',
      'Heartbeat received',
    ]),
    snippet: snippet('int-archive', '  bucket: evidence-archive\n  retention_days: 3650\n'),
  },
  {
    id: 'int-siem',
    name: 'Security event export',
    kind: 'security-export',
    description: 'Exports blocked requests and kill switch events to a security monitoring tool.',
    capabilities: ['Event export', 'Incident signals'],
    status: 'not-connected',
    scope: [{ id: 'blocked', label: 'Blocked request events', included: true, kind: 'other' }],
    worksWith: ['Syslog collectors', 'Security monitoring tools'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'Token',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet('int-siem', '  format: json\n  events: [blocked, kill_switch]\n'),
  },
  {
    id: 'int-tsa',
    name: 'Timestamp authority (stub)',
    kind: 'timestamp-authority',
    description:
      'Anchors each sealed batch with an independent timestamp. A stub in this prototype.',
    capabilities: ['Timestamp anchors (Stub)', 'Failover'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:56:00.000Z',
    scope: [{ id: 'batches', label: 'Sealed batches', included: true, kind: 'other' }],
    worksWith: ['RFC 3161 timestamp services'],
    connection: {
      endpoint: 'tsa-b.stub.invalid',
      authMethod: 'None (public service)',
      keyId: 'tsa-b-cert',
      lastRotatedAt: at('09:00', 200),
    },
    health: { eventsPerMinute: 1, errorRatePct: 0 },
    activity: activity('2026-09-30T07:56:00.000Z', [
      'Batch 13 anchored',
      'Batch 12 anchored',
      'Failover from authority A to B',
      'Batch 11 anchored',
      'Heartbeat received',
    ]),
    snippet: snippet('int-tsa', '  authorities: [tsa-a, tsa-b]\n'),
  },
  {
    id: 'int-cloud',
    name: 'Cloud platform',
    kind: 'cloud',
    description: 'Dataset checks, classifier measurements and documentation retention.',
    capabilities: ['Dataset checks', 'Retention checks'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:50:00.000Z',
    scope: [
      { id: 'prod', label: 'Production account', included: true, kind: 'other' },
      { id: 'dev', label: 'Development account', included: false, kind: 'other' },
    ],
    worksWith: ['Cloud accounts and projects'],
    connection: {
      endpoint: 'cloud-account: prod-eu',
      authMethod: 'Workload identity',
      keyId: 'int-cloud-role-02',
      lastRotatedAt: at('09:00', 75),
    },
    health: { eventsPerMinute: 14, errorRatePct: 0.1 },
    activity: activity('2026-09-30T07:50:00.000Z', HEARTBEATS),
    snippet: snippet('int-cloud', '  accounts: [prod]\n'),
  },
  {
    id: 'int-repo',
    name: 'Source repository',
    kind: 'source-repository',
    description: 'Model cards, documentation and change history.',
    capabilities: ['Model cards', 'Change history'],
    status: 'not-connected',
    scope: [{ id: 'ml', label: 'ML repositories', included: true, kind: 'other' }],
    worksWith: ['Git hosting'],
    connection: {
      endpoint: 'Not configured',
      authMethod: 'App installation',
      keyId: 'Not issued',
      lastRotatedAt: '',
    },
    activity: [],
    snippet: snippet('int-repo', '  repositories: [ml/*]\n'),
  },
];

/** Measured detection quality of the stub classifier, always shown with sample size and date. */
export const detectionQuality = { recall: 0.94, sampleSize: 1200, measuredOn: '2026-09-15' };

/** When the public trust page data was last refreshed. */
export const trustUpdatedAt = '2026-09-30T07:42:00.000Z';
