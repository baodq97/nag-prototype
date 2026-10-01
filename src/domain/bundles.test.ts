import { expect, it } from 'vitest';
import { latencyProfiles, policyBundles } from '../seed/runtime';
import { bundleLoad, fitsProfile } from './bundles';

const [lite, full] = latencyProfiles as [(typeof latencyProfiles)[0], (typeof latencyProfiles)[0]];

it('rejects a bundle without a class or budget at load', () => {
  const rejected = policyBundles.filter((b) => bundleLoad(b).state === 'rejected');
  expect(rejected.map((b) => b.id)).toEqual(['PB-13']);
  expect(bundleLoad(rejected[0]!)).toEqual({
    state: 'rejected',
    reason: 'No declared class or latency budget',
  });
  expect(bundleLoad({ ...policyBundles[0]!, budgetMs: undefined })).toEqual({
    state: 'rejected',
    reason: 'No declared latency budget',
  });
});

it('compares budgets with the lite and full profiles', () => {
  const credit = policyBundles.find((b) => b.id === 'PB-11')!;
  expect(fitsProfile(credit, lite)).toBe(false);
  expect(fitsProfile(credit, full)).toBe(true);
  expect(fitsProfile(policyBundles[0]!, lite)).toBe(true);
  expect(
    fitsProfile(
      policyBundles.find((b) => b.id === 'PB-13')!,
      full,
    ),
  ).toBe(false);
});
