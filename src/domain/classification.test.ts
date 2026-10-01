import { describe, expect, it } from 'vitest';
import { aiSystems } from '../seed/systems';
import { classify, riskTierLabel, roleLabel } from './classification';
import type { ClassificationAnswers, RoleAnswers } from './types';

const no = { answer: false, reason: 'r' };
const yes = { answer: true, reason: 'r' };

const base: ClassificationAnswers = {
  inScope: yes,
  prohibited: no,
  annexI: no,
  annexIII: { area: null, profilesPeople: false, exemptionHolds: false, reason: 'r' },
  transparency: no,
};

const deployer: RoleAnswers = {
  builtBy: 'third-party',
  marketedUnder: 'third-party',
  substantiallyModified: false,
  repurposed: false,
  art25MakesProvider: false,
  usedUnderOwnAuthority: true,
  reason: 'r',
};

const area = (profilesPeople: boolean, exemptionHolds: boolean) => ({
  ...base,
  annexIII: { area: 'employment', profilesPeople, exemptionHolds, reason: 'r' },
});

describe('classify', () => {
  it('gives each seeded system the risk tier and role it was recorded with', () => {
    const result = Object.fromEntries(
      aiSystems.map((s) => {
        const c = classify(s.answers, s.roleAnswers);
        return [s.id, [c.riskTier, c.path, c.transparency, c.roles]];
      }),
    );
    expect(result).toEqual({
      'sys-credit': ['high', 'annex-iii', false, ['provider', 'deployer']],
      'sys-support': ['transparency', undefined, true, ['provider', 'deployer']],
      'sys-router': ['minimal', undefined, false, ['deployer']],
    });
  });

  it('writes one reasoning line per step plus the role', () => {
    for (const s of aiSystems) {
      const lines = classify(s.answers, s.roleAnswers).reasoning;
      expect(lines.map((l) => l.step.slice(0, 2))).toEqual([
        '1.',
        '2.',
        '3.',
        '4.',
        '5.',
        '6.',
        'Ro',
      ]);
      expect(lines.every((l) => l.reason.length > 0)).toBe(true);
    }
  });

  it('stops at a system outside the Act', () => {
    const c = classify({ ...base, inScope: no }, deployer);
    expect(c.riskTier).toBeNull();
    expect(c.reasoning.slice(1, 6).every((l) => l.answer === 'Not reached')).toBe(true);
  });

  it('stops at a prohibited practice', () => {
    const c = classify({ ...base, prohibited: yes }, deployer);
    expect(c.riskTier).toBe('prohibited');
    expect(c.reasoning[2]!.answer).toBe('Not reached');
  });

  it('makes an Annex I safety component high-risk and skips Annex III', () => {
    const c = classify({ ...base, annexI: yes, transparency: yes }, deployer);
    expect([c.riskTier, c.path, c.transparency]).toEqual(['high', 'annex-i', true]);
    expect(c.reasoning[3]!.answer).toBe('Not reached');
    expect(c.reasoning[5]!.answer).toBe('No');
  });

  it('keeps an Annex III system high-risk unless the exemption holds without profiling', () => {
    expect(classify(area(true, true), deployer).riskTier).toBe('high');
    expect(classify(area(false, false), deployer).riskTier).toBe('high');
    expect(classify(area(false, false), deployer).path).toBe('annex-iii');
    const exempt = classify(area(false, true), deployer);
    expect(exempt.riskTier).toBe('minimal');
    expect(exempt.reasoning[3]!.answer).toContain('exemption holds');
    expect(classify({ ...area(false, true), transparency: yes }, deployer).riskTier).toBe(
      'transparency',
    );
  });

  it('derives the role from who built, marketed or changed the system', () => {
    const roles = (r: Partial<RoleAnswers>) => classify(base, { ...deployer, ...r }).roles;
    expect(roles({})).toEqual(['deployer']);
    expect(roles({ marketedUnder: 'tenant' })).toEqual(['provider', 'deployer']);
    expect(roles({ art25MakesProvider: true })).toEqual(['provider', 'deployer']);
    expect(roles({ builtBy: 'tenant', usedUnderOwnAuthority: false })).toEqual(['provider']);
    expect(roles({ usedUnderOwnAuthority: false })).toEqual([]);
  });
});

describe('labels', () => {
  it('names every risk tier with its number', () => {
    expect(riskTierLabel('prohibited')).toBe('Risk tier 1 · Prohibited');
    expect(riskTierLabel('high')).toBe('Risk tier 2 · High');
    expect(riskTierLabel('transparency')).toBe('Risk tier 3 · Limited (transparency)');
    expect(riskTierLabel('minimal')).toBe('Risk tier 4 · Minimal');
    expect(riskTierLabel(null)).toBe('Outside the Act');
  });

  it('names roles', () => {
    expect(roleLabel(['provider', 'deployer'])).toBe('Provider and deployer');
    expect(roleLabel(['deployer'])).toBe('Deployer');
    expect(roleLabel([])).toBe('None');
  });
});
