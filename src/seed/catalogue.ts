import { addDays } from '../domain/time';
import type {
  ArticleCoverage,
  Comment,
  ComplianceDocument,
  ComplianceTest,
  Control,
  HistoryEntry,
  Policy,
} from '../domain/types';
import { NOW, people } from './base';
import { pick, rng } from './prng';

const random = rng(20260930);
const ownerIds = people.map((p) => p.id);

function historyFor(id: string, created: string, extra: HistoryEntry[] = []): HistoryEntry[] {
  return [
    { at: created, actor: 'Lena Hofmann', text: `${id} created` },
    { at: addDays(created, 21), actor: 'Jonas Becker', text: 'Owner and frameworks reviewed' },
    ...extra,
  ];
}

function commentsFor(seedIndex: number): Comment[] {
  const texts = [
    'Linked the latest evidence export.',
    'Waiting on the platform team for the configuration change.',
    'Reviewed with the product owner; no change needed.',
    'Please attach the signed-off version before the audit.',
  ];
  return seedIndex % 3 === 0
    ? []
    : [
        {
          at: addDays(NOW, -(seedIndex % 9) - 1),
          author: 'Clara Schulz',
          text: texts[seedIndex % 4]!,
        },
      ];
}

// [name, integration, framework items, what it checks]
const TESTS: [string, string, string[], string][] = [
  [
    'Prohibited-practice bundles active on every endpoint',
    'int-proxy',
    ['aia-5'],
    'All 8 prohibited-practice bundles are loaded on each production endpoint.',
  ],
  [
    'Manipulative-technique prompts are blocked',
    'int-proxy',
    ['aia-5'],
    'Seeded probe prompts using manipulative techniques receive a block response.',
  ],
  [
    'Social-scoring requests are blocked',
    'int-proxy',
    ['aia-5'],
    'Requests that rank people by social behaviour are blocked.',
  ],
  [
    'Biometric categorisation requests are blocked',
    'int-proxy',
    ['aia-5'],
    'Requests inferring sensitive traits from biometrics are blocked.',
  ],
  [
    'Risk register reviewed this quarter',
    'int-ticket',
    ['aia-9', 'iso-6.1.2'],
    'The risk register has a completed review in the current quarter.',
  ],
  [
    'Every high risk has a treatment owner',
    'int-ticket',
    ['aia-9', 'iso-6.1.2'],
    'Risks scored 15 or more have a named owner and treatment.',
  ],
  [
    'Training data sources are documented',
    'int-repo',
    ['aia-10', 'iso-a.7.4'],
    'Each training dataset has a documented origin and licence.',
  ],
  [
    'Data quality checks run on new datasets',
    'int-cloud',
    ['aia-10', 'iso-a.7.4'],
    'New datasets pass completeness and bias checks before use.',
  ],
  [
    'Technical documentation is less than 12 months old',
    'int-repo',
    ['aia-11', 'iso-7.5'],
    'No section of the technical documentation is older than 12 months.',
  ],
  [
    'Model card exists for every deployed model',
    'int-repo',
    ['aia-11', 'iso-a.8.2'],
    'Every model behind a production endpoint has a model card.',
  ],
  [
    'Evidence records written for every AI request',
    'int-proxy',
    ['aia-12', 'iso-a.6.2.8'],
    'Each request through the gateway produces one evidence record.',
  ],
  [
    'Hash chain verifies end to end',
    'int-proxy',
    ['aia-12', 'iso-a.6.2.8'],
    'The L1 hash chain has no breaks over the last 24 hours.',
  ],
  [
    'Merkle batches sealed within 5 minutes',
    'int-proxy',
    ['aia-12'],
    'Every L2 batch is sealed within 5 minutes of its first record.',
  ],
  [
    'Timestamp anchors present for every batch',
    'int-cloud',
    ['aia-12'],
    'Every sealed batch carries an L3 timestamp anchor (stub authority).',
  ],
  [
    'Evidence retention of at least 6 months',
    'int-cloud',
    ['aia-12', 'aia-18'],
    'Storage retention keeps evidence for at least 6 months.',
  ],
  [
    'Instructions for use published to deployers',
    'int-repo',
    ['aia-13', 'iso-a.8.2'],
    'Current instructions for use are published for each system.',
  ],
  [
    'AI interaction notice shown to end users',
    'int-proxy',
    ['aia-13'],
    'Responses to end users carry the AI interaction notice.',
  ],
  [
    'Quarantine queue has a primary reviewer',
    'int-idp',
    ['aia-14', 'iso-a.6.2.6'],
    'A primary reviewer is on duty for every business hour.',
  ],
  [
    'Quarantined items decided within 8 business hours',
    'int-hooks',
    ['aia-14'],
    'No quarantined item waits longer than 8 business hours.',
  ],
  [
    'Reviewers completed oversight training',
    'int-idp',
    ['aia-14', 'iso-a.3.2'],
    'Everyone in a reviewer group finished oversight training this year.',
  ],
  [
    'Kill switch drill run in the last 90 days',
    'int-hooks',
    ['aia-14', 'iso-a.6.2.6'],
    'A kill switch activation and resume drill ran in the last 90 days.',
  ],
  [
    'Kill switch activation requires MFA',
    'int-idp',
    ['aia-14', 'aia-15'],
    'Activating the kill switch asks for a second factor.',
  ],
  [
    'Agent call depth limited to 10',
    'int-hooks',
    ['aia-15', 'iso-a.6.2.6'],
    'Calls deeper than 10 levels are rejected.',
  ],
  [
    'MCP tool calls record a terminal outcome',
    'int-mcp',
    ['aia-12', 'iso-a.6.2.8'],
    'Every tool call ends as success, error, cancelled or abandoned.',
  ],
  [
    'Unapproved MCP servers are blocked',
    'int-mcp',
    ['aia-15', 'iso-a.10.3'],
    'Agents cannot reach tool servers outside the allow-list.',
  ],
  [
    'Classifier recall measured in the last 30 days',
    'int-cloud',
    ['aia-15', 'iso-a.6.2.4'],
    'Recall of the stub classifier has a measurement younger than 30 days.',
  ],
  [
    'Policy bundles declare class and budget',
    'int-proxy',
    ['aia-15'],
    'Every loaded bundle declares a class and a latency budget.',
  ],
  [
    'Fail-closed bundles have a tested fallback',
    'int-proxy',
    ['aia-15'],
    'Each fail-closed bundle has a tested fallback response.',
  ],
  [
    'Prompt-injection probes run weekly',
    'int-mcp',
    ['aia-15', 'iso-a.6.2.4'],
    'The weekly prompt-injection probe set ran against every agent.',
  ],
  [
    'QMS templates approved by the CEO',
    'int-ticket',
    ['aia-17', 'iso-5.2'],
    'Every QMS template finished its approval chain.',
  ],
  [
    'AI policy reviewed annually',
    'int-ticket',
    ['iso-5.2', 'iso-a.2.2'],
    'The AI policy was reviewed in the last 12 months.',
  ],
  [
    'Documentation kept for 10 years',
    'int-cloud',
    ['aia-18', 'iso-7.5'],
    'Archive retention for documentation is set to 10 years.',
  ],
  [
    'Deployer logs retained by the customer',
    'int-cloud',
    ['aia-26'],
    'Deployer-side log retention is configured and reported.',
  ],
  [
    'Oversight staff assigned by the deployer',
    'int-idp',
    ['aia-26', 'aia-14'],
    'Each deployment names people for human oversight.',
  ],
  [
    'Conformity assessment route selected',
    'int-ticket',
    ['aia-43'],
    'Each high-risk system has a chosen assessment route.',
  ],
  [
    'Declaration of conformity draft is current',
    'int-repo',
    ['aia-47'],
    'The declaration draft matches the current system version.',
  ],
  [
    'Post-market monitoring plan has metrics',
    'int-ticket',
    ['aia-72', 'iso-9.1'],
    'The monitoring plan defines metrics, thresholds and owners.',
  ],
  [
    'Serious incidents reported within the deadline',
    'int-ticket',
    ['aia-73', 'iso-10.2'],
    'Incidents classed as serious were reported on time.',
  ],
  [
    'Internal audit completed this year',
    'int-ticket',
    ['iso-9.2'],
    'The internal AI audit for this year is complete.',
  ],
  [
    'Impact assessment done for every AI system',
    'int-ticket',
    ['iso-6.1.4', 'iso-a.5.2'],
    'Each AI system has a current impact assessment.',
  ],
  [
    'Content logging off by default',
    'int-proxy',
    ['aia-10'],
    'Endpoints log metadata and keyed digests only unless opted in.',
  ],
  [
    'Erasure keeps evidence countable',
    'int-cloud',
    ['aia-12'],
    'After key destruction, records stay countable and verifiable.',
  ],
  [
    'Supplier AI terms reviewed',
    'int-ticket',
    ['iso-a.10.3'],
    'Contracts with AI suppliers were reviewed this year.',
  ],
  [
    'Corrective actions closed within SLA',
    'int-ticket',
    ['iso-10.2'],
    'Corrective actions close within their agreed SLA.',
  ],
];

