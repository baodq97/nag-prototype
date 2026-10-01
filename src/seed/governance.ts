import { addDays } from '../domain/time';
import type {
  ApprovalStep,
  Audit,
  DeclarationElement,
  PackageSection,
  QmsTemplate,
  Risk,
  Task,
  TrustCategory,
} from '../domain/types';
import { NOW } from './base';

const both: PackageSection['routes'] = ['self-assessment', 'notified-body'];

// [group, title, source, state, href]. Titles are short descriptions in our own words; a
// missing element links to the screen where its input is maintained.
const ELEMENTS: [
  DeclarationElement['group'],
  string,
  DeclarationElement['source'],
  DeclarationElement['state'],
  string?,
][] = [
  ['declaration', 'Name, type and version of the AI system', 'runtime', 'complete'],
  ['declaration', 'Name and address of the provider', 'customer', 'complete'],
  [
    'declaration',
    'Note that the provider alone answers for the declaration',
    'template',
    'complete',
  ],
  ['declaration', 'Statement that the system meets the requirements', 'template', 'complete'],
  [
    'declaration',
    'Statement on the processing of personal data',
    'customer',
    'missing',
    '/policies?open=POL-05',
  ],
  [
    'declaration',
    'Standards and specifications the provider applied',
    'customer',
    'missing',
    '/documents?open=DOC-01',
  ],
  ['declaration', 'Assessment route followed', 'template', 'complete'],
  ['declaration', 'Place and date of issue', 'customer', 'missing', '/controls?open=CTL-22'],
  [
    'declaration',
    'Name and role of the person who signs',
    'customer',
    'missing',
    '/controls?open=CTL-22',
  ],
  ['deployer', 'Intended use and operating context at the deployer', 'customer', 'complete'],
  ['deployer', 'Human oversight set-up at the deployer', 'runtime', 'complete'],
  [
    'deployer',
    'Instructions for use handed to the deployer',
    'template',
    'missing',
    '/documents?open=DOC-02',
  ],
  ['supplier', 'Supplier attestation', 'customer', 'missing', '/documents?open=DOC-11'],
  ['supplier', 'Component list', 'runtime', 'complete'],
];

/** What the conformity package needs: the declaration, the deployer agreement and supplier inputs. */
export const declarationElements: DeclarationElement[] = ELEMENTS.map(
  ([group, title, source, state, href], i) => ({
    id: `DE-${String(i + 1).padStart(2, '0')}`,
    group,
    title,
    source,
    state,
    ...(href && { href }),
  }),
);

export const packageSections: PackageSection[] = [
  {
    id: 'S-01',
    title: 'General description of the AI system',
    source: 'template',
    annexIv: true,
    routes: both,
    summary: 'Purpose, provider, versions and how the system is placed on the market.',
  },
  {
    id: 'S-02',
    title: 'Design and development process',
    source: 'template',
    annexIv: true,
    routes: both,
    summary: 'Design choices, architecture and the development method.',
  },
  {
    id: 'S-03',
    title: 'Data and data governance',
    source: 'template',
    annexIv: true,
    routes: both,
    summary: 'Training data origin, preparation and quality checks.',
  },
  {
    id: 'S-04',
    title: 'Risk management system',
    source: 'template',
    annexIv: true,
    routes: both,
    summary: 'How risks are found, scored, treated and reviewed.',
  },
  {
    id: 'S-05',
    title: 'Changes over the lifecycle',
    source: 'template',
    annexIv: true,
    routes: both,
    summary: 'Log of material changes to the system.',
  },
  {
    id: 'S-06',
    title: 'Logging and record-keeping in operation',
    source: 'runtime',
    annexIv: true,
    routes: both,
    summary: 'Evidence counts, verification results and retention, from the seeded runtime.',
  },
  {
    id: 'S-07',
    title: 'Human oversight in operation',
    source: 'runtime',
    annexIv: true,
    routes: both,
    summary: 'Quarantine volumes, decision times and kill switch drills.',
  },
  {
    id: 'S-08',
    title: 'Accuracy and robustness metrics',
    source: 'runtime',
    annexIv: true,
    routes: both,
    summary: 'Measured recall with sample size and date, and bundle budgets.',
  },
  {
    id: 'S-09',
    title: 'Post-market monitoring data',
    source: 'runtime',
    annexIv: true,
    routes: both,
    summary: 'Trends and incidents from the monitoring period.',
  },
  {
    id: 'S-10',
    title: 'Quality management system summary',
    source: 'customer',
    annexIv: false,
    routes: both,
    summary: 'Written by the provider from the approved QMS library.',
  },
  {
    id: 'S-11',
    title: 'Internal control checklist',
    source: 'template',
    annexIv: false,
    routes: ['self-assessment'],
    summary: 'Checklist for the provider’s own assessment.',
  },
  {
    id: 'S-12',
    title: 'Application to a notified body',
    source: 'customer',
    annexIv: false,
    routes: ['notified-body'],
    summary: 'Cover letter and scope, written by the provider.',
  },
  {
    id: 'S-13',
    title: 'Declaration of Conformity draft',
    source: 'template',
    annexIv: false,
    routes: both,
    summary: 'Unsigned draft – requires the provider’s signature.',
  },
  {
    id: 'S-14',
    title: 'Offline verification guide',
    source: 'runtime',
    annexIv: false,
    routes: both,
    summary: 'How an assessor checks the evidence layers without access to NAG.',
  },
];

