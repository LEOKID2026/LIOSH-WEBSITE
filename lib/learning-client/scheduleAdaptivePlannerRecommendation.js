import {
  fetchStudentActionDecisions,
  findStudentActionDecision,
} from "./studentLearningProfileClient.js";
import { legacyPlannerTargetFromContractV2 } from "../../utils/action-decision-contract/action-decision-contract-v2.js";

export function plannerCompatibilityPayloadFromActionDecisionV2(
  decision,
  practiceResult,
) {
  const level = String(practiceResult?.level || "medium");
  const targetDifficulty =
    decision.action === "advance_cautiously"
      ? "hard"
      : decision.action === "strengthen_prerequisite"
        ? "easy"
        : level;
  return {
    ok: true,
    clientRequestId: practiceResult?.clientRequestId ?? null,
    recommendation: {
      nextAction: legacyPlannerTargetFromContractV2(decision),
      targetDifficulty,
      questionCount: Math.max(
        0,
        Number(decision.expiry?.afterActivities) || 0,
      ),
    },
    diagnostics: {
      safetyViolationCount: 0,
      metadataSubjectFallback: false,
      authority: "action_decision_contract_v2",
    },
  };
}

/**
 * @param {Record<string, unknown>} practiceResult - plain JSON-serializable fields; optional numeric `clientRequestId` for stale-response filtering
 * @param {{ onResult?: (data: unknown) => void }} [options]
 * @returns {Promise<unknown> | undefined}
 */
export function scheduleAdaptivePlannerRecommendation(practiceResult, options) {
  try {
    if (typeof window === "undefined") return undefined;
    if (!practiceResult || typeof practiceResult !== "object") return undefined;
    const onResult = options && typeof options.onResult === "function" ? options.onResult : null;
    const p = fetchStudentActionDecisions()
      .then((response) => {
        const decision = findStudentActionDecision(
          response,
          String(practiceResult.subject || ""),
          String(practiceResult.topic || ""),
        );
        const data = decision
          ? plannerCompatibilityPayloadFromActionDecisionV2(
              decision,
              practiceResult,
            )
          : null;
        if (data && typeof window !== "undefined") {
          window.__LEO_LAST_PLANNER_REC__ = data;
        }
        if (onResult) {
          try {
            onResult(data);
          } catch {
            /* ignore */
          }
        }
        return data;
      })
      .catch(() => {
        if (onResult) {
          try {
            onResult(null);
          } catch {
            /* ignore */
          }
        }
        return null;
      });
    return p;
  } catch {
    if (options && typeof options.onResult === "function") {
      try {
        options.onResult(null);
      } catch {
        /* ignore */
      }
    }
    return undefined;
  }
}
