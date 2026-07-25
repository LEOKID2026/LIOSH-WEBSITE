import { primaryProducerForRule } from "./taxonomy-rule-primary-producers.js";

const LEVELS = ["easy", "medium", "hard"];

function levelStep(level, delta) {
  const index = LEVELS.indexOf(String(level || ""));
  if (index < 0) return String(level || "medium");
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index + delta))];
}

function validDateMs(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : null;
}

export function isActionDecisionExpired(contract, {
  nowMs = Date.now(),
  activitiesSinceDecision = 0,
} = {}) {
  const effectiveNowMs = Number.isFinite(Number(nowMs))
    ? Number(nowMs)
    : Date.now();
  const expiresAt = validDateMs(contract?.expiry?.expiresAt);
  const afterActivities = Number(contract?.expiry?.afterActivities);
  return (
    !contract ||
    contract.eligible !== true ||
    (expiresAt != null && effectiveNowMs >= expiresAt) ||
    (Number.isFinite(afterActivities) &&
      afterActivities >= 0 &&
      activitiesSinceDecision >= afterActivities)
  );
}

function focusedKind(contract) {
  const taxonomyId = String(contract?.target?.subskillId || "");
  return taxonomyId ? primaryProducerForRule(taxonomyId)?.probeKind || null : null;
}

function baseDirective(contract, ctx) {
  return {
    contractVersion: "learning-action-executor-v1",
    sourceContractVersion: contract?.version || contract?.contractVersion || null,
    action: String(contract?.action || "none"),
    active: true,
    subject: String(contract?.target?.subject || ctx.subjectId || ""),
    topic: String(contract?.target?.topic || ctx.topicKey || ""),
    questionPolicy: {
      mode: "standard",
      preferKind: null,
      keepSameTopic: true,
      additionalQuestions: 0,
    },
    routePolicy: {
      topic: String(contract?.target?.topic || ctx.topicKey || ""),
      prerequisite: null,
      level: String(ctx.levelKey || "medium"),
      maxAdvanceSteps: 0,
    },
    sessionPolicy: {
      timerEnabled: true,
      readingPresentation: "standard",
      guidance: "standard",
      allowEscalation: true,
      preserveLearningGoal: true,
    },
    lifecycle: {
      createdAt: contract?.createdAt || null,
      expiresAt: contract?.expiry?.expiresAt || null,
      afterActivities: contract?.expiry?.afterActivities ?? null,
      reevaluation: contract?.reevaluation || null,
      previousAction: contract?.previousAction || null,
      rollbackBehavior: contract?.rollbackBehavior || null,
    },
    executionReasonCodes: [],
  };
}

