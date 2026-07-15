/**
 * Next diagnostic probes / actions (educational).
 */

import { PROFESSIONAL_FRAMEWORK_V1 } from "./diagnostic-framework-v1.js";

export const PROBE_ENGINE_V1 = "1.0.0";

const PROBE_TYPES = [
  "collect_more_data",
  "targeted_skill",
  "prerequisite_check",
  "difficulty_sweep",
  "misconception_confirmation",
  "cross_subject_check",
  "challenge_advance",
];

/**
 * @param {object} ctx
 * @param {string} [ctx.thinData]
 * @param {string} [ctx.suspectedMisconception]
 * @param {string} [ctx.prerequisiteUncertainty]
 * @param {string} [ctx.targetSubjectId]
 * @param {string} [ctx.targetSkillId]
 * @param {boolean} [ctx.strongMasterySignal]
 */
export function buildProbeRecommendationsV1(ctx = {}) {
  const out = [];
  const t = String(ctx.thinData || "");
  if (t === "true" || ctx.volumeHint === "low") {
    out.push({
      probeReason: "Thin practice window-need more observations before stable interpretation.",
      targetSubjectId: ctx.targetSubjectId || null,
      targetSkillId: null,
      targetSubskillId: null,
      probeType: "collect_more_data",
      recommendedQuestionTypes: ["mcq", "short_set"],
      numberOfQuestions: 8,
      successCriteria: "Stable accuracy over at least two sessions",
      failureCriteria: "Continued random/incorrect pattern without convergence",
      nextDecisionAfterProbe: "Re-evaluate mastery and misconceptions",
    });
  }

  if (ctx.suspectedMisconception) {
    out.push({
      probeReason: `Suspected misconception signal: ${ctx.suspectedMisconception}`,
      targetSubjectId: ctx.targetSubjectId || null,
      targetSkillId: ctx.targetSkillId || null,
      targetSubskillId: ctx.targetSubskillId || null,
      probeType: "misconception_confirmation",
      recommendedQuestionTypes: ["mcq"],
      numberOfQuestions: 3,
      successCriteria: "Consistent correct responses on parallel items",
      failureCriteria: "Repeated same distractor selection",
      nextDecisionAfterProbe: "Escalate practice specificity",
    });
  }

  if (ctx.prerequisiteUncertainty) {
    out.push({
      probeReason: "Prerequisite strengths unclear relative to advanced skill.",
      targetSubjectId: ctx.targetSubjectId || null,
      targetSkillId: ctx.prerequisiteSkillId || null,
      targetSubskillId: null,
      probeType: "prerequisite_check",
      recommendedQuestionTypes: ["mcq"],
      numberOfQuestions: 4,
      successCriteria: "Prerequisite skill shows independent accuracy",
      failureCriteria: "Prerequisite remains unstable",
      nextDecisionAfterProbe: "Foundation review vs isolated advanced gap",
    });
  }

  if (ctx.strongMasterySignal) {
    out.push({
      probeReason: "Strong observed mastery with adequate volume-optional challenge probe to confirm transfer.",
      targetSubjectId: ctx.strongMasterySubjectId || ctx.targetSubjectId || null,
      targetSkillId: ctx.strongMasterySkillId || ctx.targetSkillId || null,
      targetSubskillId: null,
      probeType: "challenge_advance",
      recommendedQuestionTypes: ["mcq", "multi_step"],
      numberOfQuestions: 3,
      successCriteria: "Maintains accuracy on harder parallel items",
      failureCriteria: "Breakdown on increased complexity",
      nextDecisionAfterProbe: "Adjust level or add scaffolded practice",
    });
  }

  if (out.length === 0) {
    out.push({
      probeReason: "Default maintenance probe-confirm stability.",
      targetSubjectId: ctx.targetSubjectId || null,
      targetSkillId: ctx.targetSkillId || null,
      targetSubskillId: null,
      probeType: "targeted_skill",
      recommendedQuestionTypes: ["mcq"],
      numberOfQuestions: 2,
      successCriteria: "Meet or exceed recent accuracy band",
      failureCriteria: "Accuracy drops materially",
      nextDecisionAfterProbe: "Adjust practice plan",
    });
  }

  return {
    version: PROBE_ENGINE_V1,
    probeTypesEnum: PROBE_TYPES,
    recommendationTypeEnum: PROFESSIONAL_FRAMEWORK_V1.recommendationTypeEnum,
    probes: out,
  };
}
