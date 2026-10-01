// Domain model of the console. Every value of these types comes from the seed (`src/seed`),
// read through the selectors in `src/data`; there is no backend.

export type FrameworkId = 'eu-ai-act' | 'iso-42001';

/** An EU AI Act article or an ISO/IEC 42001 clause or Annex A control. */
export interface FrameworkItem {
  id: string;
  framework: FrameworkId;
  /** Short reference as shown in the UI, e.g. "Art. 14" or "A.6.2.6". */
  ref: string;
  /** Our own short description, never quoted text. */
  title: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
  timeZone: string;
  /** Business hours used for quarantine escalation, local time, Monday to Friday. */
  businessHours: { start: number; end: number };
  /** Decision applied when a quarantined item expires without a reviewer. */
  quarantineTerminalDecision: 'reject' | 'approve';
  /** Business hours after which a quarantined item expires. */
  quarantineExpiryBusinessHours: number;
}

export interface HistoryEntry {
  at: string;
  actor: string;
  text: string;
}

export interface Comment {
  at: string;
  author: string;
  text: string;
}

export interface Task {
  id: string;
  objectId: string;
  title: string;
  assignee: string;
  createdAt: string;
  done: boolean;
}

export type TestStatus = 'passing' | 'failing';

export interface ComplianceTest {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: TestStatus;
  /** Start of the current failure; absent when passing. */
  failingSince?: string;
  /** When an earlier failure inside the trend window was fixed. */
  fixedAt?: string;
  failingEntities: string[];
  /** Date (YYYY-MM-DD) the current failure must be fixed by. */
  dueDate: string;
  lastRunAt: string;
  slaDays: number;
  integrationId: string;
  frameworkItemIds: string[];
  remediation: string[];
  history: HistoryEntry[];
  comments: Comment[];
}

export interface Control {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  frameworkItemIds: string[];
  testIds: string[];
  documentIds: string[];
  policyIds: string[];
  dueDate: string;
  history: HistoryEntry[];
  comments: Comment[];
}

/** Group of the EU AI Act article map; P holds the prohibited practices. */
export type ArticleGroup = 'P' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'T';

/** Who an article row binds: the provider or the deployer of an AI system. */
export type OperatorRole = 'provider' | 'deployer';

/** What one operator owes on a row. */
export type Duty =
  { kind: 'must' } | { kind: 'only-if'; condition: string } | { kind: 'not-applicable' };

/** NAG's part in a row: it is the control, it supports a person's step, or it is out of scope. */
export type NagRole = 'control' | 'supports' | 'outside';

/** The Act's risk tier of an AI system, 1 (prohibited) to 4 (minimal). */
export type RiskTier = 'prohibited' | 'high' | 'transparency' | 'minimal';

/** The route by which a system is high-risk: an Annex I product or an Annex III area. */
export type AnnexPath = 'annex-i' | 'annex-iii';

export interface ApplicationDate {
  /** YYYY-MM-DD. */
  date: string;
  /** Set when the date holds only for systems on one high-risk route. */
  path?: AnnexPath;
  note?: string;
}

/** One row of the EU AI Act article map as seeded: no links and no status. */
export interface ArticleRow {
  /** Also the id of its framework item, e.g. "aia-14" or "aia-26-5". */
  id: string;
  /** Reference as shown, e.g. "Art. 26(5)". */
  article: string;
  group: ArticleGroup;
  /** Short title in our own words. */
  title: string;
  provider: Duty;
  deployer: Duty;
  nagRole: NagRole;
  nagDoes: string;
  customerKeeps: string;
  /** Why NAG does not cover the row; only on outside-scope rows. */
  outsideReason?: string;
  /** One plain line shown with the row: why it owes no duty, or how a sector meets it. */
  note?: string;
  riskTiers: RiskTier[];
  dates: ApplicationDate[];
  /** Runtime feature shown as row content that is a stub in this prototype. */
  stub?: string;
}

/** A row joined with the controls and tests mapped to it. */
export interface ArticleCoverage extends ArticleRow {
  controlIds: string[];
  testIds: string[];
}

/** Derived, never seeded: see `coverageStatus`. */
export type CoverageStatus = 'covered' | 'needs-attention' | 'shared' | 'outside';

/** Why a row needs attention: a linked control that fails, and the failing test to open next. */
export interface CoverageAttention {
  controlId: string;
  testId: string;
}

export interface CoverageRow extends ArticleCoverage {
  status: CoverageStatus;
  /** Set exactly when the status is "needs attention". */
  attention?: CoverageAttention;
}

/** A recorded answer to one classification step, with a one-line reason. */
export interface StepAnswer {
  answer: boolean;
  reason: string;
}