export function executeActionDecisionContractV2(contract, ctx = {}) {
  const activitiesSinceDecision = Math.max(
    0,
    Number(ctx.activitiesSinceDecision) || 0
  );
  if (
    isActionDecisionExpired(contract, {
      nowMs: ctx.nowMs,
      activitiesSinceDecision,
    })
  ) {
    return {
      ...baseDirective(contract, ctx),
      active: false,
      action: "none",
      rollback: {
        behavior:
          contract?.rollbackBehavior || "return_to_standard_current_topic_path",
        topic: String(ctx.topicKey || contract?.target?.topic || ""),
        level: String(ctx.levelKey || "medium"),
      },
      executionReasonCodes: ["executor:decision_expired_or_ineligible"],
    };
  }

  const directive = baseDirective(contract, ctx);
  const remaining = Math.max(
    0,
    Number(contract.expiry?.afterActivities || 0) - activitiesSinceDecision
  );
  switch (contract.action) {
    case "collect_more_evidence":
      directive.questionPolicy.additionalQuestions = remaining;
      directive.sessionPolicy.allowEscalation = false;
      directive.executionReasonCodes.push("executor:observe_current_path");
      break;
    case "give_probe_questions":
      directive.questionPolicy.mode = "independent_probe";
      directive.questionPolicy.preferKind = focusedKind(contract);
      directive.sessionPolicy.guidance = "independent";
      directive.sessionPolicy.allowEscalation = false;
      directive.executionReasonCodes.push("executor:independent_probe");
      break;
    case "practice_more":
      directive.questionPolicy.additionalQuestions = remaining;
      directive.questionPolicy.preferKind = focusedKind(contract);
      if (contract.target?.subskill && contract.target?.subskillId) {
        directive.questionPolicy.mode = "subskill_focus";
      } else if (directive.questionPolicy.preferKind) {
        directive.questionPolicy.mode = "topic_focus";
      }
      directive.executionReasonCodes.push("executor:same_topic_same_grade");
      break;
    case "targeted_practice":
      directive.questionPolicy.mode = contract.target?.subskill
        ? "subskill_focus"
        : "topic_focus";
      directive.questionPolicy.preferKind = focusedKind(contract);
      directive.executionReasonCodes.push(
        contract.target?.subskill
          ? "executor:safe_subskill_focus"
          : "executor:topic_level_focus"
      );
      break;
    case "strengthen_prerequisite": {
      const detail = contract.target?.prerequisiteDetail || {};
      const exact = detail.precision === "exact_skill";
      directive.routePolicy.prerequisite = exact
        ? String(contract.target?.prerequisite || "")
        : null;
      // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md
      // (Part 3): previously read contract.target?.prerequisiteTopic, a
      // field the contract builder never set — exact-skill routing was
      // silently a no-op. The real topic lives on
      // prerequisiteDetail.topicKey (utils/curriculum-skill-entity-registry.js),
      // populated by utils/action-decision-contract/prerequisite-precision.js.
      directive.routePolicy.topic =
        exact && detail.topicKey
          ? String(detail.topicKey)
          : directive.routePolicy.topic;
      directive.routePolicy.level = exact
        ? String(ctx.levelKey || "medium")
        : levelStep(ctx.levelKey, -1);
      directive.routePolicy.keepSameTopic = !exact;
      directive.sessionPolicy.allowEscalation = false;
      directive.executionReasonCodes.push(
        exact
          ? "executor:validated_exact_prerequisite"
          : "executor:limited_grade_foundation_review"
      );
      break;
    }
    case "remove_timer":
      directive.sessionPolicy.timerEnabled = false;
      directive.executionReasonCodes.push("executor:temporary_timer_removal");
      break;
    case "reduce_reading_load":
      directive.sessionPolicy.readingPresentation = "concise_chunked";
      directive.executionReasonCodes.push("executor:same_goal_reduced_reading_load");
      break;
    case "guided_to_independent_transition": {
      const total = Math.max(1, Number(contract.expiry?.afterActivities) || 1);
      const progress = activitiesSinceDecision / total;
      directive.sessionPolicy.guidance =
        progress < 0.34
          ? "guided"
          : progress < 0.67
            ? "reduced_guidance"
            : "independent";
      directive.executionReasonCodes.push("executor:fade_guidance_one_step");
      break;
    }
    case "maintain":
      directive.sessionPolicy.allowEscalation = false;
      directive.executionReasonCodes.push("executor:hold_current_path");
      break;
    case "monitor_before_escalation":
      directive.sessionPolicy.allowEscalation = false;
      directive.questionPolicy.additionalQuestions = remaining;
      directive.executionReasonCodes.push("executor:monitor_without_path_change");
      break;
    case "advance_cautiously":
      directive.routePolicy.level = levelStep(ctx.levelKey, 1);
      directive.routePolicy.maxAdvanceSteps = 1;
      directive.sessionPolicy.allowEscalation = false;
      directive.executionReasonCodes.push("executor:advance_one_step_only");
      break;
    default:
      directive.active = false;
      directive.action = "none";
      directive.executionReasonCodes.push("executor:unsupported_action_fail_closed");
  }
  return directive;
}

export function advanceActionDecisionExecutionState(state, contract, {
  nowMs = Date.now(),
} = {}) {
  const nextActivities = Math.max(0, Number(state?.activitiesSinceDecision) || 0) + 1;
  return {
    contract,
    activitiesSinceDecision: nextActivities,
    lastActivityAt: new Date(nowMs).toISOString(),
    reevaluationRequired: isActionDecisionExpired(contract, {
      nowMs,
      activitiesSinceDecision: nextActivities,
    }),
  };
}
