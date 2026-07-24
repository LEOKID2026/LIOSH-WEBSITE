export const DECISION_CALIBRATION_CONTRACT_VERSION = "1.0.0";

const ACTIONS = {
  collect_more_evidence: {
    family: "evidence_collection",
    allows: ["missing_authority", "thin_evidence", "uncertain_or_conflicting_evidence"],
    blocks: ["no_practice_activity"],
    minWrongEvents: 0,
    minSessions: 0,
    trendPolicy: "observe",
    guidedPolicy: "allowed_without_specificity",
    timingPolicy: "not_required",
    gradePolicy: "topic_unchanged",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 4,
    maxAgeHours: 72,
    transitionWhen: ["sufficient_independent_evidence", "probe_hypothesis_available"],
  },
  give_probe_questions: {
    family: "evidence_collection",
    allows: ["probe_only_authority", "diagnose_only_authority", "candidate_pattern_unconfirmed"],
    blocks: ["confirmed_pattern_with_intervention_authority"],
    minWrongEvents: 1,
    minSessions: 1,
    trendPolicy: "verify_before_change",
    guidedPolicy: "probe_must_be_independent",
    timingPolicy: "not_required",
    gradePolicy: "probe_at_content_grade",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 3,
    maxAgeHours: 48,
    transitionWhen: ["hypothesis_confirmed", "hypothesis_rejected"],
  },
  practice_more: {
    family: "current_topic_reinforcement",
    allows: ["same_topic_need", "declining_without_specific_pattern"],
    blocks: ["above_grade_caveat", "strong_independent_mastery", "recent_improvement"],
    minWrongEvents: 2,
    minSessions: 1,
    trendPolicy: "improving_downgrades_to_monitor",
    guidedPolicy: "no_subskill_claim",
    timingPolicy: "timer_unchanged",
    gradePolicy: "same_grade_topic_only",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 5,
    maxAgeHours: 120,
    transitionWhen: ["pattern_confirmed", "mastery_recovered", "evidence_remains_uncertain"],
  },
  targeted_practice: {
    family: "current_or_subskill_reinforcement",
    allows: ["cross_session_recurrence", "safe_subskill"],
    blocks: ["single_session_only", "guided_only", "topic_level_subskill_claim", "recent_improvement"],
    minWrongEvents: 3,
    minSessions: 2,
    trendPolicy: "improving_downgrades_to_monitor",
    guidedPolicy: "subskill_requires_independent_evidence",
    timingPolicy: "not_a_timing_intervention",
    gradePolicy: "never_cross_topic",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 6,
    maxAgeHours: 168,
    transitionWhen: ["mastery_recovered", "pattern_disappears", "prerequisite_confirmed"],
  },
  strengthen_prerequisite: {
    family: "prerequisite_reinforcement",
    allows: ["exact_prerequisite_evidence", "grade_foundation_area"],
    blocks: ["above_grade_content", "strong_independent_mastery", "missing_foundation_evidence"],
    minWrongEvents: 3,
    minSessions: 2,
    trendPolicy: "improving_reduces_intensity",
    guidedPolicy: "independent_failure_required",
    timingPolicy: "not_required",
    gradePolicy: "grade_foundation_is_never_exact_skill",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 6,
    maxAgeHours: 168,
    transitionWhen: ["foundation_stable", "exact_prerequisite_rejected", "topic_ready"],
  },
  remove_timer: {
    family: "practice_mode_adaptation",
    allows: ["timing_evidence", "fast_wrong_recurrence"],
    blocks: ["missing_timing_evidence", "slow_accurate"],
    minWrongEvents: 2,
    minSessions: 1,
    trendPolicy: "improving_restores_standard_timing",
    guidedPolicy: "allowed_temporarily",
    timingPolicy: "required",
    gradePolicy: "content_unchanged",
    maxIntensity: "RI1",
    reevaluateAfterActivities: 4,
    maxAgeHours: 72,
    transitionWhen: ["accuracy_stabilizes", "timing_hypothesis_rejected"],
  },
  reduce_reading_load: {
    family: "practice_mode_adaptation",
    allows: ["reading_load_evidence"],
    blocks: ["missing_reading_load_evidence", "content_level_reduction"],
    minWrongEvents: 2,
    minSessions: 1,
    trendPolicy: "improving_restores_standard_presentation",
    guidedPolicy: "same_learning_goal",
    timingPolicy: "not_required",
    gradePolicy: "content_goal_unchanged",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["independent_reading_stabilizes", "reading_hypothesis_rejected"],
  },
  guided_to_independent_transition: {
    family: "practice_mode_adaptation",
    allows: ["guided_success", "independent_gap"],
    blocks: ["no_guided_success", "independent_mastery"],
    minWrongEvents: 1,
    minSessions: 1,
    trendPolicy: "advance_release_step_only_after_success",
    guidedPolicy: "fade_support_one_step",
    timingPolicy: "not_required",
    gradePolicy: "content_unchanged",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["independent_success", "support_still_required"],
  },
  maintain: {
    family: "monitoring",
    allows: ["stable_mastery", "strong_independent_success"],
    blocks: ["confirmed_active_gap"],
    minWrongEvents: 0,
    minSessions: 1,
    trendPolicy: "continue_on_stable_or_improving",
    guidedPolicy: "independent_success_preferred",
    timingPolicy: "standard",
    gradePolicy: "current_path",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 8,
    maxAgeHours: 336,
    transitionWhen: ["new_recurrent_evidence", "readiness_to_advance"],
  },
  monitor_before_escalation: {
    family: "monitoring",
    allows: ["recent_improvement", "above_grade_caveat", "conflicting_evidence", "stale_pattern"],
    blocks: ["none"],
    minWrongEvents: 1,
    minSessions: 1,
    trendPolicy: "preferred_on_recent_improvement",
    guidedPolicy: "no_specificity",
    timingPolicy: "not_required",
    gradePolicy: "above_grade_never_foundation",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["new_independent_evidence", "pattern_disappears", "pattern_reconfirmed"],
  },
  advance_cautiously: {
    family: "advancement",
    allows: ["strong_independent_mastery", "canonical_expand_authority"],
    blocks: ["guided_only", "grade_caveat", "contradictory_evidence", "active_gap"],
    minWrongEvents: 0,
    minSessions: 2,
    trendPolicy: "stable_or_improving_only",
    guidedPolicy: "independent_evidence_required",
    timingPolicy: "not_required",
    gradePolicy: "one_step_only",
    maxIntensity: "RI1",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["new_level_stable", "rollback_signal"],
  },
};

