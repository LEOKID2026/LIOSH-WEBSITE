/**
 * Pure state machine for practice_more's additionalQuestions budget
 * (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md, Part 1).
 * Extracted from hooks/usePracticeMoreBudget.js so it is directly testable
 * without a React renderer (this repo's tests are plain node:test scripts).
 */
import { isEligibleAdaptiveStreakEvent } from "./adaptive-streak-mode-eligibility.js";

export function emptyPracticeMoreBudgetState() {
  return { decisionKey: null, remaining: 0, total: 0, topic: null };
}

function decisionKeyFor(directive) {
  // createdAt lives at directive.lifecycle.createdAt (see
  // lib/learning/action-decision-executor.js's baseDirective) — NOT
  // directive.createdAt.
  return `${String(directive?.sourceContractVersion || "")}:${String(directive?.lifecycle?.createdAt || "")}`;
}

/**
 * Advances budget state to reflect the current directive. Pure — returns a
 * new state object, never mutates `prevState`.
 * @param {ReturnType<typeof emptyPracticeMoreBudgetState>} prevState
 * @param {object|null|undefined} directive
 */
export function advancePracticeMoreBudget(prevState, directive) {
  const active = directive?.active === true && directive?.action === "practice_more";
  if (!active) {
    return prevState.decisionKey === null ? prevState : emptyPracticeMoreBudgetState();
  }
  const key = decisionKeyFor(directive);
  if (key === prevState.decisionKey) return prevState;
  const total = Math.max(0, Number(directive?.questionPolicy?.additionalQuestions) || 0);
  // directive.topic (== contract.target.topic, the topic the decision was
  // actually made about) is the topic content selection must stay pinned to
  // for the life of this budget — see resolvePracticeMoreTopicOverride below.
  const topic = String(directive?.topic || directive?.routePolicy?.topic || "") || null;
  return { decisionKey: key, remaining: total, total, topic };
}

/**
 * The single place that decides whether a master's per-question topic
 * selection (e.g. math/hebrew/moledet-geography's "mixed" random pick,
 * geometry's inline random pick, science/history's topic pool) must be
 * force-pinned to the practice_more decision's topic instead of following
 * its normal (possibly randomized) selection this turn.
 *
 * Returns the topic to force, or null if no override applies — either
 * because there is no unspent budget right now, or because the decision's
 * topic isn't a member of the caller's own currently-allowed topic list
 * (a stale/foreign topic must never be forced onto a master).
 *
 * @param {{ remaining: number, topic: string|null }} budget hook's flattened state (remaining, topic)
 * @param {string[]|null|undefined} allowedTopics the caller's own valid topic/operation ids for the current grade
 * @returns {string|null}
 */
export function resolvePracticeMoreTopicOverride(budget, allowedTopics) {
  const remaining = Number(budget?.remaining) || 0;
  const topic = budget?.topic || null;
  if (remaining <= 0 || !topic) return null;
  if (Array.isArray(allowedTopics) && allowedTopics.length > 0 && !allowedTopics.includes(topic)) {
    return null;
  }
  return topic;
}

/**
 * Pure — returns a new state with the budget decremented by exactly 1 if,
 * and only if, budget is active, non-zero, and the event is mode-eligible.
 * @param {ReturnType<typeof emptyPracticeMoreBudgetState>} state
 * @param {{ gameMode?: string|null, afterStepByStep?: boolean }} context
 */
export function consumePracticeMoreBudget(state, context = {}) {
  if (!state.decisionKey || state.remaining <= 0) return state;
  if (!isEligibleAdaptiveStreakEvent(context)) return state;
  return { ...state, remaining: Math.max(0, state.remaining - 1) };
}
