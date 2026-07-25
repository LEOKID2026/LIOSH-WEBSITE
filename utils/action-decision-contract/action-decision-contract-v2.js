/**
 * Action Decision Contract V2 — the sole selected-action contract.
 * CanonicalTopicState remains the sole authorization and intensity authority.
 */
import { TAXONOMY_BY_ID } from "../diagnostic-engine-v2/taxonomy-registry.js";
import {
  primaryProducerForRule,
  ruleHasPrimaryProducer,
  RULE_PRIMARY_PRODUCER,
} from "../../lib/learning/taxonomy-rule-primary-producers.js";
import { resolveParentPatternLabelForDisplay } from "../learning-pattern-decision/parent-pattern-label.js";
import {
  resolvePrerequisitePrecision,
  validatePrerequisitePrecision,
} from "./prerequisite-precision.js";
import {
  buildDecisionLifecycleV1,
  calibrationForActionV1,
  capIntensityByCalibrationV1,
} from "./decision-calibration-contract-v1.js";

export const ACTION_DECISION_CONTRACT_VERSION = "2.0.0";

export const ACTION_CODES_V2 = Object.freeze([
  "none",
  "collect_more_evidence",
  "give_probe_questions",
  "practice_more",
  "targeted_practice",
  "strengthen_prerequisite",
  "remove_timer",
  "reduce_reading_load",
  "guided_to_independent_transition",
  "maintain",
  "monitor_before_escalation",
  "advance_cautiously",
]);

export const ACTION_FAMILIES_V2 = Object.freeze([
  "none",
  "evidence_collection",
  "current_topic_reinforcement",
  "subskill_reinforcement",
  "prerequisite_reinforcement",
  "practice_mode_adaptation",
  "monitoring",
  "advancement",
]);

export const ACTION_DELIVERY_MODES_V2 = Object.freeze([
  "none",
  "observe_only",
  "diagnostic_independent",
  "guided_practice",
  "slow_guided_accuracy",
  "guided_release",
  "error_reduction_loop",
  "review_and_hold",
  "stabilize_then_transfer",
  "standard",
]);

const RI_RANK = Object.freeze({ RI0: 0, RI1: 1, RI2: 2, RI3: 3 });

export const NON_INTERVENTION_ACTIONS_V2 = new Set([
  "none",
  "collect_more_evidence",
  "give_probe_questions",
  "maintain",
  "monitor_before_escalation",
]);

export const ACTIVE_INTERVENTION_ACTIONS_V2 = new Set([
  "practice_more",
  "targeted_practice",
  "strengthen_prerequisite",
  "remove_timer",
  "reduce_reading_load",
  "guided_to_independent_transition",
  "advance_cautiously",
]);

export const LEGACY_ACTION_MAPPINGS_V2 = Object.freeze({
  // EDC V1
  none: "none",
  watch: "monitor_before_escalation",
  remediate_same_level: "practice_more",
  remediate_step_down: "strengthen_prerequisite",
  maintain_and_strengthen: "practice_more",
  intervene: "targeted_practice",
  // Diagnostic V3
  insufficient_data: "collect_more_evidence",
  give_probe_questions: "give_probe_questions",
  practice_more: "practice_more",
  strengthen_prerequisite: "strengthen_prerequisite",
  remove_timer: "remove_timer",
  reduce_reading_load: "reduce_reading_load",
  advance_cautiously: "advance_cautiously",
  maintain: "maintain",
  // Topic-next-step
  drop_one_level_topic_only: "strengthen_prerequisite",
  drop_one_grade_topic_only: "strengthen_prerequisite",
  advance_level: "advance_cautiously",
  advance_grade_topic_only: "advance_cautiously",
  maintain_regular_strengthen_medium: "practice_more",
  suggest_return_to_regular: "maintain",
  // Professional framework / planner
  collect_more_data: "collect_more_evidence",
  pause_collect_more_data: "collect_more_evidence",
  probe_skill: "give_probe_questions",
  targeted_practice: "targeted_practice",
  practice_current: "practice_more",
  review_foundation: "strengthen_prerequisite",
  review_prerequisite: "strengthen_prerequisite",
  slow_down_and_check: "remove_timer",
  continue_current_level: "maintain",
  maintain_skill: "maintain",
  advance_skill: "advance_cautiously",
  // Existing intervention overlays
  monitor_before_escalation: "monitor_before_escalation",
  guided_to_independent_transition: "guided_to_independent_transition",
  target_core_skill_gap: "targeted_practice",
  reduce_time_pressure: "remove_timer",
  stabilize_accuracy: "practice_more",
});

