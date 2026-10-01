// Rules over the EU AI Act article map: a row's coverage status, whether a row applies to a
// system, which application date a system sees, and the serious-incident reporting clocks.
// Everything here is orientation to support compliance readiness, not legal advice.

import { DAY_MS, daysUntil } from './time';
import type {
  AnnexPath,
  ApplicationDate,
  ArticleRow,
  Classification,
  Control,
  CoverageAttention,
  CoverageStatus,
  Duty,
  IncidentKind,
  NagRole,
  OperatorRole,
} from './types';

export const NAG_ROLE_LABEL: Record<NagRole, string> = {
  control: 'NAG is the control',
  supports: 'NAG supports',
  outside: 'Outside NAG scope',
};

export const COVERAGE_STATUS_LABEL: Record<CoverageStatus, string> = {
  covered: 'Covered',
  'needs-attention': 'Needs attention',
  shared: 'Shared',
  outside: 'Outside NAG scope',
};

export const ROLE_LABEL: Record<OperatorRole, string> = {
  provider: 'Provider',
  deployer: 'Deployer',
};

/** "Must", "Only if <condition>" or "Not applicable". */
export function dutyLabel(duty: Duty): string {
  if (duty.kind === 'must') return 'Must';
  if (duty.kind === 'only-if') return `Only if ${duty.condition}`;
  return 'Not applicable';
}

export const owes = (duty: Duty) => duty.kind !== 'not-applicable';

/** The roles that owe a duty on the row, in a fixed order. */
export function owedBy(row: Pick<ArticleRow, 'provider' | 'deployer'>): OperatorRole[] {
  return (['provider', 'deployer'] as const).filter((r) => owes(row[r]));
}

/**
 * Status derived from NAG's role and the linked controls, never seeded:
 * outside scope stays outside; any failing control needs attention; NAG as the control with
 * at least one control and one test, all passing, is covered; everything else is shared.
 */
export function coverageStatus(
  nagRole: NagRole,
  controlsOk: boolean[],
  testCount: number,
): CoverageStatus {
  if (nagRole === 'outside') return 'outside';
  if (controlsOk.some((ok) => !ok)) return 'needs-attention';
  if (nagRole === 'control' && controlsOk.length > 0 && testCount > 0) return 'covered';
  return 'shared';
}

/**
 * The next step on a row that needs attention: a linked control with a failing test, and that
 * test. A failing test that is also linked to the row itself comes first, so the step fits the
 * row; otherwise the first failing control. Undefined while every linked control passes.
 */
export function attentionFor(
  controls: Pick<Control, 'id' | 'testIds'>[],
  isFailing: (testId: string) => boolean,
  rowTestIds: string[] = [],
): CoverageAttention | undefined {
  const pick = (accept: (testId: string) => boolean) => {
    for (const control of controls) {
      const testId = control.testIds.find((id) => isFailing(id) && accept(id));
      if (testId) return { controlId: control.id, testId };
    }
    return undefined;
  };
  return pick((id) => rowTestIds.includes(id)) ?? pick(() => true);
}

/** Role filter of the coverage table: one role, or "both" for a row either role owes. */
export type RoleFilter = OperatorRole | 'both';

export function rowOwedBy(row: Pick<ArticleRow, 'provider' | 'deployer'>, role: RoleFilter) {
  const roles: OperatorRole[] = role === 'both' ? ['provider', 'deployer'] : [role];
  return roles.some((r) => owes(row[r]));
}

/**
 * A row applies to a system when its risk tiers hold the system's risk tier (or the system has
 * a transparency trigger and the row is a transparency row), and one of the system's roles
 * owes it.
 */
export function appliesTo(
  row: Pick<ArticleRow, 'group' | 'riskTiers' | 'provider' | 'deployer'>,
  system: Pick<Classification, 'riskTier' | 'transparency' | 'roles'>,
): boolean {
  const tierMatch =
    (system.riskTier !== null && row.riskTiers.includes(system.riskTier)) ||
    (system.transparency && row.group === 'T');
  return tierMatch && system.roles.some((r) => owes(row[r]));
}

/** The dates a system on `path` sees; without a path, or with no match, every date. */
export function datesForPath(dates: ApplicationDate[], path?: AnnexPath): ApplicationDate[] {
  if (!path) return dates;
  const seen = dates.filter((d) => !d.path || d.path === path);
  return seen.length > 0 ? seen : dates;
}

export interface DateChip {
  appliesNow: boolean;
  label: string;
}

/** "Applies now" on or after the date (tenant calendar day), otherwise "From <date>". */
export function dateChip(date: string, now: string, timeZone: string): DateChip {
  const appliesNow = daysUntil(date, now, timeZone) <= 0;
  return { appliesNow, label: appliesNow ? 'Applies now' : `From ${date}` };
}

/** Days a provider has to report a serious incident after becoming aware of it. */
export const INCIDENT_CLOCK_DAYS: Record<IncidentKind, number> = {
  'widespread-or-critical': 2,
  death: 10,
  serious: 15,
};

export const INCIDENT_KIND_LABEL: Record<IncidentKind, string> = {
  'widespread-or-critical':
    'Widespread infringement or serious disruption of critical infrastructure',
  death: 'Death of a person',
  serious: 'Any other serious incident',
};

export interface IncidentClock {
  kind: IncidentKind;
  days: number;
  /** Latest report date, YYYY-MM-DD, counted from the day of awareness. */
  reportBy: string;
}

/** The reporting clock for an incident the provider became aware of on `awareOn` (YYYY-MM-DD). */
export function incidentClock(kind: IncidentKind, awareOn: string): IncidentClock {
  const days = INCIDENT_CLOCK_DAYS[kind];
  const reportBy = new Date(Date.parse(awareOn) + days * DAY_MS).toISOString().slice(0, 10);
  return { kind, days, reportBy };
}

/** The shortest clock that holds when an incident matches several kinds. */
export function strictestClock(kinds: IncidentKind[], awareOn: string): IncidentClock | null {
  const clocks = kinds.map((k) => incidentClock(k, awareOn)).sort((a, b) => a.days - b.days);
  return clocks[0] ?? null;
}