export const DECISION_CALIBRATION_ACTIONS_V1 = Object.freeze(
  Object.fromEntries(
    Object.entries(ACTIONS).map(([action, policy]) => [
      action,
      Object.freeze({
        action,
        temporary: true,
        rollbackBehavior:
          action === "advance_cautiously"
            ? "return_one_step_to_previous_path"
            : "return_to_standard_current_topic_path",
        ...policy,
      }),
    ])
  )
);

export const DECISION_CALIBRATION_CONTRACT_V1 = Object.freeze({
  contractVersion: DECISION_CALIBRATION_CONTRACT_VERSION,
  authority: "canonicalState_authorizes; calibration_constrains; ADC_V2_selects",
  childLabelPolicy: "temporary_learning_decision_not_permanent_label",
  prohibitedConclusions: Object.freeze([
    "clinical_diagnosis",
    "emotional_diagnosis",
    "permanent_child_label",
  ]),
  actions: DECISION_CALIBRATION_ACTIONS_V1,
});

const RI_RANK = Object.freeze({ RI0: 0, RI1: 1, RI2: 2, RI3: 3 });
const RI_FROM_RANK = Object.freeze(["RI0", "RI1", "RI2", "RI3"]);

export function calibrationForActionV1(action) {
  return DECISION_CALIBRATION_ACTIONS_V1[String(action || "")] || null;
}

export function capIntensityByCalibrationV1(action, requestedIntensity, canonicalCap) {
  const policy = calibrationForActionV1(action);
  const requested = RI_RANK[String(requestedIntensity || "")] ?? 0;
  const canonical = RI_RANK[String(canonicalCap || "")] ?? 0;
  const professional = RI_RANK[String(policy?.maxIntensity || "RI0")] ?? 0;
  return RI_FROM_RANK[Math.min(requested, canonical, professional)];
}

export function buildDecisionLifecycleV1({
  action,
  createdAt,
  previousAction = null,
  evidenceSnapshot = {},
} = {}) {
  const policy =
    calibrationForActionV1(action) ||
    (String(action || "") === "none"
      ? DECISION_CALIBRATION_ACTIONS_V1.collect_more_evidence
      : null);
  if (!policy) return null;
  const createdMs = Number.isFinite(Number(createdAt))
    ? Number(createdAt)
    : Date.now();
  const expiresMs = createdMs + policy.maxAgeHours * 60 * 60 * 1000;
  return {
    createdAt: new Date(createdMs).toISOString(),
    expiry: {
      expiresAt: new Date(expiresMs).toISOString(),
      afterActivities: policy.reevaluateAfterActivities,
      temporary: true,
    },
    evidenceSnapshot: { ...evidenceSnapshot },
    reevaluation: {
      condition: "expiry_or_new_material_evidence",
      afterActivities: policy.reevaluateAfterActivities,
      onNewIndependentEvidence: true,
      transitionWhen: [...policy.transitionWhen],
    },
    previousAction: previousAction ? String(previousAction) : null,
    rollbackBehavior: policy.rollbackBehavior,
  };
}

export function validateDecisionCalibrationContractV1(
  contract = DECISION_CALIBRATION_CONTRACT_V1
) {
  const errors = [];
  if (contract?.contractVersion !== DECISION_CALIBRATION_CONTRACT_VERSION) {
    errors.push("calibration_version_invalid");
  }
  const entries = Object.entries(contract?.actions || {});
  if (entries.length !== 11) errors.push("calibration_action_count_invalid");
  for (const [action, policy] of entries) {
    if (policy?.action !== action) errors.push(`${action}:action_mismatch`);
    if (!Object.hasOwn(RI_RANK, String(policy?.maxIntensity || ""))) {
      errors.push(`${action}:max_intensity_invalid`);
    }
    if (!Number.isFinite(Number(policy?.reevaluateAfterActivities))) {
      errors.push(`${action}:reevaluation_missing`);
    }
    if (!Number.isFinite(Number(policy?.maxAgeHours))) {
      errors.push(`${action}:expiry_missing`);
    }
    if (!Array.isArray(policy?.allows) || !Array.isArray(policy?.blocks)) {
      errors.push(`${action}:evidence_policy_missing`);
    }
  }
  return { ok: errors.length === 0, errors };
}