const chain = (approved: number): ApprovalStep[] =>
  (
    [
      ['Drafter', 'p-jonas'],
      ['Compliance Lead', 'p-lena'],
      ['CEO', 'p-tobias'],
    ] as const
  ).map(([role, personId], i) => ({
    role,
    personId,
    approvedAt: i < approved ? addDays(NOW, -60 + i * 6) : undefined,
  }));

// [title, ISO/IEC 42001 items, version, steps already approved]
const QMS: [string, string[], string, number][] = [
  ['AI policy', ['iso-5.2', 'iso-a.2.2'], '2.1', 3],
  ['Roles and responsibilities for AI', ['iso-a.3.2'], '1.3', 3],
  ['AI risk assessment procedure', ['iso-6.1.2', 'iso-8.2'], '2.0', 3],
  ['Impact assessment procedure', ['iso-6.1.4', 'iso-a.5.2'], '1.2', 2],
  ['Control of documented information', ['iso-7.5'], '1.0', 3],
  ['Data quality procedure', ['iso-a.7.4'], '0.9', 1],
  ['Verification and validation procedure', ['iso-a.6.2.4'], '1.1', 2],
  ['Operation and monitoring procedure', ['iso-a.6.2.6', 'iso-9.1'], '1.4', 3],
  ['Event logging procedure', ['iso-a.6.2.8'], '1.0', 1],
  ['User documentation procedure', ['iso-a.8.2'], '0.8', 0],
  ['Supplier management procedure', ['iso-a.10.3'], '1.0', 2],
  ['Internal audit procedure', ['iso-9.2'], '1.2', 3],
  ['Nonconformity and corrective action procedure', ['iso-10.2'], '1.1', 0],
];

export const qmsTemplates: QmsTemplate[] = QMS.map(([title, items, version, approved], i) => ({
  id: `QMS-${String(i + 1).padStart(2, '0')}`,
  title,
  frameworkItemIds: items,
  version,
  chain: chain(approved),
}));

