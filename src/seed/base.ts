import type { FrameworkItem, Integration, Person, Tenant } from '../domain/types';
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

// Generic sources only; no real vendor is named.
export const integrations: Integration[] = [
  {
    id: 'int-proxy',
    name: 'Reverse proxy gateway',
    kind: 'reverse-proxy',
    description: 'Sits in front of model endpoints and applies policy bundles to every request.',
    capabilities: ['Request blocking', 'Latency budgets', 'Evidence capture'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:58:00.000Z',
    scope: [
      { id: 'credit', label: 'Credit scoring assistant', included: true },
      { id: 'support', label: 'Customer support agent', included: true },
      { id: 'sandbox', label: 'Internal sandbox', included: false },
    ],
  },
  {
    id: 'int-hooks',
    name: 'Agent lifecycle hooks',
    kind: 'lifecycle-hooks',
    description:
      'Hooks inside the agent runtime that report each call, its parent and its outcome.',
    capabilities: ['Lineage', 'Depth limit', 'Kill switch'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:57:00.000Z',
    scope: [
      { id: 'orchestrator', label: 'Support orchestrator', included: true },
      { id: 'research', label: 'Research agents', included: true },
    ],
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
      { id: 'crm', label: 'CRM tool server', included: true },
      { id: 'payments', label: 'Payments tool server', included: true },
      { id: 'experimental', label: 'Experimental servers', included: false },
    ],
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
      { id: 'reviewers', label: 'Reviewer groups', included: true },
      { id: 'all-staff', label: 'All staff', included: false },
    ],
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
      { id: 'compliance', label: 'Compliance project', included: true },
      { id: 'it', label: 'IT service desk', included: false },
    ],
  },
  {
    id: 'int-cloud',
    name: 'Cloud platform',
    kind: 'cloud',
    description: 'Storage retention, key management (Stub) and dataset checks.',
    capabilities: ['Retention checks', 'Key management (Stub)', 'Dataset checks'],
    status: 'connected',
    lastSyncAt: '2026-09-30T07:50:00.000Z',
    scope: [
      { id: 'prod', label: 'Production account', included: true },
      { id: 'dev', label: 'Development account', included: false },
    ],
  },
  {
    id: 'int-repo',
    name: 'Source repository',
    kind: 'source-control',
    description: 'Model cards, documentation and change history.',
    capabilities: ['Model cards', 'Change history'],
    status: 'not-connected',
    scope: [{ id: 'ml', label: 'ML repositories', included: true }],
  },
];

/** Measured detection quality of the stub classifier, always shown with sample size and date. */
export const detectionQuality = { recall: 0.94, sampleSize: 1200, measuredOn: '2026-09-15' };

/** When the public trust page data was last refreshed. */
export const trustUpdatedAt = '2026-09-30T07:42:00.000Z';