// Indexes of failing tests, with days from today to their due date.
const FAILING: Record<number, number> = {
  8: -6,
  12: 5,
  18: -2,
  19: 11,
  23: 25,
  24: 3,
  25: 40,
  28: -12,
  32: 9,
  35: 20,
  36: 33,
  39: -1,
  43: 13,
};

const ENTITIES = [
  'endpoint /v1/credit-score',
  'endpoint /v1/support-chat',
  'model credit-scoring-v3',
  'model support-agent-2',
  'reviewer group oversight-l1',
  'dataset loans-2025-q4',
  'tool server payments',
  'agent research-planner',
  'document DOC-07',
  'bucket evidence-archive',
];

export const tests: ComplianceTest[] = TESTS.map(([name, integrationId, items, description], i) => {
  const id = `TST-${String(i + 1).padStart(3, '0')}`;
  const failingDays = FAILING[i];
  const failing = failingDays !== undefined;
  const slaDays = pick(random, [7, 14, 30]);
  const failingSince = failing ? addDays(NOW, -Math.floor(random() * 25) - 2) : undefined;
  // Some passing tests failed earlier in the 30-day window, so the trend moves.
  const fixedEarlier = !failing && i % 5 === 1;
  const entityCount = failing ? 1 + Math.floor(random() * 3) : 0;
  return {
    id,
    name,
    description,
    ownerId: pick(random, ownerIds),
    status: failing ? 'failing' : 'passing',
    failingSince: failing ? failingSince : fixedEarlier ? addDays(NOW, -20 - (i % 7)) : undefined,
    fixedAt: fixedEarlier ? addDays(NOW, -8 + (i % 5)) : undefined,
    failingEntities: Array.from(
      { length: entityCount },
      (_, k) => ENTITIES[(i + k * 3) % ENTITIES.length]!,
    ),
    dueDate: addDays(NOW, failing ? failingDays : 30 + (i % 60)).slice(0, 10),
    lastRunAt: addDays(NOW, -(i % 6) / 24 - 0.01),
    slaDays,
    integrationId,
    frameworkItemIds: items,
    remediation: [
      `Open the ${failing ? 'failing entities' : 'latest run'} and confirm the finding is current.`,
      'Fix the configuration or process step named in the test description.',
      'Attach the new evidence or document to the linked control.',
      'Re-run the test and check that it passes.',
    ],
    history: historyFor(
      id,
      addDays(NOW, -120 - i),
      failing ? [{ at: failingSince!, actor: 'NAG', text: 'Test started failing' }] : [],
    ),
    comments: commentsFor(i),
  };
});

