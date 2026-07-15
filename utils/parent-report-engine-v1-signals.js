/**
 * Parent-report engine v1 — technical confidence tiers, accuracy bands, diagnostic decisions.
 * No parent-facing Hebrew copy; consumed by mistake intelligence + topic engine row signals.
 */

import { mapTaxonomyToMistakePatternFamily } from "./parent-report-engine-taxonomy-bridge.js";

/** @typedef {"T0"|"T1"|"T2"|"T3"|"T4"} EngineConfidenceTier */
/** @typedef {"insufficient_data"|"mastery"|"partial_good"|"needs_strengthening"|"clear_gap"} AccuracyBand */

/**
 * @param {number} q
 * @returns {EngineConfidenceTier}
 */
export function computeEngineConfidenceTier(q) {
  const n = Number(q) || 0;
  if (n < 5) return "T0";
  if (n < 10) return "T1";
  if (n < 20) return "T2";
  if (n < 50) return "T3";
  return "T4";
}

/**
 * @param {number} acc
 * @param {number} q
 * @returns {AccuracyBand}
 */
export function computeAccuracyBand(acc, q) {
  const a = Math.round(Number(acc) || 0);
  const n = Number(q) || 0;
  if (n < 5) return "insufficient_data";
  if (a >= 90) return "mastery";
  if (a >= 70) return "partial_good";
  if (a >= 50) return "needs_strengthening";
  return "clear_gap";
}

export const ENGINE_V1_GUARDRAILS = [
  {
    id: "subskill_requires_taxonomy_match",
    rule: "Do not emit subskillCandidate when taxonomyMatch is false or matchStrength is weak.",
  },
  {
    id: "insufficient_at_t0",
    rule: "When engineConfidenceTier is T0 (<5 questions), engineDecision stays insufficient_data.",
  },
  {
    id: "weak_taxonomy_no_subskill",
    rule: "classificationReasonCode weak_taxonomy_fallback_blocked → taxonomyMatch false for parent subskill.",
  },
  {
    id: "mastery_no_clear_gap",
    rule: "accuracyBand mastery with q≥10 must not resolve to clear_topic_gap or knowledge_gap root cause.",
  },
  {
    id: "partial_good_no_strong_gap",
    rule: "accuracyBand partial_good (70–89%) with q≥10 must not resolve to strong knowledge_gap.",
  },
  {
    id: "speed_only_no_gap",
    rule: "When speedOnlyRisk and mode is speed/marathon and accuracyBand is not clear_gap, do not infer knowledge_gap.",
  },
  {
    id: "mastery_100_low_q",
    rule: "100% accuracy with q<10 does not infer mastery_stable - stays early_direction_only.",
  },
  {
    id: "mixed_last_resort",
    rule: "mixed_mistake_pattern only when needs_strengthening, no taxonomy, and fragile/mixed behavioral signals.",
  },
];

/**
 * @param {ReturnType<import("./parent-report-root-cause.js").estimateRowRootCause>} rootCausePayload
 * @param {object} ctx
 */
export function applyAccuracyBandRootCauseGuard(rootCausePayload, ctx) {
  const accuracyBand = String(ctx?.accuracyBand || "");
  const q = Number(ctx?.q) || 0;
  const acc = Math.round(Number(ctx?.acc) || 0);
  const behaviorType = String(ctx?.behaviorType || "");
  const modeKey = String(ctx?.modeKey || "").trim();
  const riskFlags = ctx?.riskFlags && typeof ctx.riskFlags === "object" ? ctx.riskFlags : {};
  const base = { ...(rootCausePayload || {}) };
  const evidence = Array.isArray(base.rootCauseEvidence) ? [...base.rootCauseEvidence] : [];

  if (accuracyBand === "mastery" && q >= 10 && base.rootCause === "knowledge_gap") {
    return {
      ...base,
      rootCause: "mixed_signal",
      rootCauseConfidence: Math.min(Number(base.rootCauseConfidence) || 0.5, 0.42),
      rootCauseEvidence: [...evidence, "guard:mastery_accuracy_no_knowledge_gap"],
    };
  }

  if (accuracyBand === "partial_good" && q >= 10 && base.rootCause === "knowledge_gap" && acc >= 70) {
    const next =
      behaviorType === "speed_pressure" || riskFlags.speedOnlyRisk
        ? "speed_pressure"
        : acc >= 75 && behaviorType === "stable_mastery"
          ? "early_stage_instability"
          : "mixed_signal";
    return {
      ...base,
      rootCause: next,
      rootCauseConfidence: Math.min(Number(base.rootCauseConfidence) || 0.5, 0.52),
      rootCauseEvidence: [...evidence, "guard:partial_good_no_strong_gap"],
    };
  }

  if (
    riskFlags.speedOnlyRisk &&
    (modeKey === "speed" || modeKey === "marathon") &&
    accuracyBand !== "clear_gap" &&
    base.rootCause === "knowledge_gap"
  ) {
    return {
      ...base,
      rootCause: "speed_pressure",
      rootCauseConfidence: Math.max(Number(base.rootCauseConfidence) || 0.5, 0.68),
      rootCauseEvidence: [...evidence, "guard:speed_only_not_gap"],
    };
  }

  return base;
}

