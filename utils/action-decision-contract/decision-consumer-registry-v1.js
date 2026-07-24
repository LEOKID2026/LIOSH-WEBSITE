export const DECISION_CONSUMER_REGISTRY_VERSION = "1.0.0";

export const DECISION_CONSUMER_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    id: "learning-masters",
    paths: Object.freeze([
      "pages/learning/math-master.js",
      "pages/learning/geometry-master.js",
      "pages/learning/english-master.js",
      "pages/learning/hebrew-master.js",
      "pages/learning/science-master.js",
      "pages/learning/history-master.js",
      "pages/learning/moledet-geography-master.js",
    ]),
    status: "adc_v2",
    role: "runtime_executor",
  }),
  Object.freeze({
    id: "legacy-internal-adaptive-streak",
    paths: Object.freeze([
      "lib/learning/regular-internal-adaptive.js",
      "lib/learning/science-internal-adaptive.js",
      "lib/learning/adaptive-streak-mode-eligibility.js",
      "hooks/useStudentDisplayLevelPractice.js",
    ]),
    status: "legacy_evidence_only",
    role: "observational_streak_metrics_cannot_authorize_level_or_route",
  }),
  Object.freeze({
    id: "student-action-api",
    paths: Object.freeze(["pages/api/student/action-decisions.js"]),
    status: "adc_v2",
    role: "validated_public_projection",
  }),
  Object.freeze({
    id: "student-action-hook",
    paths: Object.freeze(["hooks/useStudentActionDecision.js"]),
    status: "adc_v2",
    role: "server_contract_consumer",
  }),
  Object.freeze({
    id: "adaptive-planner-ui",
    paths: Object.freeze([
      "lib/learning-client/scheduleAdaptivePlannerRecommendation.js",
    ]),
    status: "one_way_compatibility_mirror",
    role: "adc_to_legacy_display_adapter",
  }),
  Object.freeze({
    id: "adaptive-planner-api",
    paths: Object.freeze(["pages/api/learning/planner-recommendation.js"]),
    status: "removed",
    role: "http_410_no_decision_authority",
  }),
  Object.freeze({
    id: "topic-action-selector",
    paths: Object.freeze([
      "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    ]),
    status: "adc_v2",
    role: "authoritative_action_selection",
  }),
  Object.freeze({
    id: "subject-rollup",
    paths: Object.freeze([
      "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
    ]),
    status: "adc_v2",
    role: "read_only_rollup",
  }),
  Object.freeze({
    id: "parent-report",
    paths: Object.freeze([
      "utils/parent-report-engine-insights-he.js",
      "utils/detailed-parent-report.js",
      "pages/learning/parent-report.js",
      "pages/learning/parent-report-detailed.js",
      "pages/learning/parent-report-detailed.renderable.jsx",
    ]),
    status: "adc_v2",
    role: "parent_safe_translation",
  }),
  Object.freeze({
    id: "legacy-edc-recommended-action",
    paths: Object.freeze([
      "utils/action-decision-contract/action-decision-contract-v2.js",
      "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    ]),
    status: "one_way_compatibility_mirror",
    role: "adc_to_legacy_serialization_only",
  }),
  Object.freeze({
    id: "diagnostic-v3-next-step",
    paths: Object.freeze([
      "utils/diagnostic-engine-v3/run-diagnostic-engine-v3.js",
      "utils/learning-pattern-decision/build-unified-decision-context.js",
    ]),
    status: "legacy_evidence_only",
    role: "bounded_signal_input_cannot_authorize_action",
  }),
  Object.freeze({
    id: "topic-next-step-signals",
    paths: Object.freeze([
      "utils/topic-next-step-engine.js",
      "utils/topic-next-step-phase2.js",
    ]),
    status: "legacy_evidence_only",
    role: "diagnostic_signal_and_copy_fallback_only",
  }),
  Object.freeze({
    id: "teacher-guidance",
    paths: Object.freeze([
      "lib/teacher-server/teacher-guidance-v2.server.js",
      "pages/teacher/class/[classId].js",
      "pages/teacher/student/[studentId].js",
    ]),
    status: "separate_decision_domain",
    role: "teacher_cohort_assignment_not_student_learning_route",
  }),
  Object.freeze({
    id: "school-guidance-view",
    paths: Object.freeze(["lib/school-portal/school-report-view-model.js"]),
    status: "separate_decision_domain",
    role: "teacher_guidance_display_only",
  }),
  Object.freeze({
    id: "system-intelligence",
    paths: Object.freeze([
      "utils/system-intelligence/global-score.js",
      "utils/system-intelligence/feedback-decision-engine.js",
      "utils/system-intelligence/time-decision-engine.js",
      "utils/system-intelligence/dependency-engine.js",
      "utils/system-intelligence/consistency-engine.js",
    ]),
    status: "separate_decision_domain",
    role: "platform_feedback_not_student_learning_route",
  }),
]);

export function validateDecisionConsumerRegistryV1(
  registry = DECISION_CONSUMER_REGISTRY_V1,
) {
  const allowedStatuses = new Set([
    "adc_v2",
    "one_way_compatibility_mirror",
    "legacy_evidence_only",
    "separate_decision_domain",
    "removed",
  ]);
  const ids = new Set();
  const errors = [];
  for (const entry of registry) {
    if (!entry?.id || ids.has(entry.id)) errors.push("consumer_id_invalid");
    ids.add(entry?.id);
    if (!allowedStatuses.has(entry?.status)) {
      errors.push(`consumer_status_invalid:${entry?.id || "unknown"}`);
    }
    if (!Array.isArray(entry?.paths) || entry.paths.length === 0) {
      errors.push(`consumer_paths_missing:${entry?.id || "unknown"}`);
    }
    if (!entry?.role) errors.push(`consumer_role_missing:${entry?.id || "unknown"}`);
  }
  return { ok: errors.length === 0, errors };
}