const t = (...n: number[]) => n.map((k) => `TST-${String(k).padStart(3, '0')}`);

// [name, framework items, tests, documents, policies]
const CONTROLS: [string, string[], string[], string[], string[]][] = [
  ['Prohibited practices blocked at runtime', ['aia-5'], t(1, 2, 3, 4), [], ['POL-02']],
  ['AI risk management process', ['aia-9', 'iso-6.1.2', 'iso-8.2'], t(5, 6), [], ['POL-04']],
  ['Governance of training data', ['aia-10', 'iso-a.7.4'], t(7, 8), ['DOC-05'], []],
  ['Technical documentation maintained', ['aia-11', 'iso-7.5'], t(9, 10), ['DOC-01', 'DOC-12'], []],
  ['Automatic event logging', ['aia-12', 'iso-a.6.2.8'], t(11, 24), ['DOC-06'], []],
  ['Tamper-evident evidence chain', ['aia-12'], t(12, 13, 14), [], []],
  ['Log retention', ['aia-12', 'aia-18'], t(15, 32), ['DOC-06'], ['POL-05']],
  ['Information for deployers', ['aia-13', 'iso-a.8.2'], t(16), ['DOC-02'], []],
  ['Transparency to end users', ['aia-13'], t(17), [], ['POL-02']],
  [
    'Human review of quarantined output',
    ['aia-14', 'iso-a.6.2.6'],
    t(18, 19),
    ['DOC-03'],
    ['POL-03'],
  ],
  ['Competence of oversight staff', ['aia-14', 'iso-a.3.2'], t(20), ['DOC-03'], ['POL-03']],
  ['Emergency stop', ['aia-14'], t(21, 22), ['DOC-04'], ['POL-06']],
  ['Agent depth limit', ['aia-15', 'iso-a.6.2.6'], t(23), [], []],
  ['MCP tool governance', ['aia-15', 'iso-a.10.3'], t(24, 25), [], ['POL-07']],
  ['Detection quality measured', ['aia-15', 'iso-a.6.2.4'], t(26, 29), [], []],
  ['Policy bundle hygiene', ['aia-15'], t(27, 28), [], []],
  ['Quality management system', ['aia-17', 'iso-5.2'], t(30), [], ['POL-08']],
  ['AI policy in place', ['iso-5.2', 'iso-a.2.2'], t(31), [], ['POL-01']],
  ['Documentation keeping', ['aia-18', 'iso-7.5'], t(32), ['DOC-06'], []],
  ['Deployer duties communicated', ['aia-26'], t(33, 34), ['DOC-02'], []],
  ['Conformity assessment', ['aia-43'], t(35), [], []],
  ['Declaration of conformity', ['aia-47'], t(36), [], []],
  ['Post-market monitoring', ['aia-72', 'iso-9.1'], t(37), ['DOC-07'], []],
  ['Serious incident reporting', ['aia-73', 'iso-10.2'], t(38), ['DOC-08'], ['POL-06']],
  ['Internal audit programme', ['iso-9.2'], t(39), ['DOC-10'], []],
  ['AI impact assessment', ['iso-6.1.4', 'iso-a.5.2'], t(40), ['DOC-09'], ['POL-04']],
  ['Privacy by default for logs', ['aia-10'], t(41), [], ['POL-05']],
  ['Erasure by key destruction', ['aia-12'], t(42), [], ['POL-05']],
  ['Supplier management', ['iso-a.10.3'], t(43), ['DOC-11'], ['POL-07']],
  ['Corrective action', ['iso-10.2'], t(44, 38), [], []],
  ['Context of the organisation', ['iso-4.1'], t(31, 5), [], ['POL-01']],
  ['Monitoring and measurement', ['iso-9.1', 'aia-72'], t(26, 37), ['DOC-07'], []],
  ['Reviewer access control', ['aia-14', 'iso-a.3.2'], t(18, 22), [], ['POL-03']],
];

