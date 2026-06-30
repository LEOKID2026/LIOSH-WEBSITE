/**
 * Diagnostic Engine V3 — recommended next diagnostic action (internal).
 */

import { RECOMMENDED_NEXT_STEP, DIAGNOSIS_STAGE } from "./types.js";
import { ERROR_TYPE_V3 } from "./error-types-v3.js";

/**
 * @param {object} rollup
 * @param {string} diagnosisStage
 */
export function resolveRecommendedNextStepV3(rollup, diagnosisStage) {
  const attempts = Math.max(0, Number(rollup.attempts) || 0);
  const acc = Number(rollup.accuracy) || 0;
  const wrong = Math.max(0, attempts - Number(rollup.correct) || 0);
  const err = rollup.dominantErrorType;

  if (attempts === 0 || (diagnosisStage === DIAGNOSIS_STAGE.NEEDS_PROBE && attempts < 3)) {
    return RECOMMENDED_NEXT_STEP.INSUFFICIENT;
  }

  const gc = rollup.gradeContext || {};
  const gradeRelation =
    rollup.gradeRelation || gc.relation || gc.gradeRelation || null;
  const caveatNeeded = rollup.caveatNeeded === true || gc.caveatNeeded === true;
  const foundationRisk = rollup.foundationRisk === true || gc.foundationRisk === true;
  const enrichmentSignal = rollup.enrichmentSignal === true || gc.enrichmentSignal === true;

  if (foundationRisk) {
    return RECOMMENDED_NEXT_STEP.STRENGTHEN_PREREQUISITE;
  }

  if (enrichmentSignal && acc >= 80) {
    return RECOMMENDED_NEXT_STEP.ADVANCE;
  }

  if (caveatNeeded && gradeRelation === "above_registered_grade" && wrong >= 1) {
    return RECOMMENDED_NEXT_STEP.GIVE_PROBE;
  }

  if (diagnosisStage === DIAGNOSIS_STAGE.CONTRADICTORY) {
    return RECOMMENDED_NEXT_STEP.GIVE_PROBE;
  }

  if (diagnosisStage === DIAGNOSIS_STAGE.NEEDS_PROBE) {
    return RECOMMENDED_NEXT_STEP.GIVE_PROBE;
  }

  if (acc >= 90 && attempts >= 10 && wrong <= 2) {
    return RECOMMENDED_NEXT_STEP.ADVANCE;
  }

  if (acc >= 88 && attempts >= 8 && wrong <= Math.ceil(attempts * 0.15)) {
    return RECOMMENDED_NEXT_STEP.MAINTAIN;
  }

  if (err === ERROR_TYPE_V3.READING) {
    return RECOMMENDED_NEXT_STEP.REDUCE_READING;
  }

  if (err === ERROR_TYPE_V3.SPEED || err === ERROR_TYPE_V3.GUESSING) {
    return RECOMMENDED_NEXT_STEP.REMOVE_TIMER;
  }

  if (err === ERROR_TYPE_V3.PREREQUISITE && rollup.prerequisiteSkill) {
    return RECOMMENDED_NEXT_STEP.STRENGTHEN_PREREQUISITE;
  }

  if (
    err === ERROR_TYPE_V3.CONCEPTUAL ||
    err === ERROR_TYPE_V3.PROCEDURAL ||
    err === ERROR_TYPE_V3.VOCABULARY ||
    err === ERROR_TYPE_V3.INFERENCE
  ) {
    if (diagnosisStage === DIAGNOSIS_STAGE.WORKING_HYPOTHESIS || diagnosisStage === DIAGNOSIS_STAGE.STABLE) {
      return RECOMMENDED_NEXT_STEP.PRACTICE_MORE;
    }
    return RECOMMENDED_NEXT_STEP.GIVE_PROBE;
  }

  if (wrong >= 2 && attempts < 8) {
    return RECOMMENDED_NEXT_STEP.PRACTICE_MORE;
  }

  if (attempts < 8) {
    return RECOMMENDED_NEXT_STEP.GIVE_PROBE;
  }

  return RECOMMENDED_NEXT_STEP.PRACTICE_MORE;
}

export { RECOMMENDED_NEXT_STEP };