// [scenario, category, owner, inherent L×I, treatment, residual L×I, status, controls, items]
const RISKS: [
  string,
  string,
  string,
  [number, number],
  Risk['treatment'],
  [number, number],
  Risk['status'],
  string[],
  string[],
][] = [
  [
    'Model output leaks personal data to a customer',
    'Privacy',
    'p-sofia',
    [4, 5],
    'mitigate',
    [2, 4],
    'in-treatment',
    ['CTL-27'],
    ['aia-10'],
  ],
  [
    'A prohibited practice slips past the bundles',
    'Legal',
    'p-lena',
    [2, 5],
    'mitigate',
    [1, 5],
    'open',
    ['CTL-01'],
    ['aia-5'],
  ],
  [
    'Reviewers rubber-stamp quarantined items',
    'Oversight',
    'p-lena',
    [3, 4],
    'mitigate',
    [2, 3],
    'in-treatment',
    ['CTL-10', 'CTL-11'],
    ['aia-14'],
  ],
  [
    'Kill switch fails during an incident',
    'Operational',
    'p-amira',
    [2, 5],
    'mitigate',
    [1, 4],
    'open',
    ['CTL-12'],
    ['aia-14'],
  ],
  [
    'Evidence gap goes unnoticed',
    'Integrity',
    'p-amira',
    [3, 4],
    'mitigate',
    [1, 4],
    'closed',
    ['CTL-06'],
    ['aia-12'],
  ],
  [
    'Agent delegation loops consume budget',
    'Operational',
    'p-jonas',
    [3, 3],
    'mitigate',
    [1, 3],
    'closed',
    ['CTL-13'],
    ['aia-15'],
  ],
  [
    'Untrusted MCP server returns injected instructions',
    'Security',
    'p-marek',
    [4, 4],
    'mitigate',
    [3, 3],
    'in-treatment',
    ['CTL-14'],
    ['aia-15', 'iso-a.10.3'],
  ],
  [
    'Biased credit explanations for a customer group',
    'Fairness',
    'p-clara',
    [3, 5],
    'mitigate',
    [2, 4],
    'open',
    ['CTL-03', 'CTL-15'],
    ['aia-10'],
  ],
  [
    'Supplier changes model without notice',
    'Third party',
    'p-marek',
    [3, 3],
    'transfer',
    [2, 3],
    'accepted',
    ['CTL-29'],
    ['iso-a.10.3'],
  ],
  [
    'Documentation out of date at audit',
    'Compliance',
    'p-jonas',
    [4, 3],
    'mitigate',
    [2, 2],
    'in-treatment',
    ['CTL-04'],
    ['aia-11'],
  ],
  [
    'Latency budget breach turns into an outage',
    'Operational',
    'p-amira',
    [2, 3],
    'accept',
    [2, 3],
    'accepted',
    ['CTL-16'],
    ['aia-15'],
  ],
  [
    'Emotion recognition feature requested by sales',
    'Legal',
    'p-david',
    [2, 5],
    'avoid',
    [1, 1],
    'closed',
    ['CTL-01'],
    ['aia-5'],
  ],
];

export const risks: Risk[] = RISKS.map(
  ([scenario, category, ownerId, [il, ii], treatment, [rl, ri], status, controlIds, items], i) => {
    const id = `RSK-${String(i + 1).padStart(2, '0')}`;
    return {
      id,
      scenario,
      category,
      ownerId,
      inherent: { likelihood: il, impact: ii },
      treatment,
      residual: { likelihood: rl, impact: ri },
      status,
      dueDate: addDays(NOW, 14 + i * 9).slice(0, 10),
      controlIds,
      frameworkItemIds: items,
      history: [
        { at: addDays(NOW, -90 + i), actor: 'Clara Schulz', text: `${id} identified` },
        { at: addDays(NOW, -30 + i), actor: 'Clara Schulz', text: `Treatment set to ${treatment}` },
      ],
      comments: [],
    };
  },
);