export const DEPRECATED_AMBIGUOUS_LEGACY_ACTIONS_V2 = new Set([
  "maintain_and_strengthen",
  "maintain_regular_strengthen_medium",
  "remediate_same_level",
  "intervene",
]);

/**
 * Action-like legacy values that have no canonical route and no supported ADC
 * semantic equivalent. They are marked rather than falsely mapped.
 */
export const UNSUPPORTED_LEGACY_ACTIONS_V2 = Object.freeze({
  teacher_review_recommended: "unsupported:no_canonical_human_review_route",
  professional_review_consideration: "unsupported:no_canonical_human_review_route",
  clarify_instruction_pattern: "unsupported:no_instruction_adaptation_action",
  collect_controlled_practice: "unsupported:evidence_instruction_not_selected_action",
  accuracy_first_same_level: "unsupported:evidence_instruction_not_selected_action",
  clarify_task_reduce_hints: "unsupported:evidence_instruction_not_selected_action",
  fade_support_gradually: "unsupported:evidence_instruction_not_selected_action",
  targeted_review_errors: "unsupported:evidence_instruction_not_selected_action",
  pause_check_before_submit: "unsupported:evidence_instruction_not_selected_action",
  continue_short_sessions: "unsupported:evidence_instruction_not_selected_action",
});

function intensityRank(value) {
  const rank = RI_RANK[String(value || "")];
  return Number.isFinite(rank) ? rank : 0;
}

function target(
  subject,
  topic,
  subskill = null,
  prerequisite = null,
  subskillId = null,
  prerequisiteDetail = null,
) {
  return {
    subject: String(subject || ""),
    topic: String(topic || ""),
    subskill: subskill ? String(subskill) : null,
    subskillId: subskillId ? String(subskillId) : null,
    prerequisite: prerequisite ? String(prerequisite) : null,
    prerequisiteDetail:
      prerequisiteDetail && typeof prerequisiteDetail === "object"
        ? { ...prerequisiteDetail }
        : null,
  };
}

/** @type {Map<string, string>} */
const TAG_TO_TAXONOMY_ID = (() => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [taxonomyId, producer] of Object.entries(RULE_PRIMARY_PRODUCER)) {
    const tag = String(producer?.tag || "").trim();
    if (tag) map.set(tag, taxonomyId);
  }
  return map;
})();

function taxonomyLabelHe(taxonomyId) {
  const id = String(taxonomyId || "");
  const row = TAXONOMY_BY_ID[id];
  if (!row?.patternHe) return null;
  return (
    resolveParentPatternLabelForDisplay(String(row.patternHe).trim(), { taxonomyId: id }) ||
    String(row.patternHe).trim()
  );
}

function taxonomyIdFromPatternTag(tag) {
  const key = String(tag || "").trim();
  if (!key) return null;
  return TAG_TO_TAXONOMY_ID.get(key) || null;
}

/**
 * Wire detected taxonomy / producer into ADC target without changing finding copy.
 * Safe subskill → label + id (subskill_focus). Active producer only → id (topic_focus + preferKind).
 * @param {string} subjectId
 * @param {string} topicKey
 * @param {{
 *   detectedTaxonomyId?: string|null,
 *   detectedPatternTag?: string|null,
 *   signals?: Record<string, unknown>,
 * }} [options]
 */
export function resolveTaxonomyAwareActionTarget(
  subjectId,
  topicKey,
  { detectedTaxonomyId = null, detectedPatternTag = null, signals = {} } = {},
) {
  const subskill =
    signals?.subskill && typeof signals.subskill === "object" ? signals.subskill : {};
  const pattern =
    signals?.pattern && typeof signals.pattern === "object" ? signals.pattern : {};
  const safeId =
    subskill.safe === true ? String(subskill.candidate?.taxonomyId || "").trim() : "";
  if (safeId && ruleHasPrimaryProducer(safeId)) {
    return target(
      subjectId,
      topicKey,
      subskill.candidate?.labelHe || taxonomyLabelHe(safeId),
      null,
      safeId,
    );
  }

  const taxonomyId = String(
    detectedTaxonomyId || pattern.taxonomyId || taxonomyIdFromPatternTag(detectedPatternTag) || "",
  ).trim();
  if (taxonomyId && ruleHasPrimaryProducer(taxonomyId)) {
    return target(subjectId, topicKey, null, null, taxonomyId);
  }

  return target(subjectId, topicKey);
}

