import type { ClassifierBand, ClassifierConfig, QuarantineBand } from './types';

// The classifier only scores; the band follows from the score and the configured bounds.
// Escalation does not depend on the band.

/** The band a score falls in, or null when it is below the release threshold. */
export function bandFor(score: number, config: ClassifierConfig): QuarantineBand | null {
  if (!(score >= 0 && score <= 1)) throw new RangeError(`Score ${score} is outside [0, 1]`);
  if (score < config.releaseThreshold) return null;
  const sorted = [...config.bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => score >= b.min)?.band ?? null;
}

/** The bands from the lowest bound up, each with the score it runs to (exclusive). */
export function bandRanges(config: ClassifierConfig): (ClassifierBand & { max: number })[] {
  const sorted = [...config.bands].sort((a, b) => a.min - b.min);
  return sorted.map((b, i) => ({ ...b, max: sorted[i + 1]?.min ?? 1 }));
}

/** "0.77 ≥ 0.60 (medium)": the score next to the lower bound of its band. */
export function bandLine(score: number, config: ClassifierConfig): string {
  const band = bandFor(score, config);
  if (!band) {
    return `${score.toFixed(2)} < ${config.releaseThreshold.toFixed(2)} (released)`;
  }
  const min = config.bands.find((b) => b.band === band)!.min;
  return `${score.toFixed(2)} ≥ ${min.toFixed(2)} (${band})`;
}