export const controls: Control[] = CONTROLS.map(
  ([name, items, testIds, documentIds, policyIds], i) => {
    const id = `CTL-${String(i + 1).padStart(2, '0')}`;
    return {
      id,
      name,
      description: `${name}: checked by ${testIds.length} automated test(s).`,
      ownerId: ownerIds[i % ownerIds.length]!,
      frameworkItemIds: items,
      testIds,
      documentIds,
      policyIds,
      dueDate: addDays(NOW, 10 + ((i * 7) % 80)).slice(0, 10),
      history: historyFor(id, addDays(NOW, -200 + i)),
      comments: commentsFor(i + 1),
    };
  },
);

// [name, owner, status, cadence, items, assistant flag]
const DOCUMENTS: [
  string,
  string,
  'draft' | 'approved',
  ComplianceDocument['cadence'],
  string[],
  string?,
][] = [
  ['AI system technical documentation', 'p-jonas', 'approved', 'annual', ['aia-11']],
  [
    'Instructions for use – credit scoring assistant',
    'p-david',
    'approved',
    'semi-annual',
    ['aia-13'],
  ],
  [
    'Human oversight procedure',
    'p-lena',
    'approved',
    'annual',
    ['aia-14'],
    'The procedure describes the reviewer role but holds no record that reviewers were trained, which the control asks for.',
  ],
  ['Kill switch runbook', 'p-amira', 'approved', 'quarterly', ['aia-14']],
  ['Data governance standard', 'p-sofia', 'draft', 'annual', ['aia-10']],
  ['Evidence retention schedule', 'p-amira', 'approved', 'annual', ['aia-12', 'aia-18']],
  [
    'Post-market monitoring plan',
    'p-david',
    'draft',
    'annual',
    ['aia-72'],
    'The plan lists metrics but no thresholds or review dates, so it does not show how results lead to action.',
  ],
  ['Serious incident playbook', 'p-marek', 'approved', 'semi-annual', ['aia-73']],
  ['Impact assessment – customer support agent', 'p-clara', 'approved', 'annual', ['iso-6.1.4']],
  ['Internal audit report 2025', 'p-lena', 'approved', 'annual', ['iso-9.2']],
  ['Supplier AI due diligence checklist', 'p-marek', 'draft', 'annual', ['iso-a.10.3']],
  ['Model card – credit scoring v3', 'p-jonas', 'approved', 'quarterly', ['aia-11', 'iso-a.8.2']],
];

