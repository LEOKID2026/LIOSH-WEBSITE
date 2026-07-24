/**
 * Professional calibration for the 11 ADC V2 actions.
 *
 * docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 7,
 * option B): this contract previously declared `allows`, `blocks`,
 * `minWrongEvents`, `minSessions`, `trendPolicy`, `guidedPolicy`,
 * `timingPolicy`, and `gradePolicy` per action, but nothing in the codebase
 * ever read them — they were documentation, not enforcement, while a
 * validator checked only that they existed (not that anything used them).
 * That is a second, contradicting "source of truth" next to the real
 * enforcement, which actually lives in:
 *
 *   - min wrong-events / min-sessions for a safe subskill claim:
 *     utils/subskill-candidate-safety.js (MIN_WRONG_EVENTS_FOR_SAFE_SUBSKILL,
 *     recurrencePolicy.minSessionsForSubskill from
 *     utils/diagnostic-engine-v2/taxonomy-recurrence-policy.js)
 *   - cross-session vs single-session gating for topic-level targeted_practice:
 *     utils/learning-pattern-decision/build-unified-decision-context.js
 *     (sessionSnapshot -> signals.sessions.consistency)
 *   - trend policy (improving never escalates):
 *     utils/action-decision-contract/action-decision-contract-v2.js,
 *     `trend.eligible && trend.direction === "improving"` branch
 *   - guided-vs-independent policy (guided evidence never claims mastery):
 *     action-decision-contract-v2.js's `assistance.evidenceMode === "guided"`
 *     branches, fed by GUIDED_MODES in build-unified-decision-context.js
 *   - timing policy (remove_timer requires real timing evidence):
 *     action-decision-contract-v2.js's `supportedSpeedPressure` check
 *   - grade policy (above-grade never becomes a foundation claim; grade
 *     foundation never becomes an exact skill):
 *     action-decision-contract-v2.js's `aboveGradeCaveat`/`foundationEvidence`
 *     branches + utils/action-decision-contract/prerequisite-precision.js
 *
 * Only the fields actually consumed by calibrationForActionV1's callers
 * remain declared here: `maxIntensity` (capIntensityByCalibrationV1),
 * `reevaluateAfterActivities` / `maxAgeHours` (buildDecisionLifecycleV1),
 * and `transitionWhen` (copied into the lifecycle's reevaluation metadata).
 */
export const DECISION_CALIBRATION_CONTRACT_VERSION = "1.0.0";

const ACTIONS = {
  collect_more_evidence: {
    family: "evidence_collection",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 4,
    maxAgeHours: 72,
    transitionWhen: ["sufficient_independent_evidence", "probe_hypothesis_available"],
  },
  give_probe_questions: {
    family: "evidence_collection",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 3,
    maxAgeHours: 48,
    transitionWhen: ["hypothesis_confirmed", "hypothesis_rejected"],
  },
  practice_more: {
    family: "current_topic_reinforcement",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 5,
    maxAgeHours: 120,
    transitionWhen: ["pattern_confirmed", "mastery_recovered", "evidence_remains_uncertain"],
  },
  targeted_practice: {
    family: "current_or_subskill_reinforcement",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 6,
    maxAgeHours: 168,
    transitionWhen: ["mastery_recovered", "pattern_disappears", "prerequisite_confirmed"],
  },
  strengthen_prerequisite: {
    family: "prerequisite_reinforcement",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 6,
    maxAgeHours: 168,
    transitionWhen: ["foundation_stable", "exact_prerequisite_rejected", "topic_ready"],
  },
  remove_timer: {
    family: "practice_mode_adaptation",
    maxIntensity: "RI1",
    reevaluateAfterActivities: 4,
    maxAgeHours: 72,
    transitionWhen: ["accuracy_stabilizes", "timing_hypothesis_rejected"],
  },
  reduce_reading_load: {
    family: "practice_mode_adaptation",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["independent_reading_stabilizes", "reading_hypothesis_rejected"],
  },
  guided_to_independent_transition: {
    family: "practice_mode_adaptation",
    maxIntensity: "RI2",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["independent_success", "support_still_required"],
  },
  maintain: {
    family: "monitoring",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 8,
    maxAgeHours: 336,
    transitionWhen: ["new_recurrent_evidence", "readiness_to_advance"],
  },
  monitor_before_escalation: {
    family: "monitoring",
    maxIntensity: "RI0",
    reevaluateAfterActivities: 4,
    maxAgeHours: 96,
    transitionWhen: ["new_independent_evidence", "pattern_disappears", "pattern_reconfirmed"],
  },
  advance_cautiously: {
    family: "advancement",
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
    if (!Array.isArray(policy?.transitionWhen) || policy.transitionWhen.length === 0) {
      errors.push(`${action}:transition_policy_missing`);
    }
  }
  return { ok: errors.length === 0, errors };
}
