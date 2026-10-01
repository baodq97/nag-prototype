import type { LatencyProfile, PolicyBundle } from './types';

export type BundleLoad = { state: 'loaded' } | { state: 'rejected'; reason: string };

/** A bundle must declare its class and latency budget, or it is rejected at load. */
export function bundleLoad(bundle: PolicyBundle): BundleLoad {
  const missing = [
    bundle.class === undefined ? 'class' : null,
    bundle.budgetMs === undefined ? 'latency budget' : null,
  ].filter((m): m is string => m !== null);
  return missing.length === 0
    ? { state: 'loaded' }
    : { state: 'rejected', reason: `No declared ${missing.join(' or ')}` };
}

/** Whether a bundle's configured budget fits within a profile's per-request budget. */
export function fitsProfile(bundle: PolicyBundle, profile: LatencyProfile): boolean {
  return bundle.budgetMs !== undefined && bundle.budgetMs <= profile.budgetMs;
}