/**
 * @param {string} taxonomyId
 * @returns {"subskill"|"pattern"|"topic"|null}
 */
export function classifyTaxonomyRuntimePrecision(taxonomyId) {
  const id = String(taxonomyId || "").trim();
  if (!id) return "topic";
  if (!ruleHasPrimaryProducer(id)) return "topic";
  return primaryProducerForRule(id)?.active ? "pattern" : "topic";
}

function dedupeBlocked(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.action}:${item.reasonCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {string} action
 */
export function isInterventionActionV2(action) {
  return ACTIVE_INTERVENTION_ACTIONS_V2.has(String(action || ""));
}

/**
 * Single authoritative source for every legacy/compatibility projection of
 * an ADC V2 action (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md,
 * Part 8). Two legacy vocabularies previously existed as independent,
 * hand-maintained tables that could silently drift apart:
 *   - legacyRecommendedActionFromContractV2 (EDC-legacy step vocabulary,
 *     used by utils/topic-next-step-engine.js / parent report mirror)
 *   - the old LEGACY_NEXT_ACTION_BY_ADC in
 *     lib/learning-client/scheduleAdaptivePlannerRecommendation.js (planner
 *     UI vocabulary)
 * They cannot simply share one output value — the planner vocabulary is
 * finer-grained (e.g. it distinguishes collect_more_evidence from
 * give_probe_questions from maintain, which the EDC-legacy step collapses
 * into a single "maintain_current_path"). Losing that granularity by
 * composing one through the other would be a real behavior change. Instead
 * both projections are declared together, once, per ADC action, so there is
 * exactly one place a new/changed action must be added.
 * @type {Record<string, { edcStep: string, plannerTarget: string|null }>}
 */
export const LEGACY_ACTION_PROJECTIONS_V2 = Object.freeze({
  none: Object.freeze({ edcStep: "none", plannerTarget: null }),
  collect_more_evidence: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "pause_collect_more_data",
  }),
  give_probe_questions: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "probe_skill",
  }),
  practice_more: Object.freeze({
    edcStep: "remediate_same_level",
    plannerTarget: "practice_current",
  }),
  targeted_practice: Object.freeze({
    edcStep: "remediate_same_level",
    plannerTarget: "practice_current",
  }),
  strengthen_prerequisite: Object.freeze({
    edcStep: "review_prerequisite",
    plannerTarget: "review_prerequisite",
  }),
  remove_timer: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "practice_current",
  }),
  reduce_reading_load: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "practice_current",
  }),
  guided_to_independent_transition: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "practice_current",
  }),
  maintain: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "maintain_skill",
  }),
  monitor_before_escalation: Object.freeze({
    edcStep: "maintain_current_path",
    plannerTarget: "pause_collect_more_data",
  }),
  advance_cautiously: Object.freeze({
    edcStep: "advance_level",
    plannerTarget: "advance_skill",
  }),
});

function legacyProjectionForAction(action) {
  return (
    LEGACY_ACTION_PROJECTIONS_V2[String(action || "none")] ||
    LEGACY_ACTION_PROJECTIONS_V2.maintain_current_path ||
    LEGACY_ACTION_PROJECTIONS_V2.none
  );
}

/**
 * Legacy mirror only. This adapter never selects or authorizes an action.
 * @param {Record<string, unknown>|null|undefined} contract
 */
export function legacyRecommendedActionFromContractV2(contract) {
  const action = String(contract?.action || "none");
  if (action === "none") return "none";
  return legacyProjectionForAction(action).edcStep;
}

/**
 * Planner-UI legacy mirror (see LEGACY_ACTION_PROJECTIONS_V2 above). Never
 * selects or authorizes an action — derives from the same single source as
 * legacyRecommendedActionFromContractV2.
 * @param {Record<string, unknown>|null|undefined} contract
 * @returns {string}
 */
