import type {
  BreachBehaviour,
  BundleClass,
  FallbackMode,
  PipelineStage,
  PolicyBundle,
} from './types';

export type Percentile = 'p50' | 'p95' | 'p99';

export interface StageHealth extends PipelineStage {
  /** Percentiles whose seeded latency is above the stage budget. */
  over: Percentile[];
}

export function stageHealth(stage: PipelineStage): StageHealth {
  const values: [Percentile, number][] = [
    ['p50', stage.p50Ms],
    ['p95', stage.p95Ms],
    ['p99', stage.p99Ms],
  ];
  return { ...stage, over: values.filter(([, ms]) => ms > stage.budgetMs).map(([p]) => p) };
}

export function breachTotals(stages: PipelineStage[]): { last24h: number; last7d: number } {
  return {
    last24h: stages.reduce((n, s) => n + s.breaches24h, 0),
    last7d: stages.reduce((n, s) => n + s.breaches7d, 0),
  };
}

/** What happens to the request when a check of this behaviour fails or runs out of time. */
export const BREACH_EFFECT: Record<BreachBehaviour, string> = {
  'fail-closed': 'Blocked (fail-closed): the request does not reach the model.',
  quarantine: 'Held in quarantine until a reviewer decides.',
  'fail-open': 'Passed (fail-open), with a breach record in the evidence log.',
};

export interface BlastRadius {
  class: BundleClass;
  behaviours: { breach: BreachBehaviour; effect: string; bundleIds: string[] }[];
}

/** Per check class, the breach behaviours its bundles declare, as /policy-bundles shows them. */
export function blastRadius(bundles: PolicyBundle[]): BlastRadius[] {
  return (['A', 'B', 'C'] as const).map((cls) => {
    const inClass = bundles.filter((b) => b.class === cls);
    const breaches = [...new Set(inClass.map((b) => b.breach))];
    return {
      class: cls,
      behaviours: breaches.map((breach) => ({
        breach,
        effect: BREACH_EFFECT[breach],
        bundleIds: inClass.filter((b) => b.breach === breach).map((b) => b.id),
      })),
    };
  });
}

/** The effect of each fallback choice, as the confirmation dialog states it. */
export const FALLBACK_EFFECT: Record<FallbackMode, string> = {
  'hard-stop':
    'Hard stop: while NAG cannot be reached, AI requests are refused. Nothing passes unchecked and the evidence log stays complete, but users see errors until NAG is back.',
  bypass:
    'Bypass: while NAG cannot be reached, AI requests go straight to the model without checks. Requests that pass in bypass mode create no evidence records, so this time shows up later as a gap in the evidence log.',
};
