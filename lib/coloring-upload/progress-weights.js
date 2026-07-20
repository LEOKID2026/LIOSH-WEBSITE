import { PROGRESS_PHASE } from "./constants.js";

/** Weighted progress inside the OpenCV worker — sums to 100. */
export const PROGRESS_WEIGHTS = {
  [PROGRESS_PHASE.LOAD]: 8,
  [PROGRESS_PHASE.PREP]: 8,
  [PROGRESS_PHASE.PREPROCESS]: 24,
  [PROGRESS_PHASE.LINES]: 35,
  [PROGRESS_PHASE.METRICS]: 5,
  [PROGRESS_PHASE.OUTPUT]: 20,
};

/**
 * @param {Record<string, number>} phaseProgress 0–1 per phase
 */
export function computeWeightedPercent(phaseProgress) {
  let total = 0;
  for (const [phase, weight] of Object.entries(PROGRESS_WEIGHTS)) {
    const p = Math.max(0, Math.min(1, phaseProgress[phase] ?? 0));
    total += p * weight;
  }
  return Math.round(Math.max(0, Math.min(100, total)));
}
