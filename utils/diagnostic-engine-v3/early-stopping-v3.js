/**
 * Diagnostic Engine V3 — smart early stopping / diagnosis stage (internal).
 */

import { DIAGNOSIS_STAGE } from "./types.js";
import { ERROR_TYPE_V3 } from "./error-types-v3.js";

/**
 * @param {object} rollup
 * @param {object} ctx
 * @param {boolean} ctx.contradictorySignals
 * @param {boolean} ctx.hasProbeSupport
 * @param {boolean} ctx.hasProbeWeaken
 * @param {object|null} [ctx.gradeContext]
 */
export function resolveDiagnosisStageV3(rollup, ctx = {}) {
  const attempts = Math.max(0, Number(rollup.attempts) || 0);
  const wrong = Math.max(0, attempts - Number(rollup.correct) || 0);
  const acc = Number(rollup.accuracy) || 0;

  if (ctx.contradictorySignals) {
    return DIAGNOSIS_STAGE.CONTRADICTORY;
  }

  if (attempts < 3 && wrong < 2) {
    return ctx.hasProbeWeaken ? DIAGNOSIS_STAGE.NEEDS_PROBE : DIAGNOSIS_STAGE.NEEDS_PROBE;
  }

  if (attempts >= 3 && wrong >= 1 && ctx.hasProbeWeaken) {
    return DIAGNOSIS_STAGE.NEEDS_PROBE;
  }

  if (
    attempts >= 12 &&
    wrong >= 2 &&
    rollup.dominantErrorType &&
    rollup.dominantErrorType !== ERROR_TYPE_V3.UNKNOWN &&
    rollup.confidence === "medium" &&
    !ctx.contradictorySignals
  ) {
    if (ctx.gradeContext?.caveatNeeded && ctx.gradeContext?.relation === "above_registered_grade") {
      return DIAGNOSIS_STAGE.WORKING_HYPOTHESIS;
    }
    return DIAGNOSIS_STAGE.STABLE;
  }

  if (
    attempts >= 12 &&
    acc >= 88 &&
    wrong <= Math.ceil(attempts * 0.12) &&
    !ctx.contradictorySignals
  ) {
    if (ctx.gradeContext?.enrichmentSignal) {
      return DIAGNOSIS_STAGE.STABLE;
    }
    if (ctx.gradeContext?.relation === "above_registered_grade" && ctx.gradeContext?.caveatNeeded) {
      return DIAGNOSIS_STAGE.WORKING_HYPOTHESIS;
    }
    return DIAGNOSIS_STAGE.STABLE;
  }

  if (
    attempts >= 8 &&
    (wrong >= 2 || ctx.hasProbeSupport) &&
    rollup.dominantErrorType &&
    rollup.dominantErrorType !== ERROR_TYPE_V3.UNKNOWN
  ) {
    return DIAGNOSIS_STAGE.WORKING_HYPOTHESIS;
  }

  if (attempts >= 5 || wrong >= 2 || ctx.hasProbeSupport) {
    return DIAGNOSIS_STAGE.INITIAL_SIGNAL;
  }

  return DIAGNOSIS_STAGE.NEEDS_PROBE;
}

/**
 * Flags for rollup aggregation.
 * @param {ReturnType<import("./evidence-contract-v3.js").buildDiagnosticEvidenceContractV3>[]} contracts
 * @param {Record<string, unknown>|null} topicRow
 */
export function detectContradictorySignals(contracts, topicRow) {
  const wrongTypes = new Set(
    contracts.filter((c) => !c.isCorrect && c.errorType).map((c) => String(c.errorType)),
  );
  if (wrongTypes.size >= 3) return true;

  const rowAcc = Number(topicRow?.accuracy);
  const rowQ = Number(topicRow?.questions) || 0;
  const dom = topicRow?.behaviorProfile?.dominantType;
  if (rowQ >= 10 && rowAcc >= 90 && wrongTypes.size >= 2) return true;
  if (dom === "stable_mastery" && wrongTypes.size >= 2) return true;

  const speeds = contracts
    .filter((c) => c.responseTimeMs != null)
    .map((c) => ({ ms: c.responseTimeMs, err: c.errorType }));
  const fastWrong = speeds.filter((s) => s.ms < 8000).length;
  const slowWrong = speeds.filter((s) => s.ms > 45000).length;
  if (fastWrong >= 2 && slowWrong >= 2) return true;

  return false;
}

export { DIAGNOSIS_STAGE };