export const audits: Audit[] = [
  {
    id: 'AUD-2026-01',
    name: 'ISO/IEC 42001 surveillance audit 2026',
    framework: 'iso-42001',
    firm: 'Example Assurance GmbH (demo auditor)',
    periodStart: '2025-10-01',
    periodEnd: '2026-09-30',
    requests: [
      {
        id: 'R-01',
        request: 'AI policy and its approval record',
        controlId: 'CTL-18',
        state: 'accepted',
      },
      {
        id: 'R-02',
        request: 'Risk assessment method and latest results',
        controlId: 'CTL-02',
        state: 'accepted',
      },
      {
        id: 'R-03',
        request: 'Impact assessment for the support agent',
        controlId: 'CTL-26',
        state: 'ready',
      },
      {
        id: 'R-04',
        request: 'Event log sample with verification report',
        controlId: 'CTL-05',
        state: 'ready',
      },
      {
        id: 'R-05',
        request: 'Reviewer training records',
        controlId: 'CTL-11',
        state: 'flagged',
        note: 'Training records missing for two reviewers.',
      },
      { id: 'R-06', request: 'Kill switch drill evidence', controlId: 'CTL-12', state: 'ready' },
      {
        id: 'R-07',
        request: 'Supplier review for model providers',
        controlId: 'CTL-29',
        state: 'not-ready',
      },
      {
        id: 'R-08',
        request: 'Internal audit report',
        controlId: 'CTL-25',
        state: 'flagged',
        note: 'Report covers last year only.',
      },
      { id: 'R-09', request: 'Corrective action log', controlId: 'CTL-30', state: 'not-ready' },
      {
        id: 'R-10',
        request: 'Data quality checks for new datasets',
        controlId: 'CTL-03',
        state: 'ready',
      },
      {
        id: 'R-11',
        request: 'Emotion recognition safeguards',
        controlId: 'CTL-01',
        state: 'not-applicable',
        note: 'No such feature in scope.',
      },
      {
        id: 'R-12',
        request: 'Monitoring metrics and thresholds',
        controlId: 'CTL-32',
        state: 'not-ready',
      },
    ],
  },
];

const control = (id: string) => ({ kind: 'control' as const, id });
const policy = (id: string) => ({ kind: 'policy' as const, id });
const doc = (id: string) => ({ kind: 'document' as const, id });

// Each public claim points at the console objects it rests on; `src/domain/claims.ts`
// derives the status the trust page shows from them.
export const trustCategories: TrustCategory[] = [
  {
    id: 'runtime',
    name: 'Runtime safeguards',
    entries: [
      { name: 'Prohibited practices blocked at the gateway', refs: [control('CTL-01')] },
      { name: 'Human review of uncertain output', refs: [control('CTL-10')] },
      { name: 'Emergency stop with dual approval to resume', refs: [control('CTL-12')] },
      { name: 'Agent call depth limit', refs: [control('CTL-13')] },
    ],
  },
  {
    id: 'evidence',
    name: 'Evidence and logging',
    entries: [
      {
        name: 'Tamper-evident records with three integrity layers',
        refs: [control('CTL-06'), { kind: 'verification' }],
      },
      { name: 'Independent timestamp anchoring', refs: [control('CTL-06')], planned: true },
      { name: 'Offline verification guide for assessors', refs: [doc('DOC-01')] },
    ],
  },
  {
    id: 'governance',
    name: 'Governance',
    entries: [
      { name: 'AI policy approved by leadership', refs: [control('CTL-18'), policy('POL-01')] },
      { name: 'Risk register reviewed quarterly', refs: [control('CTL-02'), policy('POL-04')] },
      { name: 'Internal audit programme', refs: [control('CTL-25')], planned: true },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy',
    entries: [
      {
        name: 'Metadata and keyed digests only, by default',
        refs: [control('CTL-27'), policy('POL-05')],
      },
      { name: 'Erasure by key destruction', refs: [control('CTL-28'), policy('POL-05')] },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    entries: [
      { name: 'MCP server allow-list', refs: [control('CTL-14')] },
      { name: 'Prompt-injection screening', refs: [control('CTL-15')] },
    ],
  },
];

/** Tasks already on objects before the demo session starts. */
export const seedTasks: Task[] = [
  {
    id: 'TASK-1',
    objectId: 'TST-009',
    title: 'Update the data section of the technical documentation',
    assignee: 'Jonas Becker',
    createdAt: addDays(NOW, -4),
    done: false,
  },
  {
    id: 'TASK-2',
    objectId: 'TST-019',
    title: 'Add a second reviewer to the late shift',
    assignee: 'Lena Hofmann',
    createdAt: addDays(NOW, -2),
    done: false,
  },
  {
    id: 'TASK-3',
    objectId: 'CTL-14',
    title: 'Restore the MCP inspector heartbeat',
    assignee: 'Amira Khalil',
    createdAt: addDays(NOW, -1),
    done: false,
  },
];
