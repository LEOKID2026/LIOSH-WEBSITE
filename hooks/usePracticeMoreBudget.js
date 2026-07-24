import { useRef } from "react";
import {
  advancePracticeMoreBudget,
  consumePracticeMoreBudget,
  emptyPracticeMoreBudgetState,
} from "../lib/learning/practice-more-budget.js";

/**
 * Real runtime consumption of ActionDecisionContractV2's `practice_more`
 * budget (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md).
 *
 * Product reality (verified directly in all 7 masters before implementing
 * this — no session-length/completion-screen concept exists anywhere;
 * gameplay is open-ended until the student stops, a challenge/speed timer
 * runs out, or settings change): `practice_more` is a temporary window of N
 * additional CHECKED-ELIGIBLE activities pinned to the topic the decision
 * was made about (`directive.topic`). The only actual per-question topic
 * SWITCH mechanism any master has is its own "mixed"/random topic-pool
 * selection — this hook exposes `topic` + `remaining` so callers can force
 * that per-question pick back onto the decision's topic for as long as
 * budget remains, via lib/learning/practice-more-budget.js's
 * `resolvePracticeMoreTopicOverride`. Consuming callers never invent their
 * own copy of this logic — they only feed it their own allowed-topics list.
 *
 * This is a thin React wrapper — all state-transition logic lives in
 * lib/learning/practice-more-budget.js (pure functions, directly testable
 * without a React renderer).
 */
export function usePracticeMoreBudget(directive) {
  const stateRef = useRef(emptyPracticeMoreBudgetState());
  stateRef.current = advancePracticeMoreBudget(stateRef.current, directive);

  function consume(context = {}) {
    stateRef.current = consumePracticeMoreBudget(stateRef.current, context);
    return stateRef.current.remaining;
  }

  return {
    active: stateRef.current.decisionKey !== null,
    remaining: stateRef.current.remaining,
    total: stateRef.current.total,
    topic: stateRef.current.topic,
    consume,
  };
}
