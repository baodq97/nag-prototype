// Replays the recorded classification answers of an AI system into its risk tier, its
// transparency flag and the tenant's role. It is not a classification engine: a person gave
// the answers, this only applies the order of the steps to them.

import type {
  AnnexPath,
  Classification,
  ClassificationAnswers,
  OperatorRole,
  ReasoningLine,
  RiskTier,
  RoleAnswers,
} from './types';

export const RISK_TIER_NUMBER: Record<RiskTier, number> = {
  prohibited: 1,
  high: 2,
  transparency: 3,
  minimal: 4,
};

export const RISK_TIER_NAME: Record<RiskTier, string> = {
  prohibited: 'Unacceptable',
  high: 'High',
  transparency: 'Limited',
  minimal: 'Minimal',
};

/** One plain sentence per risk tier for the chip's tooltip; `none` is a system with no risk tier. */
export const RISK_TIER_DESCRIPTION: Record<RiskTier | 'none', string> = {
  prohibited: 'A prohibited practice: the system may not be placed on the market or used.',
  high: 'High-risk: the full set of provider and deployer duties applies.',
  transparency:
    'Limited risk: transparency duties apply, such as telling people they deal with an AI system.',
  minimal: 'Minimal risk: no specific duties beyond AI literacy.',
  none: 'No risk tier: the recorded answers place the system outside the Act.',
};

/** "Risk tier 2 · High"; a system with no risk tier is "Not classified". */
export function riskTierLabel(riskTier: RiskTier | null): string {
  return riskTier
    ? `Risk tier ${RISK_TIER_NUMBER[riskTier]} · ${RISK_TIER_NAME[riskTier]}`
    : 'Not classified';
}

const yesNo = (b: boolean) => (b ? 'Yes' : 'No');
const NOT_REACHED = 'Not reached';
const SKIPPED = 'Skipped';
const CONTINUE = 'Continue';
const END = 'End';

const STEPS = [
  '1. In scope of the Act?',
  '2. Prohibited practice?',
  '3. Safety component under Annex I?',
  '4. In an Annex III area?',
  '5. Transparency trigger?',
  '6. Otherwise minimal?',
] as const;

/**
 * The role first, then the six steps in order; the first step that decides a risk tier ends the
 * search. Every line carries its outcome, e.g. "Status: high risk", "Duty: transparency", "End".
 */
export function classify(answers: ClassificationAnswers, roleAnswers: RoleAnswers): Classification {
  const reasoning: ReasoningLine[] = [];
  const result = roles(roleAnswers, reasoning);
  const line = (step: string, answer: string, reason: string, outcome: string) =>
    reasoning.push({ step, answer, reason, outcome });
  const done = (riskTier: RiskTier | null, transparency = false, path?: AnnexPath) => ({
    riskTier,
    path,
    transparency,
    roles: result,
    reasoning,
  });

  line(
    STEPS[0],
    yesNo(answers.inScope.answer),
    answers.inScope.reason,
    answers.inScope.answer ? CONTINUE : 'Status: outside the Act',
  );
  if (!answers.inScope.answer) {
    for (const step of STEPS.slice(1))
      line(step, NOT_REACHED, 'The system is outside the Act.', SKIPPED);
    return done(null);
  }

  line(
    STEPS[1],
    yesNo(answers.prohibited.answer),
    answers.prohibited.reason,
    answers.prohibited.answer ? 'Status: prohibited' : CONTINUE,
  );
  if (answers.prohibited.answer) {
    for (const step of STEPS.slice(2))
      line(step, NOT_REACHED, 'The practice is not allowed.', SKIPPED);
    return done('prohibited');
  }

  let riskTier: RiskTier | null = null;
  let path: AnnexPath | undefined;
  const HIGH = 'Status: high risk';

  line(
    STEPS[2],
    yesNo(answers.annexI.answer),
    answers.annexI.reason,
    answers.annexI.answer ? HIGH : CONTINUE,
  );
  if (answers.annexI.answer) {
    riskTier = 'high';
    path = 'annex-i';
    line(STEPS[3], NOT_REACHED, 'Already high-risk through Annex I.', SKIPPED);
  } else {
    const a = answers.annexIII;
    if (a.area === null) {
      line(STEPS[3], 'No', a.reason, CONTINUE);
    } else if (a.profilesPeople) {
      riskTier = 'high';
      path = 'annex-iii';
      line(
        STEPS[3],
        `Yes: ${a.area}; profiles people, so the exemption cannot hold`,
        a.reason,
        HIGH,
      );
    } else if (a.exemptionHolds) {
      line(STEPS[3], `Yes: ${a.area}; the Art. 6(3) exemption holds`, a.reason, CONTINUE);
    } else {
      riskTier = 'high';
      path = 'annex-iii';
      line(STEPS[3], `Yes: ${a.area}; the Art. 6(3) exemption does not hold`, a.reason, HIGH);
    }
  }

  const transparency = answers.transparency.answer;
  line(
    STEPS[4],
    yesNo(transparency),
    answers.transparency.reason,
    transparency ? 'Duty: transparency' : CONTINUE,
  );
  if (riskTier === null && transparency) riskTier = 'transparency';

  if (riskTier === null) {
    riskTier = 'minimal';
    line(STEPS[5], 'Yes', 'No earlier step applies.', 'Status: minimal risk');
  } else {
    line(STEPS[5], 'No', 'An earlier step decided the risk tier.', END);
  }

  return done(riskTier, transparency, path);
}

/**
 * Provider when the tenant built or markets it, or when Art. 25 makes it one; deployer when it
 * uses it. The line says when a deployer's own change turned it into the provider.
 */
function roles(r: RoleAnswers, reasoning: ReasoningLine[]): OperatorRole[] {
  const ownsIt = r.builtBy === 'tenant' || r.marketedUnder === 'tenant';
  const provider = ownsIt || r.art25MakesProvider;
  const result: OperatorRole[] = [];
  if (provider) result.push('provider');
  if (r.usedUnderOwnAuthority) result.push('deployer');
  const change = r.repurposed
    ? 'changed the intended purpose'
    : 'substantially modified the system';
  reasoning.push({
    step: 'Role',
    answer:
      !ownsIt && r.art25MakesProvider
        ? `${roleLabel(result)}: as deployer, the tenant ${change}, so Art. 25 makes it the provider`
        : roleLabel(result),
    reason: r.reason,
    outcome: `Role: ${roleLabel(result).toLowerCase()}`,
  });
  return result;
}

/** "Provider and deployer", "Deployer", or "None". */
export function roleLabel(roles: OperatorRole[]): string {
  if (roles.length === 0) return 'None';
  const text = roles.join(' and ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
