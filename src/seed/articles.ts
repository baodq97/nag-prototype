// The EU AI Act article map: one row per article or paragraph that binds a provider or a
// deployer, in our own words. Rows hold no status and no links: the selectors join the
// controls and tests mapped to each id and derive the status from them. The duty values are
// orientation to support compliance readiness, not legal advice.

import type {
  ApplicationDate,
  ArticleGroup,
  ArticleRow,
  Duty,
  NagRole,
  RiskTier,
} from '../domain/types';

export const ARTICLE_GROUPS: Record<ArticleGroup, string> = {
  P: 'Prohibited practices',
  A: 'Classification',
  B: 'System requirements',
  C: 'Provider duties',
  D: 'Conformity, marking and registration',
  E: 'Deployer duties',
  F: 'Value chain and after market',
  G: 'Cross-cutting',
  T: 'Transparency',
};

const MUST: Duty = { kind: 'must' };
const NA: Duty = { kind: 'not-applicable' };
const onlyIf = (condition: string): Duty => ({ kind: 'only-if', condition });

const ALL_RISK_TIERS: RiskTier[] = ['prohibited', 'high', 'transparency', 'minimal'];
const ANNEX_III: ApplicationDate = { date: '2027-12-02', path: 'annex-iii' };
const ANNEX_I: ApplicationDate = { date: '2028-08-02', path: 'annex-i' };
const HIGH_RISK = { riskTiers: ['high'] as RiskTier[], dates: [ANNEX_III, ANNEX_I] };
const TRANSPARENCY = {
  riskTiers: ['transparency'] as RiskTier[],
  dates: [{ date: '2026-08-02' }],
};

// [reference, title, provider, deployer, NAG's role, what NAG does, what stays with the customer]
type Line = [string, string, Duty, Duty, NagRole, string, string, Partial<ArticleRow>?];

/** "26(5)" → id "aia-26-5", article "Art. 26(5)". */
function toRow(group: ArticleGroup, defaults: Pick<ArticleRow, 'riskTiers' | 'dates'>) {
  return ([ref, title, provider, deployer, nagRole, nagDoes, customerKeeps, more]: Line) => ({
    id: `aia-${ref.replace(/\((\d+)\)/, '-$1')}`,
    article: `Art. ${ref}`,
    group,
    title,
    provider,
    deployer,
    nagRole,
    nagDoes,
    customerKeeps,
    ...defaults,
    ...more,
  });
}

const OUTSIDE_DOES = 'Nothing: this row is outside what NAG does.';

const PROHIBITED: Line[] = [
  [
    '5',
    'Practices that are not allowed',
    MUST,
    MUST,
    'supports',
    'Blocks requests that match the prohibited-practice bundles before they reach the model, and records each block.',
    'Decide which uses are in scope, keep the bundles enabled and handle appeals from blocked users.',
  ],
];

const CLASSIFICATION: Line[] = [
  [
    '6(1)',
    'High-risk through an Annex I product',
    onlyIf(
      'the system is, or is a safety component of, a product under Annex I law that needs a third-party assessment',
    ),
    NA,
    'supports',
    'Stores the classification answers for each system and shows the reasoning behind its risk tier.',
    'Confirm with product-safety experts whether the product law applies.',
    { dates: [ANNEX_I] },
  ],
  [
    '6(2)',
    'High-risk through an Annex III area',
    onlyIf('the intended purpose falls in an Annex III area'),
    onlyIf(
      'it puts the system to an Annex III use the provider did not intend, which makes it the provider (Art. 25)',
    ),
    'supports',
    'Stores the Annex III answer for each system and shows the reasoning behind its risk tier.',
    'Decide the intended purpose and check it against the Annex III areas.',
    { dates: [ANNEX_III] },
  ],
  [
    '6(3)',
    'Exemption for narrow tasks',
    onlyIf(
      'it treats an Annex III system as not high-risk because the system only does a narrow task and does not profile people',
    ),
    NA,
    'supports',
    'Records whether a system profiles people, which rules the exemption out.',
    'Show that the system only performs a narrow or preparatory task before relying on the exemption.',
  ],
  [
    '6(4)',
    'Recording a not-high-risk assessment',
    onlyIf('it decides that its Annex III system is not high-risk'),
    NA,
    'supports',
    'Keeps the recorded answers and reasoning as input for the assessment record.',
    'Write and keep the assessment, register the system and show it to authorities on request.',
  ],
  [
    '7',
    'Changes to the Annex III list',
    onlyIf('a change to the list brings the system into Annex III'),
    onlyIf('a change to the list brings the system into Annex III'),
    'supports',
    'Keeps each system’s stored answers so a change to the list can be checked against them.',
    'Follow changes to the list and reassess the systems they touch.',
  ],
];