/** Recorded answers to the six ordered classification steps; the sixth needs none. */
export interface ClassificationAnswers {
  inScope: StepAnswer;
  prohibited: StepAnswer;
  annexI: StepAnswer;
  annexIII: {
    /** The Annex III area, or null when the system is in none. */
    area: string | null;
    profilesPeople: boolean;
    exemptionHolds: boolean;
    reason: string;
  };
  transparency: StepAnswer;
}

/** Recorded answers that decide the tenant's role for a system. */
export interface RoleAnswers {
  builtBy: 'tenant' | 'third-party';
  marketedUnder: 'tenant' | 'third-party';
  substantiallyModified: boolean;
  repurposed: boolean;
  /** Whether Art. 25 turns the tenant, as deployer, into a provider. */
  art25MakesProvider: boolean;
  usedUnderOwnAuthority: boolean;
  reason: string;
}

export interface ReasoningLine {
  step: string;
  answer: string;
  reason: string;
}

/** The result of replaying a system's answers. */
export interface Classification {
  /** Null when the system is outside the Act. */
  riskTier: RiskTier | null;
  path?: AnnexPath;
  transparency: boolean;
  roles: OperatorRole[];
  reasoning: ReasoningLine[];
}

/** Seeded runtime signal on a system (demo data). */
export interface SystemSignal {
  kind: 'drift' | 'modification';
  text: string;
  observedAt: string;
  /** Summary of the quarantined item the signal rests on. */
  quarantineSummary?: string;
}

/** An AI system in the tenant's inventory. It stores answers, never a risk tier. */
export interface AiSystem {
  id: string;
  name: string;
  description: string;
  /** Id of an existing gateway endpoint; absent for systems registered by hand. */
  endpointId?: string;
  discovery: 'gateway' | 'manual';
  answers: ClassificationAnswers;
  roleAnswers: RoleAnswers;
  signals: SystemSignal[];
}

export interface AiSystemView extends AiSystem {
  endpoint?: string;
  classification: Classification;
}

/** Serious incident kinds, each with its own reporting clock. */
export type IncidentKind = 'serious' | 'death' | 'widespread-or-critical';

export type IntegrationKind =
  | 'reverse-proxy'
  | 'lifecycle-hooks'
  | 'mcp-inspector'
  | 'identity'
  | 'ticketing'
  | 'cloud'
  | 'source-control';

export interface ScopeEntry {
  id: string;
  label: string;
  included: boolean;
}

export interface Integration {
  id: string;
  name: string;
  kind: IntegrationKind;
  description: string;
  capabilities: string[];
  status: 'connected' | 'error' | 'not-connected';
  errorMessage?: string;
  lastSyncAt?: string;
  scope: ScopeEntry[];
}

export interface EvidenceRecord {
  seq: number;
  timestamp: string;
  tenantId: string;
  eventType: string;
  endpoint: string;
  /** Pseudonymous data subject the record belongs to, used by the erasure flow. */
  subjectId: string;
  /** Keyed digest of the content; the content itself is never stored. */
  digest: string;
  /** L1: hash chain. */
  prevHash: string;
  hash: string;
  /** L2: Merkle batch. */
  leafIndex: number;
  batchId: number;
  merkleRoot: string;
  /** L3: external timestamp anchor (stub). */
  anchor: { provider: string; token: string; anchoredAt: string };
}

export type LayerId = 'L1' | 'L2' | 'L3';

export interface LayerResult {
  layer: LayerId;
  ok: boolean;
  message: string;
}

export interface RangeVerification {
  fromSeq: number;
  toSeq: number;
  ok: boolean;
  layers: LayerResult[];
}

export type QuarantineBand = 'high' | 'medium' | 'low';

export interface QuarantineItem {
  id: string;
  receivedAt: string;
  endpoint: string;
  policyBundleId: string;
  /** Classifier score in [0, 1] (stub classifier). */
  score: number;
  band: QuarantineBand;
  summary: string;
}

export type EscalationLevel = 'primary' | 'secondary' | 'manager' | 'expired';

export interface Escalation {
  level: EscalationLevel;
  businessMinutes: number;
  /** When the next level is reached; absent once expired. */
  nextAt?: string;
}

export type LineageKind = 'agent' | 'llm' | 'mcp-tool' | 'rejected';
export type LineageOutcome = 'success' | 'error' | 'cancelled' | 'abandoned';

export interface LineageNode {
  id: string;
  traceId: string;
  parentId: string | null;
  kind: LineageKind;
  label: string;
  outcome: LineageOutcome;
  startedAt: string;
  durationMs: number;
}

export interface LineageTrace {
  id: string;
  name: string;
  description: string;
}

export type BundleClass = 'A' | 'B' | 'C';
export type BreachBehaviour = 'fail-closed' | 'quarantine' | 'fail-open';

