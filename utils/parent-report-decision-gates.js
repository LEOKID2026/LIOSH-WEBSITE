/**
 * Phase 13 — שערי החלטה לסבב הבא (מבוסס Phases 7–12, בלי המצאת ראיות).
 */

import { GATE_LEVEL_LABEL_HE, GATE_READINESS_LABEL_HE, GATE_STATE_LABEL_HE } from "./parent-report-ui-explain-he.js";
import { buildDecisionReadinessContractsBundleV1 } from "./contracts/decision-readiness-contract-v1.js";
import { PARENT_EVIDENCE_VOLUME } from "./parent-report-language/parent-evidence-matrix.js";

/**
 * @param {object} ctx
 */
export function buildDecisionGatesPhase13(ctx) {
  const q = Number(ctx?.q) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const root = String(ctx?.rootCause || "");
  const ret = String(ctx?.retentionRisk || "unknown");
  const ls = String(ctx?.learningStage || "");
  const fs = String(ctx?.freshnessState || "");
  const cf = String(ctx?.conclusionFreshness || "");
  const rec = String(ctx?.recalibrationNeed || "");
  const seq = String(ctx?.supportSequenceState || "");
  const rti = String(ctx?.responseToIntervention || "");
  const match = String(ctx?.expectedVsObservedMatch || "");
  const mem = String(ctx?.recommendationMemoryState || "");
  const indep = String(ctx?.independenceProgress || "");
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : {};
  const indepUp = String(td.independenceDirection || "") === "up" || indep === "improving";
  const transferReadiness = String(ctx?.transferReadiness || "");
  /** QA calibration: שחרור «forming» רק כשאין עצירה מוכנות/שורש עצמאות */
  const releaseIndependenceHold =
    root === "weak_independence" ||
    transferReadiness === "not_ready" ||
    transferReadiness === "limited" ||
    indep === "flat" ||
    String(td.independenceDirection || "") === "down";
  const finalStep = String(ctx?.finalStep || "");
  const weak = q < PARENT_EVIDENCE_VOLUME.STRONG_MIN || ev === "low" || cs === "withheld" || cs === "tentative";
  const stale = fs === "stale" || cf === "expired" || cf === "low" || rec === "structured_recheck";

  let continueGate = "off";
  let releaseGate = "off";
  let pivotGate = "off";
  let recheckGate = "off";
  let advanceGate = "off";

  if (weak) {
    continueGate = "pending";
    releaseGate = "blocked";
    advanceGate = "blocked";
  } else if (match === "aligned" && (rti === "early_positive_response" || rti === "mixed_response")) {
    continueGate = "forming";
  } else if (match === "aligned" && rti !== "not_enough_evidence") {
    continueGate = "ready_watch";
  } else if (match === "not_enough_evidence") {
    continueGate = "pending";
  } else {
    continueGate = "pending";
  }

  if (seq === "sequence_ready_for_release" || rti === "independence_growing" || rti === "over_supported_progress") {
    /* forming דורש q גבוה יותר + בלי חסימת מוכנות — מפחית false release */
    if (indepUp && q >= 16 && ev !== "low" && !releaseIndependenceHold) releaseGate = "forming";
    else if (rti === "over_supported_progress" && !indepUp) releaseGate = "pending";
    else releaseGate = "pending";
  } else {
    releaseGate = "off";
  }
  if (weak || rti === "not_enough_evidence") releaseGate = releaseGate === "off" ? "off" : "blocked";
  if (stale && releaseGate === "forming") releaseGate = "pending";

  if (!weak && match === "misaligned" && (mem === "usable_memory" || mem === "strong_memory")) {
    pivotGate = "forming";
  } else if (!weak && match === "misaligned" && mem !== "no_memory") {
    pivotGate = "pending";
  }

  if (stale || rec === "structured_recheck" || rec === "do_not_rely_yet") {
    recheckGate = "forming";
  } else if (cf === "medium" && fs === "stale") {
    recheckGate = "pending";
  }

  const canAdvance =
    !weak &&
    !stale &&
    ret !== "high" &&
    ret !== "moderate" &&
    ls !== "fragile_retention" &&
    ls !== "regression_signal" &&
    (finalStep === "advance_level" || finalStep === "advance_grade_topic_only");
  if (canAdvance && match === "aligned" && indepUp) advanceGate = "forming";
  else if (finalStep.includes("advance") && (weak || stale || ret === "high")) advanceGate = "blocked";
  else advanceGate = advanceGate === "forming" ? advanceGate : "off";

  let gateReadiness = "insufficient";
  if (weak) gateReadiness = "insufficient";
  else if (q < 16 || ev === "medium") gateReadiness = "low";
  else if (stale || match === "not_enough_evidence") gateReadiness = "low";
  else if (match === "partly_aligned") gateReadiness = "moderate";
  else gateReadiness = "high";

  let gateState = "gates_not_ready";
  if (weak) {
    gateState = "gates_not_ready";
  } else if (pivotGate === "forming" || pivotGate === "pending") {
    gateState = "pivot_gate_visible";
  } else if (recheckGate === "forming") {
    gateState = "recheck_gate_visible";
  } else if (releaseGate === "forming") {
    gateState = "release_gate_forming";
  } else if (advanceGate === "forming") {
    gateState = "advance_gate_forming";
  } else if (continueGate === "forming" || continueGate === "ready_watch") {
    gateState = "continue_gate_active";
  } else if ((pivotGate !== "off" ? 1 : 0) + (recheckGate !== "off" ? 1 : 0) + (releaseGate !== "off" ? 1 : 0) > 1) {
    gateState = "mixed_gate_state";
  } else {
    gateState = "gates_not_ready";
  }
  if (weak && gateState === "pivot_gate_visible") gateState = "gates_not_ready";

  const displayName = String(ctx?.displayName || "הנושא").trim();
  const gateStateLabelHe = GATE_STATE_LABEL_HE[gateState] || GATE_STATE_LABEL_HE.gates_not_ready;
  const gateReadinessLabelHe = GATE_READINESS_LABEL_HE[gateReadiness] || GATE_READINESS_LABEL_HE.insufficient;

  const gateNarrativeHe =
    `ב«${displayName}»: ${gateStateLabelHe} · ${gateReadinessLabelHe} · שחרור: ${GATE_LEVEL_LABEL_HE[releaseGate] || ""} · מעבר מסלול: ${GATE_LEVEL_LABEL_HE[pivotGate] || ""} · ריענון: ${GATE_LEVEL_LABEL_HE[recheckGate] || ""}.`;

  const decisionGates = {
    version: 1,
    gateState,
    gateReadiness,
    continueGate,
    releaseGate,
    pivotGate,
    recheckGate,
    advanceGate,
  };

  const contractsV1 = buildDecisionReadinessContractsBundleV1({
    contractsV1: ctx?.contractsV1,
    topicKey: String(ctx?.topicKey || ctx?.topicRowKey || ctx?.displayName || "__unknown_topic__"),
    subjectId: String(ctx?.subjectId || "__unknown_subject__"),
    q,
    evidenceStrength: ev,
    dataSufficiencyLevel: suff,
    conclusionStrength: cs,
    cannotConcludeYet: weak,
    weak,
    internalGateReadinessBand: gateReadiness,
    gateState,
    dev2ConfidenceLevel: String(ctx?.dev2ConfidenceLevel || ""),
    confidence: String(ctx?.dev2ConfidenceLevel || ""),
  });
  decisionGates.contractsV1 = contractsV1;

  return {
    decisionGates,
    contractsV1,
    gateState,
    gateStateLabelHe,
    continueGate,
    releaseGate,
    pivotGate,
    recheckGate,
    advanceGate,
    gateReadiness,
    gateReadinessLabelHe,
    gateNarrativeHe,
  };
}