const REQUIREMENTS: Line[] = [
  [
    '8',
    'Meeting the requirements',
    MUST,
    NA,
    'supports',
    'Maps each requirement to the controls and tests that give evidence for it.',
    'Own the overall compliance of the system with every requirement, given its purpose.',
  ],
  [
    '9',
    'Managing risk across the lifecycle',
    MUST,
    onlyIf(
      'its monitoring under 26(5) shows a risk from use that it must pass back to the provider',
    ),
    'control',
    'Feeds runtime incidents and blocked requests into the risk register as they happen.',
    'Run the risk management process, decide treatments and test the system before release.',
  ],
  [
    '10',
    'Quality and governance of data',
    MUST,
    onlyIf('the input data is under its control (see 26(4))'),
    'supports',
    'Keeps request content out of the logs by default and reports whether dataset checks ran.',
    'Choose, prepare and examine training, validation and test data for quality and bias.',
  ],
  [
    '11',
    'Technical documentation',
    MUST,
    NA,
    'supports',
    'Fills the runtime sections of the technical documentation: logging, oversight, accuracy and monitoring data.',
    'Write the design, development and data sections, and keep the whole file current.',
  ],
  [
    '12',
    'Automatic logging of events',
    MUST,
    onlyIf('the logs are under its control (see 26(6))'),
    'control',
    'Writes a tamper-evident record for each AI request with three integrity layers.',
    'Keep the logging enabled on every endpoint and review gaps reported by verification.',
  ],
  [
    '13',
    'Information for deployers',
    MUST,
    MUST,
    'supports',
    'Shows the interaction notice and provides runtime facts for the instructions for use.',
    'Providers write and publish instructions for use; deployers follow them (26(1)).',
  ],
  [
    '14',
    'People overseeing the system',
    MUST,
    MUST,
    'control',
    'Routes uncertain output to a reviewer queue, escalates it in business hours and offers a kill switch.',
    'Assign competent, trained reviewers (26(2)), decide items with a reason and run kill switch drills.',
  ],
  [
    '15',
    'Accuracy, robustness and security',
    MUST,
    NA,
    'control',
    'Runs the runtime security controls: prompt-injection screening, tool server allow-lists and an agent call depth limit. Accuracy drift is reported as metrics only.',
    'Set accuracy targets, test robustness and secure the model and its supply chain.',
  ],
];

const PROVIDER: Line[] = [
  [
    '16',
    'Provider duties at a glance',
    MUST,
    NA,
    'supports',
    'Shows the provider duties for each system in one place, with their status.',
    'Carry out each duty and keep the provider’s name and contact details on the system.',
  ],
  [
    '17',
    'Quality management system',
    MUST,
    NA,
    'supports',
    'Supplies the QMS templates and tracks their approval chain.',
    'Adopt, run and keep the quality management system current.',
  ],
  [
    '18',
    'Keeping documentation',
    MUST,
    NA,
    'supports',
    'Keeps evidence and the package inputs exportable for the retention period.',
    'Store the documentation for the full period after the system is placed on the market.',
  ],
  [
    '19',
    'Keeping the generated logs',
    MUST,
    NA,
    'control',
    'Keeps the evidence records for the configured retention period and checks that it is at least six months.',
    'Set the retention period that your sector law asks for.',
  ],
  [
    '20',
    'Corrective action and informing others',
    MUST,
    onlyIf('it receives a corrective-action notice from the provider'),
    'control',
    'Lets an authorised person stop the system at once with the kill switch, and records who did it and why.',
    'Decide on a fix, withdrawal or recall and inform distributors, deployers and authorities.',
  ],
  [
    '21',
    'Cooperating with authorities',
    MUST,
    MUST,
    'control',
    'Keeps tamper-evident logs and evidence for the retention period and exports what an authority asks for.',
    'Answer authority requests and give access to the documentation (deployers under 26(12)).',
  ],
  [
    '22',
    'Authorised representative',
    onlyIf('it is established outside the EU'),
    NA,
    'outside',
    OUTSIDE_DOES,
    'Appoint a representative in the EU by written mandate before placing the system on the market.',
    {
      outsideReason:
        'Appointing a representative is a legal mandate between companies, which no software can hold.',
    },
  ],
];