const CADENCE_DAYS = { quarterly: 91, 'semi-annual': 182, annual: 365 };

export const documents: ComplianceDocument[] = DOCUMENTS.map(
  ([name, ownerId, status, cadence, items, flag], i) => {
    const id = `DOC-${String(i + 1).padStart(2, '0')}`;
    const lastReviewed = addDays(NOW, -40 - i * 23);
    return {
      id,
      name,
      ownerId,
      status,
      cadence,
      lastReviewed: lastReviewed.slice(0, 10),
      nextReview: addDays(lastReviewed, CADENCE_DAYS[cadence]).slice(0, 10),
      frameworkItemIds: items,
      assistantFlag: flag,
      history: historyFor(id, addDays(NOW, -300 + i * 5)),
      comments: commentsFor(i + 2),
    };
  },
);

// [name, owner, version, status, approvers, items]
const POLICIES: [string, string, string, 'draft' | 'approved', string[], string[]][] = [
  ['AI policy', 'p-lena', '3.1', 'approved', ['p-tobias', 'p-lena'], ['iso-5.2', 'iso-a.2.2']],
  ['Acceptable use of AI', 'p-lena', '2.0', 'approved', ['p-tobias'], ['aia-5', 'aia-13']],
  ['Human oversight policy', 'p-lena', '1.4', 'approved', ['p-tobias', 'p-clara'], ['aia-14']],
  [
    'AI risk management policy',
    'p-clara',
    '2.2',
    'approved',
    ['p-tobias', 'p-lena'],
    ['aia-9', 'iso-6.1.2'],
  ],
  [
    'Data retention and erasure policy',
    'p-sofia',
    '1.1',
    'approved',
    ['p-sofia', 'p-tobias'],
    ['aia-12', 'aia-18'],
  ],
  [
    'Incident response policy',
    'p-marek',
    '4.0',
    'approved',
    ['p-tobias', 'p-amira'],
    ['aia-73', 'iso-10.2'],
  ],
  ['Third-party AI policy', 'p-marek', '0.9', 'draft', ['p-lena', 'p-tobias'], ['iso-a.10.3']],
  ['Quality management policy', 'p-lena', '1.0', 'approved', ['p-tobias'], ['aia-17']],
];