export interface PolicyBundle {
  id: string;
  name: string;
  description: string;
  /** Bundles for the prohibited practices of Art. 5. */
  article5: boolean;
  class?: BundleClass;
  budgetMs?: number;
  breach: BreachBehaviour;
  version: string;
}

export interface LatencyProfile {
  id: 'lite' | 'full';
  name: string;
  /** Total configured budget per request, in ms. */
  budgetMs: number;
}

export interface PrivacyEndpoint {
  id: string;
  name: string;
  path: string;
  contentLogging: boolean;
}

export type SectionSource = 'runtime' | 'template' | 'customer';
export type AssessmentRoute = 'self-assessment' | 'notified-body';

export interface PackageSection {
  id: string;
  title: string;
  source: SectionSource;
  /** Part of the Annex IV technical documentation inputs. */
  annexIv: boolean;
  routes: AssessmentRoute[];
  summary: string;
}

export type ApprovalRole = 'Drafter' | 'Compliance Lead' | 'CEO';

export interface ApprovalStep {
  role: ApprovalRole;
  personId: string;
  approvedAt?: string;
}

export interface QmsTemplate {
  id: string;
  title: string;
  frameworkItemIds: string[];
  version: string;
  chain: ApprovalStep[];
}

export interface ComplianceDocument {
  id: string;
  name: string;
  ownerId: string;
  status: 'draft' | 'approved';
  cadence: 'quarterly' | 'semi-annual' | 'annual';
  lastReviewed: string;
  nextReview: string;
  frameworkItemIds: string[];
  /** Assistant note when the evidence does not show what the control needs. */
  assistantFlag?: string;
  history: HistoryEntry[];
  comments: Comment[];
}

export interface Policy {
  id: string;
  name: string;
  ownerId: string;
  version: string;
  status: 'draft' | 'approved';
  approverIds: string[];
  renewalDate: string;
  frameworkItemIds: string[];
  history: HistoryEntry[];
  comments: Comment[];
}

export interface RiskScore {
  likelihood: number;
  impact: number;
}

export interface Risk {
  id: string;
  scenario: string;
  category: string;
  ownerId: string;
  inherent: RiskScore;
  treatment: 'mitigate' | 'accept' | 'transfer' | 'avoid';
  residual: RiskScore;
  status: 'open' | 'in-treatment' | 'accepted' | 'closed';
  dueDate: string;
  controlIds: string[];
  frameworkItemIds: string[];
  history: HistoryEntry[];
  comments: Comment[];
}

export type AuditItemState = 'not-ready' | 'flagged' | 'ready' | 'accepted' | 'not-applicable';

export interface AuditRequest {
  id: string;
  request: string;
  controlId: string;
  state: AuditItemState;
  note?: string;
}

export interface Audit {
  id: string;
  name: string;
  framework: FrameworkId;
  firm: string;
  periodStart: string;
  periodEnd: string;
  requests: AuditRequest[];
}

/** Where an approved document or policy stands against its review or renewal date. */
export type ReviewState = 'current' | 'review-overdue' | 'renewal-expired';

/** A console object a public trust claim rests on. */
export type TrustRef =
  { kind: 'control' | 'policy' | 'document'; id: string } | { kind: 'verification' };

export type TrustStatus = 'in-place' | 'under-remediation' | 'in-progress';

/** One public claim. Its status is derived from `refs`, never set by hand. */
export interface TrustEntry {
  name: string;
  refs: TrustRef[];
  /** Not built yet: shows "In progress" while its references hold; a failing one still wins. */
  planned?: boolean;
}

export interface TrustCategory {
  id: string;
  name: string;
  entries: TrustEntry[];
}

/** One stage of the request pipeline with its configured budget and seeded latency. */
export interface PipelineStage {
  id: string;
  name: string;
  budgetMs: number;
  /** Seeded, not measured. */
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  breaches24h: number;
  breaches7d: number;
}

export type BreakerState = 'closed' | 'open' | 'half-open';

/** The circuit breaker on the customer side of the sidecar (stub). */
export interface CircuitBreaker {
  state: BreakerState;
  /** Failed or timed-out calls inside the window that open the breaker. */
  tripFailures: number;
  windowSeconds: number;
  lastTransition: { at: string; from: BreakerState; to: BreakerState };
}

/** What the tenant's application does when NAG cannot be reached. */
export type FallbackMode = 'bypass' | 'hard-stop';

/** One searchable console object, for the command search. */
export interface SearchEntry {
  kind: 'test' | 'control' | 'document' | 'policy' | 'risk' | 'article' | 'system';
  id: string;
  label: string;
  href: string;
}

export interface DailyPosture {
  date: string;
  passingPct: number;
}