const CONFORMITY: Line[] = [
  [
    '40',
    'Harmonised standards',
    onlyIf('it relies on a harmonised standard to show conformity'),
    NA,
    'supports',
    'Links controls and tests to each requirement, so the evidence can follow a standard’s structure.',
    'Choose the standards to apply and record which parts were used.',
  ],
  [
    '41',
    'Common specifications',
    onlyIf('it does not follow a harmonised standard and a common specification exists'),
    NA,
    'supports',
    'Links controls and tests to each requirement, so the evidence can follow a specification.',
    'Follow the specification or justify an equivalent technical solution.',
  ],
  [
    '42',
    'Presumed conformity',
    onlyIf('it relies on the presumption for data or cybersecurity'),
    NA,
    'supports',
    'Keeps the evidence that the conditions for the presumption are met.',
    'Show that the conditions for the presumption hold for the system.',
  ],
  [
    '43',
    'Assessing conformity',
    MUST,
    NA,
    'supports',
    'Prepares the evidence and runtime sections for the chosen assessment route.',
    'Choose the route, run the assessment and involve a notified body where needed.',
  ],
  [
    '43(4)',
    'New assessment after a substantial change',
    MUST,
    onlyIf('it substantially modifies the system and so becomes its provider'),
    'control',
    'Flags model version changes for a person to judge whether they are substantial.',
    'Decide whether a change is substantial and run a new assessment when it is.',
    {
      stub: 'Substantial-modification flag: shown from a seeded signal; no live version watch runs.',
    },
  ],
  [
    '47',
    'Declaring conformity',
    MUST,
    NA,
    'supports',
    'Drafts the declaration from package data as an unsigned draft.',
    'Review, complete and sign the declaration as the provider.',
  ],
  [
    '48',
    'CE marking',
    MUST,
    NA,
    'outside',
    OUTSIDE_DOES,
    'Affix the marking visibly once the assessment is passed.',
    {
      outsideReason:
        'The provider affixes the marking to the system or its documents; NAG neither issues nor applies it.',
    },
  ],
  [
    '49',
    'Registration in the EU database',
    MUST,
    onlyIf('it is a public authority using an Annex III high-risk system'),
    'supports',
    'Prepares the system facts the registration asks for from the inventory.',
    'Register the system in the EU database before use and keep the entry current.',
    { article: 'Art. 49 and 71' },
  ],
];