export function legacyPlannerTargetFromContractV2(contract) {
  const action = String(contract?.action || "none");
  return legacyProjectionForAction(action).plannerTarget || "pause_collect_more_data";
}

/**
 * @param {string} legacyAction
 */
export function mapLegacyActionToV2(legacyAction) {
  return LEGACY_ACTION_MAPPINGS_V2[String(legacyAction || "")] || null;
}

/**
 * @param {{
 *   subjectId?: string,
 *   topicKey?: string,
 *   engineDecision?: string,
 *   metrics?: { questions?: number, accuracy?: number, wrong?: number },
 *   canonicalState?: Record<string, unknown>|null,
 *   unifiedDecisionContext?: Record<string, unknown>|null,
 *   detectedTaxonomyId?: string|null,
 *   detectedPatternTag?: string|null,
 *   decisionTimestamp?: number,
 *   previousAction?: string|null
 * }} input
 */
export function buildActionDecisionContractV2(input = {}) {
  const subjectId = String(input.subjectId || "");
  const topicKey = String(input.topicKey || "");
  const engineDecision = String(input.engineDecision || "insufficient_data");
  const metrics = input.metrics && typeof input.metrics === "object" ? input.metrics : {};
  const questions = Math.max(0, Number(metrics.questions) || 0);
  const canonical =
    input.canonicalState && typeof input.canonicalState === "object"
      ? input.canonicalState
      : null;
  const context =
    input.unifiedDecisionContext && typeof input.unifiedDecisionContext === "object"
      ? input.unifiedDecisionContext
      : {};
  const signals = context.signals || {};
  const actionState = String(canonical?.actionState || "withhold");
  const recommendation =
    canonical?.recommendation && typeof canonical.recommendation === "object"
      ? canonical.recommendation
      : {};
  const canonicalAllowed = recommendation.allowed === true;
  const intensityCap = String(recommendation.intensityCap || "RI0");
  const capRank = intensityRank(intensityCap);
  const interventionAuthorized =
    !!canonical &&
    canonicalAllowed &&
    capRank > 0 &&
    !["withhold", "probe_only", "diagnose_only"].includes(actionState);
  const evidenceConclusion = String(
    context?.evidenceEligibility?.unifiedConclusion || "insufficient",
  );
  const independentEvidence = context?.evidenceEligibility?.independent === true;
  const blockedAlternatives = [];
  const authorityReasonCodes = Array.isArray(recommendation.reasonCodes)
    ? recommendation.reasonCodes.map(String)
    : [];
  const decisionTimestamp = Number.isFinite(Number(input.decisionTimestamp))
    ? Number(input.decisionTimestamp)
    : Date.now();

  const block = (action, reasonCode, family = null) => {
    blockedAlternatives.push({ action, family, reasonCode });
  };

  const evidenceBasis = [
    {
      source: "canonicalState",
      codes: authorityReasonCodes,
    },
    {
      source: "unifiedDecisionContext",
      codes: Array.isArray(context?.reconciler?.reasonCodes)
        ? context.reconciler.reasonCodes.map(String)
        : [],
    },
  ];

  const authorityTraceBase = {
    soleAuthority: "canonicalState",
    canonicalPresent: !!canonical,
    actionState,
    recommendationAllowed: canonicalAllowed,
    intensityCap,
    interventionAuthorized,
  };

  const defaultActionTarget = () =>
    resolveTaxonomyAwareActionTarget(subjectId, topicKey, {
      detectedTaxonomyId: input.detectedTaxonomyId,
      detectedPatternTag: input.detectedPatternTag,
      signals,
    });

  const make = ({
    action,
    family,
    requestedIntensity = "RI0",
    actionTarget = defaultActionTarget(),
    deliveryMode = "standard",
    reasonCodes = [],
    eligible = true,
  }) => {
    const intervention = isInterventionActionV2(action);
    const requestedRank = intensityRank(requestedIntensity);
    const calibratedIntensity = capIntensityByCalibrationV1(
      action,
      requestedIntensity,
      intervention || action === "advance_cautiously" ? intensityCap : requestedIntensity,
    );
    const appliedRank = intensityRank(calibratedIntensity);
    const authorityEligible =
      !intervention || interventionAuthorized;
    const finalEligible =
      eligible &&
      action !== "none" &&
      authorityEligible &&
      (!intervention || appliedRank > 0);
    const appliedIntensity = finalEligible ? calibratedIntensity : "RI0";
    const calibration = calibrationForActionV1(action);
    const evidenceSnapshot = {
      questions,
      wrong: Math.max(0, Number(metrics.wrong) || 0),
      accuracy: Math.max(0, Math.min(100, Number(metrics.accuracy) || 0)),
      independentEvidence,
      evidenceConclusion,
      sessions: String(signals?.sessions?.consistency || "unknown"),
      recurrenceFull: signals?.pattern?.recurrenceFull === true,
      trend: String(signals?.trend?.direction || "unknown"),
      gradeRelation: String(signals?.grade?.relation || "unknown"),
      timingEvidence: signals?.timing?.eligible === true,
      readingLoadEvidence:
        signals?.v3?.recommendedNextStep === "reduce_reading_load" ||
        signals?.v3?.dominantErrorType === "reading_comprehension_issue",
    };
    const lifecycle = buildDecisionLifecycleV1({
      action,
      createdAt: decisionTimestamp,
      previousAction: input.previousAction,
      evidenceSnapshot,
    });
    const completedBlockedAlternatives = [...blockedAlternatives];
    for (const candidateAction of ACTION_CODES_V2) {
      if (candidateAction === "none" || candidateAction === action) continue;
      if (
        !completedBlockedAlternatives.some(
          (item) => item.action === candidateAction,
        )
      ) {
        completedBlockedAlternatives.push({
          action: candidateAction,
          family: null,
          reasonCode: `blocked:lower_precedence_than:${action}`,
        });
      }
    }
    return {
      version: ACTION_DECISION_CONTRACT_VERSION,
      action,
      family,
      intensity: appliedIntensity,
      eligible: finalEligible,
      intervention,
      target: actionTarget,
      deliveryMode,
      evidenceBasis,
      reasonCodes: [
        ...new Set([
          `canonical:${actionState}`,
          `canonical:cap:${intensityCap}`,
          `evidence:${evidenceConclusion}`,
          ...reasonCodes,
        ]),
      ],
      blockedAlternatives: dedupeBlocked(completedBlockedAlternatives),
      authorityTrace: {
        ...authorityTraceBase,
        requestedIntensity,
        appliedIntensity,
        capApplied: appliedRank < requestedRank,
        calibrationContractVersion: "1.0.0",
        professionalMaxIntensity: calibration?.maxIntensity || "RI0",
      },
      createdAt: lifecycle?.createdAt || new Date(decisionTimestamp).toISOString(),
      expiry: lifecycle?.expiry || null,
      evidenceSnapshot: lifecycle?.evidenceSnapshot || evidenceSnapshot,
      reevaluation: lifecycle?.reevaluation || null,
      previousAction: lifecycle?.previousAction || null,
      rollbackBehavior:
        lifecycle?.rollbackBehavior || "return_to_standard_current_topic_path",
    };
  };

  if (questions <= 0) {
    return make({
      action: "none",
      family: "none",
      eligible: false,
      reasonCodes: ["action:no_practice_evidence"],
      deliveryMode: "none",
    });
  }

  if (!canonical || actionState === "withhold") {
    for (const action of ACTIVE_INTERVENTION_ACTIONS_V2) {
      block(action, canonical ? "blocked:canonical_withhold" : "blocked:canonical_missing");
    }
    return make({
      action: "collect_more_evidence",
      family: "evidence_collection",
      deliveryMode: "observe_only",
      reasonCodes: [
        canonical ? "action:withhold_collect_only" : "action:missing_authority_collect_only",
      ],
    });
  }

  if (actionState === "probe_only") {
    for (const action of ACTIVE_INTERVENTION_ACTIONS_V2) {
      block(action, "blocked:canonical_probe_only");
    }
    return make({
      action: questions >= 3 ? "give_probe_questions" : "collect_more_evidence",
      family: "evidence_collection",
      deliveryMode: questions >= 3 ? "diagnostic_independent" : "observe_only",
      reasonCodes: [
        questions >= 3
          ? "action:canonical_probe_questions"
          : "action:thin_evidence_collect_more",
      ],
    });
  }

  if (actionState === "diagnose_only") {
    for (const action of ACTIVE_INTERVENTION_ACTIONS_V2) {
      block(action, "blocked:canonical_diagnose_only");
    }
    return make({
      action: "give_probe_questions",
      family: "evidence_collection",
      actionTarget: resolveTaxonomyAwareActionTarget(subjectId, topicKey, {
        detectedTaxonomyId: input.detectedTaxonomyId,
        detectedPatternTag: input.detectedPatternTag,
        signals,
      }),
      deliveryMode: "diagnostic_independent",
      reasonCodes: ["action:diagnosis_requires_independent_verification"],
    });
  }

  if (actionState === "maintain") {
    for (const action of ACTIVE_INTERVENTION_ACTIONS_V2) {
      if (action !== "advance_cautiously") block(action, "blocked:canonical_maintain_only");
    }
    return make({
      action: "maintain",
      family: "monitoring",
      requestedIntensity: "RI0",
      deliveryMode: "standard",
      reasonCodes: ["action:stable_mastery_maintain"],
    });
  }

  if (actionState === "expand_cautiously") {
    if (!canonicalAllowed || capRank === 0) {
      block("advance_cautiously", "blocked:canonical_advancement_not_authorized");
      return make({
        action: "maintain",
        family: "monitoring",
        requestedIntensity: "RI0",
        deliveryMode: "standard",
        reasonCodes: ["action:invalid_expand_authority_guarded_to_maintain"],
      });
    }
    const advancementBlocked =
      !independentEvidence ||
      signals?.assistance?.evidenceMode === "guided" ||
      signals?.grade?.caveatNeeded === true ||
      signals?.v3?.contradictory === true;
    if (advancementBlocked) {
      block("advance_cautiously", !independentEvidence
        ? "blocked:advancement_requires_independent_evidence"
        : "blocked:advancement_conflicting_signal");
      return make({
        action: "maintain",
        family: "monitoring",
        requestedIntensity: "RI0",
        deliveryMode: "standard",
        reasonCodes: ["action:advancement_guarded_to_maintain"],
      });
    }
    return make({
      action: "advance_cautiously",
      family: "advancement",
      requestedIntensity: "RI1",
      deliveryMode: "stabilize_then_transfer",
      reasonCodes: ["action:canonical_expand_independent_evidence"],
    });
  }

  if (actionState !== "intervene" || !interventionAuthorized) {
    for (const action of ACTIVE_INTERVENTION_ACTIONS_V2) {
      block(action, "blocked:canonical_intervention_not_authorized");
    }
    return make({
      action: "collect_more_evidence",
      family: "evidence_collection",
      deliveryMode: "observe_only",
      reasonCodes: ["action:safe_fallback_unknown_canonical_state"],
    });
  }

  const grade = signals.grade || {};
  const v3 = signals.v3 || {};
  const timing = signals.timing || {};
  const assistance = signals.assistance || {};
  const pattern = signals.pattern || {};
  const subskill = signals.subskill || {};
  const sessions = signals.sessions || {};
  const riskFlags = signals.riskFlags?.values || {};
  const trend = signals.trend || {};

  const aboveGradeCaveat =
    grade.relation === "higher" && grade.caveatNeeded === true;
  if (aboveGradeCaveat) {
    block("strengthen_prerequisite", "blocked:above_grade_not_foundation");
    block("targeted_practice", "blocked:above_grade_caveat");
    block("practice_more", "blocked:above_grade_caveat");
    return make({
      action: "monitor_before_escalation",
      family: "monitoring",
      requestedIntensity: "RI0",
      deliveryMode: "observe_only",
      reasonCodes: ["action:above_grade_mistake_monitor_only"],
    });
  }

  if (trend.eligible === true && trend.direction === "improving") {
    return make({
      action: "monitor_before_escalation",
      family: "monitoring",
      requestedIntensity: "RI0",
      deliveryMode: "observe_only",
      reasonCodes: ["action:improving_reduce_to_monitoring"],
    });
  }

  if (
    assistance.evidenceMode === "guided" &&
    independentEvidence !== true
  ) {
    if (["mastery_stable", "partial_stable"].includes(engineDecision)) {
      return make({
        action: "guided_to_independent_transition",
        family: "practice_mode_adaptation",
        requestedIntensity: "RI1",
        deliveryMode: "guided_release",
        reasonCodes: ["action:guided_success_requires_independence_transition"],
      });
    }
    return make({
      action: "give_probe_questions",
      family: "evidence_collection",
      requestedIntensity: "RI0",
      deliveryMode: "diagnostic_independent",
      reasonCodes: ["action:guided_only_requires_independent_verification"],
    });
  }

  const foundationEvidence =
    grade.relation === "lower" &&
    (grade.foundationRisk === true ||
      v3.recommendedNextStep === "strengthen_prerequisite") &&
    (v3.recommendedNextStep === "strengthen_prerequisite" ||
      v3.prerequisiteSkill ||
      grade.contentGradeKey);
  if (foundationEvidence) {
    const prerequisiteDetail = resolvePrerequisitePrecision({
      subjectId,
      topicKey,
      grade,
      v3,
      prerequisiteSignal: signals.prerequisite,
    });
    return make({
      action: "strengthen_prerequisite",
      family: "prerequisite_reinforcement",
      requestedIntensity: capRank >= 2 ? "RI2" : "RI1",
      actionTarget: target(
        subjectId,
        topicKey,
        null,
        prerequisiteDetail.id,
        null,
        prerequisiteDetail,
      ),
      deliveryMode: "review_and_hold",
      reasonCodes: [
        "action:foundation_prerequisite_supported",
        prerequisiteDetail.reasonCode,
      ],
    });
  }
  block("strengthen_prerequisite", "blocked:missing_foundation_prerequisite_evidence");

  const supportedSpeedPressure =
    (riskFlags.speedOnlyRisk === true ||
      v3.recommendedNextStep === "remove_timer" ||
      v3.dominantErrorType === "speed_pressure" ||
      v3.dominantErrorType === "guessing") &&
    timing.eligible === true &&
    (Number(timing.fastWrongCount) >= 2 ||
      Number(timing.medianWrongMs) > 0);
  if (supportedSpeedPressure) {
    return make({
      action: "remove_timer",
      family: "practice_mode_adaptation",
      requestedIntensity: "RI1",
      deliveryMode: "slow_guided_accuracy",
      reasonCodes: ["action:supported_speed_pressure"],
    });
  }
  block("remove_timer", "blocked:missing_speed_timing_evidence");

  const readingEvidence =
    v3.eligible === true &&
    (v3.recommendedNextStep === "reduce_reading_load" ||
      v3.dominantErrorType === "reading_comprehension_issue");
  if (readingEvidence) {
    return make({
      action: "reduce_reading_load",
      family: "practice_mode_adaptation",
      requestedIntensity: "RI1",
      deliveryMode: "guided_practice",
      reasonCodes: ["action:supported_reading_load_issue"],
    });
  }
  block("reduce_reading_load", "blocked:missing_reading_load_evidence");

  if (
    assistance.evidenceMode === "guided" &&
    ["mastery_stable", "partial_stable"].includes(engineDecision)
  ) {
    return make({
      action: "guided_to_independent_transition",
      family: "practice_mode_adaptation",
      requestedIntensity: "RI1",
      deliveryMode: "guided_release",
      reasonCodes: ["action:guided_success_requires_independence_transition"],
    });
  }
  block(
    "guided_to_independent_transition",
    "blocked:no_supported_guided_success_transition",
  );

  const subskillTaxonomyId = String(
    subskill.candidate?.taxonomyId || "",
  ).trim();
  if (
    subskill.safe === true &&
    subskill.candidate?.labelHe &&
    subskillTaxonomyId &&
    TAXONOMY_BY_ID[subskillTaxonomyId]
  ) {
    return make({
      action: "targeted_practice",
      family: "subskill_reinforcement",
      requestedIntensity: capRank >= 2 ? "RI2" : "RI1",
      actionTarget: target(
        subjectId,
        topicKey,
        subskill.candidate.labelHe,
        null,
        subskillTaxonomyId,
      ),
      deliveryMode: assistance.evidenceMode === "guided"
        ? "guided_practice"
        : "error_reduction_loop",
      reasonCodes: ["action:safe_subskill_target"],
    });
  }
  block(
    "targeted_practice",
    "blocked:subskill_not_safe_or_missing",
    "subskill_reinforcement",
  );

  const crossSessionPattern =
    pattern.eligible === true &&
    pattern.taxonomyMatched === true &&
    pattern.recurrenceFull === true &&
    sessions.consistency === "cross_session";
  if (crossSessionPattern) {
    return make({
      action: "targeted_practice",
      family: "current_topic_reinforcement",
      requestedIntensity: capRank >= 2 ? "RI2" : "RI1",
      deliveryMode: "error_reduction_loop",
      reasonCodes: ["action:repeated_taxonomy_pattern_cross_session"],
    });
  }
  block(
    "targeted_practice",
    pattern.taxonomyMatched
      ? "blocked:pattern_not_cross_session_or_recurrent"
      : "blocked:random_or_unknown_pattern",
    "current_topic_reinforcement",
  );

  return make({
    action: "practice_more",
    family: "current_topic_reinforcement",
    requestedIntensity: capRank >= 2 ? "RI2" : "RI1",
    deliveryMode: assistance.evidenceMode === "guided"
      ? "guided_practice"
      : "standard",
    reasonCodes: [
      trend.eligible === true && trend.direction === "declining"
        ? "action:declining_same_level_reinforcement"
        : "action:topic_level_reinforcement",
    ],
  });
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 */
export function validateActionDecisionContractV2(contract) {
  const value = contract && typeof contract === "object" ? contract : {};
  const errors = [];
  if (value.version !== ACTION_DECISION_CONTRACT_VERSION) errors.push("version_invalid");
  if (!ACTION_CODES_V2.includes(String(value.action || ""))) errors.push("action_invalid");
  if (!ACTION_FAMILIES_V2.includes(String(value.family || ""))) errors.push("family_invalid");
  if (!ACTION_DELIVERY_MODES_V2.includes(String(value.deliveryMode || ""))) {
    errors.push("delivery_mode_invalid");
  }
  if (!Object.hasOwn(RI_RANK, String(value.intensity || ""))) errors.push("intensity_invalid");
  if (!value.target || typeof value.target !== "object") errors.push("target_missing");
  if (!Array.isArray(value.evidenceBasis)) errors.push("evidence_basis_missing");
  if (!Array.isArray(value.reasonCodes) || value.reasonCodes.length === 0) {
    errors.push("reason_codes_missing");
  }
  if (!Array.isArray(value.blockedAlternatives)) errors.push("blocked_alternatives_missing");
  if (!value.authorityTrace || value.authorityTrace.soleAuthority !== "canonicalState") {
    errors.push("canonical_authority_trace_missing");
  }
  if (!value.createdAt || !Number.isFinite(Date.parse(String(value.createdAt)))) {
    errors.push("created_at_missing");
  }
  if (
    !value.expiry ||
    !Number.isFinite(Date.parse(String(value.expiry.expiresAt))) ||
    !Number.isFinite(Number(value.expiry.afterActivities))
  ) {
    errors.push("expiry_missing");
  }
  if (
    !value.reevaluation ||
    !String(value.reevaluation.condition || "") ||
    !Number.isFinite(Number(value.reevaluation.afterActivities))
  ) {
    errors.push("reevaluation_missing");
  }
  if (!value.evidenceSnapshot || typeof value.evidenceSnapshot !== "object") {
    errors.push("evidence_snapshot_missing");
  }
  if (!String(value.rollbackBehavior || "")) {
    errors.push("rollback_behavior_missing");
  }
  const capRank = intensityRank(value.authorityTrace?.intensityCap);
  const actionRank = intensityRank(value.intensity);
  if (actionRank > capRank && isInterventionActionV2(value.action)) {
    errors.push("canonical_cap_exceeded");
  }
  if (
    value.eligible === true &&
    isInterventionActionV2(value.action) &&
    value.authorityTrace?.interventionAuthorized !== true
  ) {
    errors.push("intervention_without_canonical_authority");
  }
  if (
    value.action === "targeted_practice" &&
    value.family === "subskill_reinforcement" &&
    (!String(value.target?.subskill || "").trim() ||
      !TAXONOMY_BY_ID[String(value.target?.subskillId || "")])
  ) {
    errors.push("subskill_target_missing");
  }
  if (
    value.action === "strengthen_prerequisite" &&
    !String(value.target?.prerequisite || "").trim()
  ) {
    errors.push("prerequisite_target_missing");
  }
  if (value.action === "strengthen_prerequisite") {
    const prerequisiteValidation = validatePrerequisitePrecision(
      value.target?.prerequisiteDetail,
    );
    errors.push(...prerequisiteValidation.errors);
  }
  return { ok: errors.length === 0, errors };
}