/**
 * @param {object} p
 */
export function buildEngineDiagnosticDecision(p) {
  const q = Number(p?.q) || 0;
  const acc = Math.round(Number(p?.acc) || 0);
  const wrongRatio = Math.max(0, Math.min(1, Number(p?.wrongRatio) || 0));
  const tier = p?.engineConfidenceTier || computeEngineConfidenceTier(q);
  const accuracyBand = p?.accuracyBand || computeAccuracyBand(acc, q);
  const taxonomyMatch = p?.taxonomyMatch || null;
  const rootCause = String(p?.rootCause || "");
  const behaviorType = String(p?.behaviorType || "");
  const dominantMistakePattern = String(p?.dominantMistakePattern || "");
  const riskFlags = p?.riskFlags && typeof p.riskFlags === "object" ? p.riskFlags : {};
  const modeKey = String(p?.modeKey || "").trim();

  /** @type {string[]} */
  const guardrailsApplied = [];
  /** @type {string[]} */
  const why = [];

  /** @type {string} */
  let engineDecision = "insufficient_data";
  /** @type {"none"|"emerging"|"moderate"|"clear"} */
  let topicWeaknessLevel = "none";

  if (tier === "T0") {
    engineDecision = "insufficient_data";
    topicWeaknessLevel = "none";
    guardrailsApplied.push("insufficient_at_t0");
    why.push("volume_below_5");
  } else if (accuracyBand === "mastery") {
    engineDecision = q >= 10 ? "mastery_stable" : "early_direction_only";
    topicWeaknessLevel = "none";
    if (q < 10) guardrailsApplied.push("mastery_100_low_q");
    why.push("accuracy_band_mastery");
  } else if (accuracyBand === "partial_good") {
    engineDecision = tier >= "T2" ? "partial_stable" : "early_direction_only";
    topicWeaknessLevel = "emerging";
    why.push("accuracy_band_partial_good");
  } else if (accuracyBand === "needs_strengthening") {
    engineDecision = "topic_needs_strengthening";
    topicWeaknessLevel = tier >= "T2" ? "moderate" : "emerging";
    why.push("accuracy_band_needs_strengthening");
  } else if (accuracyBand === "clear_gap") {
    engineDecision = tier >= "T1" ? "clear_topic_gap" : "insufficient_data";
    topicWeaknessLevel = tier >= "T2" ? "clear" : "moderate";
    why.push("accuracy_band_clear_gap");
  }

  if (riskFlags.speedOnlyRisk && modeKey === "speed" && accuracyBand !== "clear_gap") {
    if (engineDecision === "clear_topic_gap" || engineDecision === "topic_needs_strengthening") {
      engineDecision = "speed_pressure_pattern";
      topicWeaknessLevel = "emerging";
      guardrailsApplied.push("speed_only_no_gap");
      why.push("speed_mode_guard");
    }
  }

  const technicalSubskill =
    taxonomyMatch?.subskillCandidateTechnical ??
    (taxonomyMatch?.subskillCandidate && taxonomyMatch?.taxonomyMatch ? taxonomyMatch.subskillCandidate : null);
  const subskillCandidate =
    technicalSubskill && taxonomyMatch?.subskillSafety?.safeToShowSubskill === true
      ? technicalSubskill
      : null;
  if (!subskillCandidate) {
    guardrailsApplied.push("subskill_requires_taxonomy_match");
    if (technicalSubskill && taxonomyMatch?.subskillSafety?.safeToShowSubskill !== true) {
      guardrailsApplied.push("subskill_safety_blocked");
      for (const reason of taxonomyMatch?.subskillSafety?.blockReasons || []) {
        guardrailsApplied.push(`subskill_unsafe:${reason}`);
      }
    }
    if (taxonomyMatch?.classificationReasonCode === "no_taxonomy_mapping") {
      guardrailsApplied.push("no_taxonomy_mapping");
    }
    if (taxonomyMatch?.evidenceFlags?.noRawMistakeEvents) {
      guardrailsApplied.push("no_raw_mistake_events");
    }
    if (taxonomyMatch?.evidenceFlags?.missingMetadata) {
      guardrailsApplied.push("missing_metadata");
    }
    if (taxonomyMatch?.matchStrength === "weak") {
      guardrailsApplied.push("weak_taxonomy_fallback_blocked");
    }
  }

  const patternCandidate =
    taxonomyMatch?.patternCandidate ||
    (dominantMistakePattern && dominantMistakePattern !== "insufficient_mistake_evidence"
      ? { patternKey: dominantMistakePattern, confidence: 0.48 }
      : null);

  const actionCandidate = taxonomyMatch?.interventionActionCandidate || null;

  return {
    version: 1,
    engineConfidenceTier: tier,
    accuracyBand,
    engineDecision,
    topicWeaknessLevel,
    rootCause,
    behaviorType,
    dominantMistakePattern,
    taxonomyMatchId: taxonomyMatch?.taxonomyId ?? null,
    taxonomyMatchStrength: taxonomyMatch?.matchStrength ?? "none",
    taxonomyMatch: !!taxonomyMatch?.taxonomyMatch,
    taxonomyClassificationReasonCode: taxonomyMatch?.classificationReasonCode ?? null,
    rawBucketKey: taxonomyMatch?.rawBucketKey ?? null,
    normalizedBucketKey: taxonomyMatch?.normalizedBucketKey ?? null,
    gradeScope: taxonomyMatch?.gradeScope ?? null,
    taxonomyCandidateIds: taxonomyMatch?.candidateIds ?? [],
    evidenceFlags: taxonomyMatch?.evidenceFlags ?? null,
    subskillCandidate,
    subskillCandidateTechnical: technicalSubskill,
    subskillSafety: taxonomyMatch?.subskillSafety ?? null,
    safeSubskillToShow: taxonomyMatch?.safeSubskillToShow === true,
    patternCandidate,
    actionCandidate,
    guardrailsApplied,
    why,
  };
}

