import { expect, it } from 'vitest';
import { risks } from '../seed/governance';
import { residualWithinInherent, riskLevel, riskScoreProblems, score } from './risk';
import type { Risk } from './types';

it('scores likelihood × impact and bands the result', () => {
  expect(score({ likelihood: 3, impact: 5 })).toBe(15);
  expect(riskLevel(15)).toBe('high');
  expect(riskLevel(8)).toBe('medium');
  expect(riskLevel(7)).toBe('low');
});

it('never has a residual score above the inherent score in the seed', () => {
  expect(risks.length).toBeGreaterThanOrEqual(10);
  for (const r of risks) {
    expect(residualWithinInherent(r)).toBe(true);
    expect(riskScoreProblems(r)).toEqual([]);
  }
});

it('reports a residual above inherent and scores out of range', () => {
  const bad: Risk = {
    ...risks[0]!,
    inherent: { likelihood: 2, impact: 2 },
    residual: { likelihood: 3, impact: 6 },
  };
  expect(residualWithinInherent(bad)).toBe(false);
  expect(riskScoreProblems(bad)).toEqual([
    'residual score out of 1–5',
    'residual score is above inherent score',
  ]);
});
