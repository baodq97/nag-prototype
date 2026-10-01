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
  prohibited: 'Prohibited',
  high: 'High',
  transparency: 'Limited (transparency)',
  minimal: 'Minimal',
};

/** "Risk tier 2 · High"; a system outside the Act has no risk tier. */
export function riskTierLabel(riskTier: RiskTier | null): string {
  return riskTier
    ? `Risk tier ${RISK_TIER_NUMBER[riskTier]} · ${RISK_TIER_NAME[riskTier]}`
    : 'Outside the Act';
}

const yesNo = (b: boolean) => (b ? 'Yes' : 'No');
const NOT_REACHED = 'Not reached';

const STEPS = [
  '1. In scope of the Act?',
  '2. Prohibited practice?',
  '3. Safety component under Annex I?',
  '4. In an Annex III area?',
  '5. Transparency trigger?',
  '6. Otherwise minimal?',
] as const;

/** The six steps in order; the first that decides a risk tier ends the tier search. */
export function classify(answers: ClassificationAnswers, roleAnswers: RoleAnswers): Classification {
  const reasoning: ReasoningLine[] = [];
  const line = (step: string, answer: string, reason: string) =>
    reasoning.push({ step, answer, reason });

  let riskTier: RiskTier | null = null;
  let path: AnnexPath | undefined;
  let transparency = false;

  line(STEPS[0], yesNo(answers.inScope.answer), answers.inScope.reason);
  if (!answers.inScope.answer) {
    for (const step of STEPS.slice(1)) line(step, NOT_REACHED, 'The system is outside the Act.');
    return { riskTier, transparency, roles: roles(roleAnswers, reasoning), reasoning };
  }

  line(STEPS[1], yesNo(answers.prohibited.answer), answers.prohibited.reason);
  if (answers.prohibited.answer) {
    for (const step of STEPS.slice(2)) line(step, NOT_REACHED, 'The practice is not allowed.');
    return {
      riskTier: 'prohibited',
      transparency,
      roles: roles(roleAnswers, reasoning),
      reasoning,
    };
  }

  line(STEPS[2], yesNo(answers.annexI.answer), answers.annexI.reason);
  if (answers.annexI.answer) {
    riskTier = 'high';
    path = 'annex-i';
    line(STEPS[3], NOT_REACHED, 'Already high-risk through Annex I.');
  } else {
    const a = answers.annexIII;
    if (a.area === null) {
      line(STEPS[3], 'No', a.reason);
    } else if (a.profilesPeople) {
      riskTier = 'high';
      path = 'annex-iii';
      line(STEPS[3], `Yes: ${a.area}; profiles people, so the exemption cannot hold`, a.reason);
    } else if (a.exemptionHolds) {
      line(STEPS[3], `Yes: ${a.area}; the Art. 6(3) exemption holds`, a.reason);
    } else {
      riskTier = 'high';
      path = 'annex-iii';
      line(STEPS[3], `Yes: ${a.area}; the Art. 6(3) exemption does not hold`, a.reason);
    }
  }

  transparency = answers.transparency.answer;
  line(STEPS[4], yesNo(transparency), answers.transparency.reason);
  if (riskTier === null && transparency) riskTier = 'transparency';

  if (riskTier === null) {
    riskTier = 'minimal';
    line(STEPS[5], 'Yes', 'No earlier step applies.');
  } else {
    line(STEPS[5], 'No', 'An earlier step decided the risk tier.');
  }

  return { riskTier, path, transparency, roles: roles(roleAnswers, reasoning), reasoning };
}

/** Provider when the tenant built it or Art. 25 makes it one; deployer when it uses it. */
function roles(r: RoleAnswers, reasoning: ReasoningLine[]): OperatorRole[] {
  const provider = r.builtBy === 'tenant' || r.marketedUnder === 'tenant' || r.art25MakesProvider;
  const result: OperatorRole[] = [];
  if (provider) result.push('provider');
  if (r.usedUnderOwnAuthority) result.push('deployer');
  reasoning.push({
    step: 'Role',
    answer: roleLabel(result),
    reason: r.reason,
  });
  return result;
}

/** "Provider and deployer", "Deployer", or "None". */
export function roleLabel(roles: OperatorRole[]): string {
  if (roles.length === 0) return 'None';
  const text = roles.join(' and ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
