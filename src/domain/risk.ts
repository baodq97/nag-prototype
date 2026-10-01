import type { Risk, RiskScore } from './types';

/** Likelihood × impact, each on a 1–5 scale. */
export function score(s: RiskScore): number {
  return s.likelihood * s.impact;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export function riskLevel(value: number): RiskLevel {
  if (value >= 15) return 'high';
  if (value >= 8) return 'medium';
  return 'low';
}

/** A treatment can only lower a risk: residual must not exceed inherent. */
export function residualWithinInherent(risk: Risk): boolean {
  return score(risk.residual) <= score(risk.inherent);
}

/** Problems with a risk's scores; empty when it is consistent. */
export function riskScoreProblems(risk: Risk): string[] {
  const problems: string[] = [];
  for (const [name, s] of [
    ['inherent', risk.inherent],
    ['residual', risk.residual],
  ] as const) {
    for (const v of [s.likelihood, s.impact]) {
      if (!Number.isInteger(v) || v < 1 || v > 5) problems.push(`${name} score out of 1–5`);
    }
  }
  if (!residualWithinInherent(risk)) problems.push('residual score is above inherent score');
  return problems;
}