const DEPLOYER: Line[] = [
  [
    '26(1)',
    'Using the system as instructed',
    NA,
    MUST,
    'control',
    'Applies policy bundles that keep use within the configured purpose.',
    'Take the technical and organisational steps to use the system as its instructions say.',
  ],
  [
    '26(2)',
    'Assigning human oversight',
    NA,
    MUST,
    'control',
    'Routes uncertain output to named reviewers and checks that a reviewer is on duty.',
    'Assign competent, trained people with the authority to oversee the system.',
  ],
  [
    '26(3)',
    'Other duties stay in place',
    NA,
    MUST,
    'supports',
    'Keeps the oversight setup configurable, so it fits your own organisation.',
    'Organise your own resources and keep meeting your other legal duties.',
  ],
  [
    '26(4)',
    'Relevant input data',
    NA,
    onlyIf('it controls the input data'),
    'control',
    'Checks inputs against policy bundles and logs a keyed digest of each.',
    'Make sure the input data fits the system’s intended purpose.',
  ],
  [
    '26(5)',
    'Monitoring use and reporting risks',
    NA,
    MUST,
    'control',
    'Monitors every request at runtime, quarantines doubtful output and records each signal for review.',
    'Inform the provider and the authority, and suspend use, when a risk or a serious incident appears.',
  ],
  [
    '26(6)',
    'Keeping the logs as deployer',
    NA,
    MUST,
    'control',
    'Keeps the logs generated under your control for the configured retention period.',
    'Set a retention period of at least six months, unless other law says otherwise.',
  ],
  [
    '26(7)',
    'Informing workers',
    NA,
    onlyIf('it uses a high-risk system at the workplace'),
    'outside',
    OUTSIDE_DOES,
    'Tell workers and their representatives before the system is used at work.',
    {
      outsideReason:
        'Informing workers is an employer duty carried out through staff channels, not through the AI traffic NAG sees.',
    },
  ],
  [
    '26(8)',
    'Public bodies check registration',
    NA,
    onlyIf('it is a public authority or acts for one'),
    'supports',
    'Lists every system in the inventory as input for the check.',
    'Do not use a high-risk system that is not registered, and tell the provider.',
  ],
  [
    '26(9)',
    'Data protection impact assessment',
    NA,
    onlyIf('a data protection impact assessment is required'),
    'supports',
    'Exports the logging and privacy settings the assessment needs.',
    'Carry out the data protection impact assessment with the provider’s information.',
  ],
  [
    '26(10)',
    'Biometric identification in investigations',
    NA,
    onlyIf('it uses remote biometric identification after the fact in a criminal investigation'),
    'supports',
    'Blocks biometric requests that no policy bundle allows.',
    'Obtain the required authorisation and limit use to the case at hand.',
  ],
  [
    '26(11)',
    'Telling people a decision involves AI',
    NA,
    MUST,
    'supports',
    'Adds a notice to responses that reach the people concerned.',
    'Inform the people affected that a high-risk system is used for decisions about them.',
  ],
  [
    '27',
    'Fundamental rights impact assessment',
    NA,
    onlyIf(
      'it is a public body, provides public services, or assesses credit or insurance pricing',
    ),
    'supports',
    'Supplies runtime facts and the impact assessment template.',
    'Carry out the assessment before first use and notify the authority of the result.',
  ],
  [
    '86',
    'Explaining individual decisions',
    onlyIf('the deployer needs its help to explain the system’s role in a decision'),
    MUST,
    'control',
    'Records for each decision which system, model version and policy produced the output, as the basis for an explanation.',
    'Give the affected person a clear explanation of the system’s role in the decision.',
    {
      stub: 'Per-decision explanation trace: shown from seeded records; no live trace is built.',
    },
  ],
];

const VALUE_CHAIN: Line[] = [
  [
    '23',
    'Importers',
    onlyIf('it sells the system in the EU through an importer'),
    NA,
    'supports',
    'Exports the documentation and evidence an importer checks.',
    'Importers check that the provider finished the assessment, documentation and marking before the system enters the EU market.',
  ],
  [
    '24',
    'Distributors',
    onlyIf('it sells the system through a distributor'),
    NA,
    'supports',
    'Exports the documentation and evidence a distributor checks.',
    'Distributors check the marking, declaration and instructions before making the system available.',
  ],
  [
    '25',
    'Becoming a provider in the value chain',
    onlyIf('another party becomes the provider of its system'),
    onlyIf('it puts its name on, substantially modifies or repurposes a high-risk system'),
    'control',
    'Records the role answers for each system and raises a role-shift alert when observed use drifts into a new purpose.',
    'Assess whether a change makes you the provider, and take on the provider duties if it does.',
  ],
  [
    '72',
    'Monitoring after release',
    MUST,
    onlyIf('its own monitoring finds something it must report to the provider (26(5))'),
    'control',
    'Collects runtime metrics, blocks and incidents continuously as input for the monitoring plan.',
    'Write the monitoring plan, set thresholds and act on what it shows.',
  ],
  [
    '73',
    'Reporting serious incidents',
    MUST,
    onlyIf('it finds a serious incident and must tell the provider first (26(5))'),
    'control',
    'Records incidents with their timeline and classifies them against the 2-, 10- and 15-day reporting clocks.',
    'Investigate, decide whether an incident is serious and file the report.',
    { stub: 'Incident clock classification runs on seeded examples only.' },
  ],
  [
    '80',
    'Disputed not-high-risk classification',
    onlyIf('it classified an Annex III system as not high-risk'),
    NA,
    'supports',
    'Keeps the classification answers and reasoning to show an authority.',
    'Bring the system into line if an authority finds it is high-risk.',
  ],
];