export const policies: Policy[] = POLICIES.map(
  ([name, ownerId, version, status, approverIds, items], i) => {
    const id = `POL-${String(i + 1).padStart(2, '0')}`;
    return {
      id,
      name,
      ownerId,
      version,
      status,
      approverIds,
      renewalDate: addDays(NOW, -15 + i * 37).slice(0, 10),
      frameworkItemIds: items,
      history: historyFor(id, addDays(NOW, -400 + i * 11)),
      comments: commentsFor(i + 3),
    };
  },
);

const controlsFor = (item: string) =>
  controls.filter((c) => c.frameworkItemIds.includes(item)).map((c) => c.id);
const testsFor = (item: string) =>
  tests.filter((x) => x.frameworkItemIds.includes(item)).map((x) => x.id);

// [article number, what NAG covers, what the customer must do, status]
const COVERAGE: [number, string, string, ArticleCoverage['status']][] = [
  [
    5,
    'Blocks requests that match the prohibited-practice bundles before they reach the model, and records each block.',
    'Decide which uses are in scope, keep the bundles enabled and handle appeals from blocked users.',
    'covered',
  ],
  [
    11,
    'Fills the runtime sections of the technical documentation: logging, oversight, accuracy and monitoring data.',
    'Write the design, development and data sections, and keep the whole file current.',
    'partial',
  ],
  [
    12,
    'Writes a tamper-evident record for each AI request with three integrity layers.',
    'Keep the logging enabled on every endpoint and review gaps reported by verification.',
    'covered',
  ],
  [
    13,
    'Shows the interaction notice and provides runtime facts for the instructions for use.',
    'Write and publish instructions for use to deployers.',
    'partial',
  ],
  [
    14,
    'Routes uncertain output to a reviewer queue, escalates it in business hours and offers a kill switch.',
    'Assign trained reviewers, decide items with a reason and run kill switch drills.',
    'covered',
  ],
  [
    18,
    'Keeps evidence and the package inputs exportable for the retention period.',
    'Store the documentation for the full period after the system is placed on the market.',
    'partial',
  ],
  [
    26,
    'Gives deployers logs, oversight tooling and an incident trail.',
    'As deployer, use the system as instructed, assign oversight and keep logs.',
    'customer',
  ],
  [
    43,
    'Prepares the evidence and runtime sections for the chosen assessment route.',
    'Choose the route, run the assessment and involve a notified body where needed.',
    'partial',
  ],
  [
    47,
    'Drafts the declaration from package data as an unsigned draft.',
    'Review, complete and sign the declaration as the provider.',
    'customer',
  ],
];

const ARTICLE_TITLES: Record<number, string> = {
  5: 'Practices that are not allowed',
  11: 'Technical documentation',
  12: 'Automatic logging of events',
  13: 'Information for deployers',
  14: 'People overseeing the system',
  18: 'Keeping documentation',
  26: 'Duties of deployers',
  43: 'Assessing conformity',
  47: 'Declaring conformity',
};

export const coverage: ArticleCoverage[] = COVERAGE.map(([n, nagCovers, customerMust, status]) => ({
  frameworkItemId: `aia-${n}`,
  article: `Art. ${n}`,
  title: ARTICLE_TITLES[n]!,
  nagCovers,
  customerMust,
  status,
  testIds: testsFor(`aia-${n}`),
  controlIds: controlsFor(`aia-${n}`),
}));