/**
 * Legacy preview for audit before/after — mirrors pre-v1 default paths only.
 * @param {object} ctx
 */
export function previewLegacyEngineDecision(ctx) {
  const q = Number(ctx?.q) || 0;
  const acc = Math.round(Number(ctx?.accuracy) || 0);
  const rootCause = String(ctx?.rootCause || "");
  const behaviorType = String(ctx?.behaviorType || "");
  const mC = Number(ctx?.mistakeEventCount) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const rf = ctx?.riskFlags && typeof ctx.riskFlags === "object" ? ctx.riskFlags : {};
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : {};
  const wr = Math.max(0, Math.min(1, Number(ctx?.wrongRatio) || 0));

  let pattern = "insufficient_mistake_evidence";
  let confidence = 0.35;

  const weakSignal =
    q < 6 || (ev === "low" && suff === "low" && mC < 3) || rootCause === "insufficient_evidence" || cs === "withheld";

  if (mC === 0 && q < 10 && wr < 0.08) {
    pattern = "insufficient_mistake_evidence";
    confidence = 0.22;
  } else if (weakSignal && mC < 4) {
    pattern = "insufficient_mistake_evidence";
    confidence = 0.28;
  } else if (rootCause === "speed_pressure" || behaviorType === "speed_pressure" || (rf.speedOnlyRisk && wr < 0.42)) {
    pattern = "speed_driven_error";
    confidence = 0.55;
  } else if (rootCause === "knowledge_gap" && behaviorType === "knowledge_gap" && (ev === "strong" || suff === "strong") && acc < 65 && mC >= 6) {
    pattern = wr > 0.38 ? "concept_confusion" : "procedure_break";
    confidence = 0.58;
  } else if (td.fragileProgressPattern || (behaviorType === "fragile_success" && rf.hintDependenceRisk)) {
    pattern = "mixed_mistake_pattern";
    confidence = 0.48;
  } else if (q < 12 && (td.unclearTrend !== false || !td.trendConfOk)) {
    pattern = "early_learning_noise";
    confidence = 0.4;
  } else {
    pattern = "mixed_mistake_pattern";
    confidence = 0.45;
  }

  let engineDecision = "mixed_unclear";
  if (rootCause === "knowledge_gap" && acc < 65) engineDecision = "knowledge_gap";
  else if (rootCause === "insufficient_evidence" || weakSignal) engineDecision = "insufficient";
  else if (acc >= 80) engineDecision = "stable_or_strength";
  else engineDecision = "mixed_unclear";

  return {
    engineDecision,
    dominantMistakePattern: pattern,
    mistakePatternConfidence: confidence,
    engineConfidenceTier: null,
    accuracyBand: null,
    taxonomyMatch: false,
    subskillCandidate: null,
    actionCandidate: null,
  };
}

export { mapTaxonomyToMistakePatternFamily };
