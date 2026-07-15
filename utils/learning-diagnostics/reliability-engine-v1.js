/**
 * Data trust / effort / inconsistency signals for diagnostic confidence adjustment.
 */

import { normalizeMistakeEvent } from "../mistake-event.js";

export const RELIABILITY_ENGINE_V1 = "1.0.0";

const FAST_WRONG = 6000;
const VERY_FAST = 3500;

/**
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, unknown[]>} rawMistakesBySubject
 * @param {number} startMs
 * @param {number} endMs
 */
export function assessReliabilityV1(maps, rawMistakesBySubject, startMs, endMs) {
  let totalQ = 0;
  const subjects = Object.keys(maps || {});
  /** @type {number[]} */
  const rowAccuracies = [];
  for (const sid of subjects) {
    const tm = maps[sid];
    if (!tm) continue;
    for (const row of Object.values(tm)) {
      const q = Number(row?.questions) || 0;
      totalQ += q;
      const acc = Number(row?.accuracy);
      if (q > 0 && Number.isFinite(acc)) rowAccuracies.push(acc);
    }
  }

  let accSpread = 0;
  if (rowAccuracies.length >= 2) {
    accSpread = Math.max(...rowAccuracies) - Math.min(...rowAccuracies);
  }

  let fastWrong = 0;
  let slowCorrect = 0;
  let wrongTotal = 0;
  const subs = ["math", "hebrew", "english", "science", "geometry", "moledet-geography"];
  for (const sid of subs) {
    const raw = rawMistakesBySubject?.[sid] || [];
    for (const m of raw) {
      const ev = normalizeMistakeEvent(m, sid);
      const t = Number(ev.timestamp);
      if (!Number.isFinite(t) || t < startMs || t > endMs) continue;
      const ms = Number(ev.responseMs);
      if (!ev.isCorrect) {
        wrongTotal += 1;
        if (Number.isFinite(ms) && ms < FAST_WRONG) fastWrong += 1;
        if (Number.isFinite(ms) && ms < VERY_FAST) fastWrong += 0.5;
      } else if (ev.isCorrect && Number.isFinite(ms) && ms > 40000) {
        slowCorrect += 1;
      }
    }
  }

  const guessingLikelihood = wrongTotal > 0 ? Math.min(1, fastWrong / (wrongTotal * 1.2)) : 0;

  let inconsistencyLevel = "low";
  if (accSpread >= 45 && rowAccuracies.length >= 3) inconsistencyLevel = "high";
  else if (accSpread >= 28) inconsistencyLevel = "medium";

  let reliabilityScore = 55;
  if (totalQ >= 80) reliabilityScore += 20;
  else if (totalQ >= 40) reliabilityScore += 12;
  else if (totalQ >= 25) reliabilityScore += 6;

  if (totalQ < 12) {
    reliabilityScore -= 28;
    inconsistencyLevel = inconsistencyLevel === "low" ? "high" : inconsistencyLevel;
  }
  if (guessingLikelihood > 0.45) {
    reliabilityScore -= 18;
    inconsistencyLevel = inconsistencyLevel === "low" ? "medium" : inconsistencyLevel;
  }
  if (inconsistencyLevel === "high") reliabilityScore -= 14;
  else if (inconsistencyLevel === "medium") reliabilityScore -= 8;

  const dataTrustLevel =
    reliabilityScore >= 72 ? "high" : reliabilityScore >= 58 ? "moderate" : reliabilityScore >= 42 ? "low" : "very_low";

  return {
    version: RELIABILITY_ENGINE_V1,
    reliabilityScore: Math.max(0, Math.min(100, reliabilityScore)),
    dataTrustLevel,
    effortSignal: fastWrong > 3 ? "fast_attempts_observed" : "neutral",
    guessingLikelihood: Math.round(guessingLikelihood * 100) / 100,
    inconsistencyLevel,
    accuracySpreadAcrossRows: Math.round(accSpread * 10) / 10,
    pacePattern: fastWrong > slowCorrect ? "fast_errors_dominate" : "mixed",
    confidenceAdjustment:
      guessingLikelihood > 0.35 ? -0.15 : totalQ < 12 ? -0.22 : inconsistencyLevel === "high" ? -0.12 : 0,
    reasoning: [
      totalQ < 12 ? "Thin volume lowers trust in diagnostic conclusions." : "Volume supports stronger reliability.",
      slowCorrect >= fastWrong && slowCorrect > 0
        ? "Slow correct responses are treated as effortful success-not automatic weakness."
        : "Review pacing signals separately from knowledge gaps.",
      inconsistencyLevel !== "low"
        ? "Large accuracy spread across rows suggests unstable performance or mixed contexts."
        : "Row-level accuracy is relatively consistent.",
    ],
  };
}
