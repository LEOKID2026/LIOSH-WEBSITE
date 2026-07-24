import { useRef } from "react";
import {
  advanceContentOverride,
  emptyContentOverrideState,
} from "../lib/learning/prerequisite-content-source.js";

/**
 * Real runtime consumption of `strengthen_prerequisite`'s exact_skill
 * routing (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md,
 * Part 2).
 *
 * Deliberately separates:
 *   - decisionTopic: the topic ActionDecisionContractV2 decided on — the
 *     `topicKey` passed into useStudentActionDecision, driving fetch/identity.
 *     NEVER touched here.
 *   - contentOverrideTarget: a temporary, real, registry-validated content
 *     source for the NEXT QUESTION ONLY, derived exclusively from
 *     `directive.routePolicy.prerequisite` (already validated end-to-end —
 *     registered curriculum skill AND real bank content, see
 *     utils/action-decision-contract/prerequisite-precision.js +
 *     lib/learning/prerequisite-content-source.js).
 *
 * This hook never calls useStudentActionDecision, never reads/writes
 * subject/topicKey/gradeKey state, and never triggers a fetch — it is a
 * pure derivation from the already-fetched directive, keyed by decision
 * identity exactly like hooks/useActionDecisionRouteSync.js. All
 * state-transition logic lives in lib/learning/prerequisite-content-source.js
 * (pure functions, directly testable without a React renderer).
 *
 * @param {object} directive executor directive from useStudentActionDecision()
 * @param {string} subjectId
 * @returns {{ subject: string, topic: string|null, skillId: string, bankSize: number }|null}
 */
export function usePrerequisiteContentOverride(directive, subjectId) {
  const stateRef = useRef(emptyContentOverrideState());
  stateRef.current = advanceContentOverride(stateRef.current, directive, subjectId);
  return stateRef.current.target;
}
