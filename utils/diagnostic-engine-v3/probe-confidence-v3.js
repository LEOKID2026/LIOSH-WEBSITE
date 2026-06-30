/**
 * Diagnostic Engine V3 — probeEvidence → confidence adjustments (conservative).
 */

import { normalizeDiagnosticSubjectId } from "../diagnostic-evidence.js";
import { CONFIDENCE_BAND } from "./types.js";
import { ERROR_TYPE_V3 } from "./error-types-v3.js";

/**
 * @typedef {object} ProbeConfidenceContext
 * @property {unknown[]} probeEvidenceList
 * @property {string} subjectId
 * @property {string|null} topic
 * @property {string|null} skill
 * @property {string|null} subskill
 * @property {number} attempts
 * @property {number} wrongCount
 * @property {string|null} dominantErrorType
 * @property {boolean} contradictorySignals
 * @property {object|null} [gradeContext]
 */

/**
 * @param {string} band
 * @param {number} delta
 * @returns {typeof CONFIDENCE_BAND[keyof typeof CONFIDENCE_BAND]}
 */
export function shiftConfidenceBand(band, delta) {
  const order = [CONFIDENCE_BAND.VERY_LOW, CONFIDENCE_BAND.LOW, CONFIDENCE_BAND.MEDIUM, CONFIDENCE_BAND.HIGH];
  const idx = Math.max(0, order.indexOf(band));
  const next = Math.max(0, Math.min(order.length - 1, idx + delta));
  return order[next];
}

/**
 * @param {ProbeConfidenceContext} ctx
 * @returns {{ band: string, probeBoost: number, probePenalty: number, reasons: string[] }}
 */
export function computeProbeConfidenceAdjustment(ctx) {
  /** @type {string[]} */
  const reasons = [];
  let probeBoost = 0;
  let probePenalty = 0;

  const sid = normalizeDiagnosticSubjectId(ctx.subjectId);
  const skillKey = ctx.subskill || ctx.skill || ctx.topic || "";
  const relevant = (ctx.probeEvidenceList || []).filter((p) => {
    if (!p || typeof p !== "object") return false;
    if (normalizeDiagnosticSubjectId(p.subjectId) !== sid) return false;
    const pSkill = String(p.diagnosticSkillId || p.topicId || "");
    if (!skillKey || !pSkill) return true;
    return pSkill === skillKey || String(p.topicId || "") === String(ctx.topic || "");
  });

  for (const p of relevant) {
    const status = String(p.outcomeStatus || "");
    if (status === "supported") {
      probeBoost += 0.12;
      reasons.push("probe_supported");
    } else if (status === "weakened") {
      probePenalty += 0.15;
      reasons.push("probe_weakened");
    } else if (status === "uncertain") {
      probePenalty += 0.05;
      reasons.push("probe_uncertain");
    }
    const support = Number(p.supportCount) || 0;
    const weaken = Number(p.weakenCount) || 0;
    if (support >= 2 && weaken === 0) {
      probeBoost += 0.08;
      reasons.push("probe_recurrence_support");
    }
  }

  if (ctx.wrongCount >= 2 && ctx.dominantErrorType && ctx.dominantErrorType !== ERROR_TYPE_V3.UNKNOWN) {
    probeBoost += 0.06;
    reasons.push("recurring_subskill_error");
  }

  if (ctx.contradictorySignals) {
    probePenalty += 0.2;
    reasons.push("contradictory_signals");
  }

  if (ctx.attempts < 4) {
    probePenalty += 0.1;
    reasons.push("thin_volume");
  }

  if (ctx.dominantErrorType === ERROR_TYPE_V3.UNKNOWN && ctx.wrongCount >= 1) {
    probePenalty += 0.08;
    reasons.push("error_type_unknown");
  }

  const gc = ctx.gradeContext;
  if (gc && typeof gc === "object") {
    if (gc.foundationRisk) {
      probeBoost += 0.05;
      reasons.push("foundation_risk_below_registered");
    }
    if (gc.enrichmentSignal) {
      probeBoost += 0.04;
      reasons.push("enrichment_above_registered");
    }
    if (gc.caveatNeeded && gc.relation === "above_registered_grade" && ctx.wrongCount >= 1) {
      probePenalty += 0.12;
      reasons.push("above_grade_do_not_map_to_registered_gap");
    }
    if (gc.relation === "outside_regular_grade_band") {
      probePenalty += 0.06;
      reasons.push("grade_band_unclear");
    }
  }

  probeBoost = Math.min(0.25, probeBoost);
  probePenalty = Math.min(0.35, probePenalty);

  return { probeBoost, probePenalty, reasons };
}

/**
 * Map numeric score 0–1 to confidence band (conservative thresholds).
 * @param {number} score01
 * @param {ProbeConfidenceContext} ctx
 */
export function scoreToConfidenceBand(score01, ctx) {
  let s = Math.max(0, Math.min(1, Number(score01) || 0));
  const adj = computeProbeConfidenceAdjustment(ctx);
  s += adj.probeBoost - adj.probePenalty;
  s = Math.max(0, Math.min(1, s));

  if (ctx.contradictorySignals || ctx.attempts < 2) return CONFIDENCE_BAND.VERY_LOW;
  if (ctx.attempts < 5 && s < 0.55) return CONFIDENCE_BAND.VERY_LOW;
  if (s < 0.35) return CONFIDENCE_BAND.VERY_LOW;
  if (s < 0.52) return CONFIDENCE_BAND.LOW;
  if (s < 0.72) return CONFIDENCE_BAND.MEDIUM;
  if (ctx.attempts >= 12 && !ctx.contradictorySignals) return CONFIDENCE_BAND.HIGH;
  return CONFIDENCE_BAND.MEDIUM;
}

/**
 * Base score from rollup metrics before probe adjustment.
 * @param {object} rollup
 */
export function baseConfidenceScoreFromRollup(rollup) {
  const attempts = Math.max(0, Number(rollup.attempts) || 0);
  const acc = Math.max(0, Math.min(100, Number(rollup.accuracy) || 0));
  const wrong = Math.max(0, Number(rollup.attempts) - Number(rollup.correct) || 0);
  if (attempts === 0) return 0;

  let score = acc / 100;
  if (wrong >= 3 && rollup.dominantErrorType && rollup.dominantErrorType !== ERROR_TYPE_V3.UNKNOWN) {
    score = Math.max(0.2, 0.65 - wrong * 0.05);
  }
  if (attempts >= 8) score += 0.05;
  if (attempts >= 15) score += 0.05;
  if (rollup.evidenceStrength === "strong") score += 0.08;
  if (rollup.evidenceStrength === "thin") score -= 0.15;
  if (rollup.foundationRisk === true) score += 0.04;
  if (rollup.enrichmentSignal === true) score += 0.06;
  if (rollup.caveatNeeded === true && rollup.gradeRelation === "above_registered_grade") {
    score = Math.min(score, 0.55);
  }
  return Math.max(0, Math.min(1, score));
}
