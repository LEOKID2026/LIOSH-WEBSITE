/**
 * Phase 14 — הערכת תלות ביסוד מול קושי מקומי (שורה בלבד; בלי קישור תוכנית בין נושאי).
 */

import {
  DEPENDENCY_STATE_LABEL_HE,
  FOUNDATIONAL_BLOCKER_LABEL_HE,
  LIKELIHOOD_LOW_MOD_HIGH_HE,
} from "./parent-report-ui-explain-he.js";

function likelihoodFields(downstream, local) {
  return {
    downstreamSymptomLikelihood: downstream,
    downstreamSymptomLikelihoodHe: LIKELIHOOD_LOW_MOD_HIGH_HE[downstream] || LIKELIHOOD_LOW_MOD_HIGH_HE.unknown,
    localIssueLikelihood: local,
    localIssueLikelihoodHe: LIKELIHOOD_LOW_MOD_HIGH_HE[local] || LIKELIHOOD_LOW_MOD_HIGH_HE.unknown,
  };
}

/**
 * @param {Record<string, unknown>} ctx
 */
export function buildFoundationDependencyPhase14(ctx) {
  const q = Number(ctx?.q) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const weak = q < 12 || ev === "low" || cs === "withheld" || cs === "tentative" || suff === "low";

  const root = String(ctx?.rootCause || "");
  const ls = String(ctx?.learningStage || "");
  const ret = String(ctx?.retentionRisk || "unknown");
  const mrec = String(ctx?.mistakeRecurrenceLevel || "");
  const dmp = String(ctx?.dominantMistakePattern || "");
  const indep = String(ctx?.independenceProgress || "");
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : {};
  const indepDown = String(td.independenceDirection || "") === "down";
  const accDown = String(td.accuracyDirection || "") === "down";
  const rti = String(ctx?.responseToIntervention || "");
  const match = String(ctx?.expectedVsObservedMatch || "");
  const mem = String(ctx?.recommendationMemoryState || "");
  const gateReadiness = String(ctx?.gateReadiness || "");
  const targetEv = String(ctx?.targetEvidenceType || "");

  const displayName = String(ctx?.displayName || "הנושא").trim();

  /** @type {string[]} */
  const dependencyEvidence = [];

  if (weak || gateReadiness === "insufficient") {
    const L = likelihoodFields("unknown", "unknown");
    return {
      foundationDependency: {
        version: 1,
        dependencyState: "insufficient_dependency_evidence",
        likelyFoundationalBlocker: "unknown",
        downstreamSymptomLikelihood: L.downstreamSymptomLikelihood,
        localIssueLikelihood: L.localIssueLikelihood,
        shouldTreatAsFoundationFirst: false,
      },
      dependencyState: "insufficient_dependency_evidence",
      dependencyStateLabelHe: DEPENDENCY_STATE_LABEL_HE.insufficient_dependency_evidence,
      likelyFoundationalBlocker: "unknown",
      likelyFoundationalBlockerLabelHe: FOUNDATIONAL_BLOCKER_LABEL_HE.unknown,
      dependencyConfidence: "low",
      dependencyEvidence: [],
      ...L,
      shouldTreatAsFoundationFirst: false,
      foundationDependencyNarrativeHe: `ב«${displayName}»: ${DEPENDENCY_STATE_LABEL_HE.insufficient_dependency_evidence}.`,
    };
  }

  const speedOnly = root === "speed_pressure";
  const fragileStage = ls === "fragile_retention" || ls === "regression_signal";
  const retentionShaky = ret === "high" || ret === "moderate";
  const persistentMistakes = mrec === "persistent" || mrec === "repeating";
  const independenceGap = root === "weak_independence" || (indep === "flat" && indepDown);
  const instructionLoad = root === "instruction_friction";
  const knowledgeGap = root === "knowledge_gap";

  if (speedOnly && !fragileStage && !persistentMistakes && !retentionShaky && !independenceGap) {
    dependencyEvidence.push("לחץ מהירות בלי דפוס רחב נוסף");
    const L = likelihoodFields("low", "high");
    return {
      foundationDependency: {
        version: 1,
        dependencyState: "likely_local_issue",
        likelyFoundationalBlocker: "unknown",
        downstreamSymptomLikelihood: L.downstreamSymptomLikelihood,
        localIssueLikelihood: L.localIssueLikelihood,
        shouldTreatAsFoundationFirst: false,
      },
      dependencyState: "likely_local_issue",
      dependencyStateLabelHe: DEPENDENCY_STATE_LABEL_HE.likely_local_issue,
      likelyFoundationalBlocker: "unknown",
      likelyFoundationalBlockerLabelHe: FOUNDATIONAL_BLOCKER_LABEL_HE.unknown,
      dependencyConfidence: q >= 16 ? "moderate" : "low",
      dependencyEvidence,
      ...L,
      shouldTreatAsFoundationFirst: false,
      foundationDependencyNarrativeHe: `ב«${displayName}»: ${DEPENDENCY_STATE_LABEL_HE.likely_local_issue} - ${L.localIssueLikelihoodHe}.`,
    };
  }

  let likelyFoundationalBlocker = "unknown";
  let foundationScore = 0;
  let localScore = 0;

  if (fragileStage) {
    likelyFoundationalBlocker = "retention_instability";
    foundationScore += 3;
    dependencyEvidence.push("שימור שביר/רגרסיה");
  } else if (retentionShaky && persistentMistakes) {
    likelyFoundationalBlocker = "retention_instability";
    foundationScore += 2;
    dependencyEvidence.push("סיכון שימור עם טעויות חוזרות");
  }

  if (independenceGap) {
    if (likelyFoundationalBlocker === "unknown") likelyFoundationalBlocker = "independence_readiness_gap";
    foundationScore += 2;
    dependencyEvidence.push("עצמאות/מוכנות");
  }

  if (instructionLoad && (mem === "usable_memory" || mem === "strong_memory") && match === "misaligned") {
    likelyFoundationalBlocker = "instruction_language_load";
    foundationScore += 2;
    dependencyEvidence.push("עומס הוראה מול זיכרון מסלול");
  } else if (instructionLoad && q >= 14) {
    if (likelyFoundationalBlocker === "unknown") likelyFoundationalBlocker = "instruction_language_load";
    foundationScore += 1;
    dependencyEvidence.push("חיכוך הוראה");
  }

  if (knowledgeGap && persistentMistakes) {
    likelyFoundationalBlocker = "accuracy_foundation_gap";
    foundationScore += 2;
    dependencyEvidence.push("פער דיוק חוזר");
  } else if (knowledgeGap && accDown && q >= 14) {
    if (likelyFoundationalBlocker === "unknown") likelyFoundationalBlocker = "accuracy_foundation_gap";
    foundationScore += 1;
    dependencyEvidence.push("פער ידע עם מגמת דיוק");
  }

  if (root === "careless_pattern" && !persistentMistakes && !fragileStage) {
    localScore += 2;
    dependencyEvidence.push("דפוס רשלנות מקומי");
  }

  if (targetEv === "independence_confirmation" && root !== "weak_independence") {
    localScore += 1;
  }

  let dependencyState = "mixed_dependency_signal";
  let shouldTreatAsFoundationFirst = false;
  let downstreamSymptomLikelihood = "moderate";
  let localIssueLikelihood = "moderate";

  if (foundationScore >= 3) {
    dependencyState = "likely_foundational_block";
    shouldTreatAsFoundationFirst = true;
    downstreamSymptomLikelihood = "high";
    localIssueLikelihood = "low";
  /* Phase 15: דורשים לפחות שני אותות «יסוד» כדי לא לסווג foundational על אות חלש בודד */
  } else if (foundationScore >= 2 && localScore === 0 && (fragileStage || persistentMistakes || retentionShaky)) {
    dependencyState = "likely_foundational_block";
    shouldTreatAsFoundationFirst = true;
    downstreamSymptomLikelihood = "moderate";
    localIssueLikelihood = "low";
  } else if (localScore >= 2 && foundationScore === 0) {
    dependencyState = "likely_local_issue";
    downstreamSymptomLikelihood = "low";
    localIssueLikelihood = "high";
  } else if (foundationScore === 1 && localScore >= 1) {
    dependencyState = "mixed_dependency_signal";
    downstreamSymptomLikelihood = "moderate";
    localIssueLikelihood = "moderate";
    shouldTreatAsFoundationFirst = false;
  } else if (foundationScore === 0 && !fragileStage && !persistentMistakes) {
    dependencyState = "likely_local_issue";
    downstreamSymptomLikelihood = "low";
    localIssueLikelihood = q >= 16 ? "high" : "moderate";
  }

  if (likelyFoundationalBlocker === "unknown" && dependencyState === "likely_foundational_block" && q >= 15) {
    likelyFoundationalBlocker = "procedure_automaticity_gap";
  }

  let dependencyConfidence = "low";
  if (q >= 20 && ev === "strong") dependencyConfidence = "high";
  else if (q >= 14 && ev !== "low") dependencyConfidence = "moderate";

  if (dependencyState === "insufficient_dependency_evidence") {
    dependencyConfidence = "low";
  }

  const L = likelihoodFields(downstreamSymptomLikelihood, localIssueLikelihood);

  const foundationDependency = {
    version: 1,
    dependencyState,
    likelyFoundationalBlocker,
    downstreamSymptomLikelihood: L.downstreamSymptomLikelihood,
    localIssueLikelihood: L.localIssueLikelihood,
    shouldTreatAsFoundationFirst,
  };

  const depLab = DEPENDENCY_STATE_LABEL_HE[dependencyState] || DEPENDENCY_STATE_LABEL_HE.insufficient_dependency_evidence;
  const blkLab =
    FOUNDATIONAL_BLOCKER_LABEL_HE[likelyFoundationalBlocker] || FOUNDATIONAL_BLOCKER_LABEL_HE.unknown;

  return {
    foundationDependency,
    dependencyState,
    dependencyStateLabelHe: depLab,
    likelyFoundationalBlocker,
    likelyFoundationalBlockerLabelHe: blkLab,
    dependencyConfidence,
    dependencyEvidence,
    ...L,
    shouldTreatAsFoundationFirst,
    foundationDependencyNarrativeHe: `ב«${displayName}»: ${depLab} · ${blkLab} · ${L.downstreamSymptomLikelihoodHe}.`,
  };
}