const CROSS_CUTTING: Line[] = [
  [
    '4',
    'AI literacy of staff',
    MUST,
    MUST,
    'supports',
    'Reports which reviewers finished oversight training.',
    'Make sure the staff who run or use AI systems understand them well enough.',
    { dates: [{ date: '2025-02-02' }] },
  ],
  [
    '99',
    'Penalties',
    MUST,
    MUST,
    'supports',
    'Shows the status of every duty, so gaps can be fixed before they become a breach.',
    'Answer for any fine; national authorities set and impose penalties.',
    { dates: [{ date: '2025-08-02' }] },
  ],
];

const TRANSPARENCY_ROWS: Line[] = [
  [
    '50(1)',
    'Telling people they talk to an AI',
    MUST,
    NA,
    'supports',
    'Adds the AI interaction notice to responses.',
    'Design the system so people are told they are dealing with AI, unless it is obvious.',
    { stub: 'First-interaction disclosure check: shown from seeded results; no live check runs.' },
  ],
  [
    '50(2)',
    'Marking generated content',
    MUST,
    NA,
    'supports',
    'Records which responses were generated, as input for the marking.',
    'Mark generated content in a machine-readable way that can be detected.',
    {
      dates: [
        { date: '2026-08-02' },
        { date: '2026-12-02', note: 'Machine-readable marking for systems already on the market' },
      ],
    },
  ],
  [
    '50(3)',
    'Notice for emotion recognition and biometric categorisation',
    NA,
    onlyIf('the system recognises emotions or sorts people into biometric categories'),
    'supports',
    'Blocks biometric categorisation that no policy bundle allows.',
    'Inform the people exposed and process their data lawfully.',
  ],
  [
    '50(4)',
    'Disclosing deep fakes and generated public text',
    NA,
    onlyIf(
      'the system generates or manipulates deep fakes, or publishes generated text on matters of public interest that no person reviewed and took editorial responsibility for',
    ),
    'supports',
    'Records generated output as input for the disclosure.',
    'Disclose that the content was generated or manipulated by AI.',
  ],
  [
    '50(5)',
    'How and when to inform',
    MUST,
    MUST,
    'supports',
    'Shows the notice in the first response, in a format that meets accessibility needs.',
    'Give the information clearly, at the latest at the first interaction.',
  ],
  [
    '50(6)',
    'Other duties still apply',
    onlyIf('the system is also bound by other duties'),
    onlyIf('the system is also bound by other duties'),
    'supports',
    'Shows the other rows that apply to the same system next to the transparency ones.',
    'Meet the high-risk and other legal duties alongside the transparency ones.',
  ],
  [
    '50(7)',
    'Codes of practice',
    onlyIf('it chooses to follow a code of practice on marking or labelling'),
    onlyIf('it chooses to follow a code of practice on marking or labelling'),
    'supports',
    'Keeps the evidence of notices and marking a code of practice asks for.',
    'Decide whether to follow a code of practice and apply it.',
  ],
];

export const articleMap: ArticleRow[] = [
  ...PROHIBITED.map(toRow('P', { riskTiers: ALL_RISK_TIERS, dates: [{ date: '2025-02-02' }] })),
  ...CLASSIFICATION.map(toRow('A', HIGH_RISK)),
  ...REQUIREMENTS.map(toRow('B', HIGH_RISK)),
  ...PROVIDER.map(toRow('C', HIGH_RISK)),
  ...CONFORMITY.map(toRow('D', HIGH_RISK)),
  ...DEPLOYER.map(toRow('E', HIGH_RISK)),
  ...VALUE_CHAIN.map(toRow('F', HIGH_RISK)),
  ...CROSS_CUTTING.map(toRow('G', { riskTiers: ALL_RISK_TIERS, dates: [] })),
  ...TRANSPARENCY_ROWS.map(toRow('T', TRANSPARENCY)),
];
