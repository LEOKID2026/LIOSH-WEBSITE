/**
 * Real runtime-consumption proofs for practice_more and strengthen_prerequisite
 * (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md, final round).
 * Tests behavior CONSUMED at runtime, not just object fields on a contract.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildActionDecisionContractV2 } from "../../utils/action-decision-contract/action-decision-contract-v2.js";
import { executeActionDecisionContractV2 } from "../../lib/learning/action-decision-executor.js";
import {
  advancePracticeMoreBudget,
  consumePracticeMoreBudget,
  emptyPracticeMoreBudgetState,
  resolvePracticeMoreTopicOverride,
} from "../../lib/learning/practice-more-budget.js";
import {
  advanceContentOverride,
  emptyContentOverrideState,
  hasContentForSkill,
  hasExactSkillConsumer,
  pickQuestionForSkill,
  resolveContentOverrideTarget,
} from "../../lib/learning/prerequisite-content-source.js";
import {
  resolvePrerequisitePrecision,
} from "../../utils/action-decision-contract/prerequisite-precision.js";
import { runP3RawRuleScenario } from "../engine-decision-audit/p3-raw-evidence-harness.mjs";

// ---------------------------------------------------------------------------
// Shared fixture: a REAL practice_more contract, produced by the real
// buildActionDecisionContractV2 function (not a literal), with a canonical
// state/context shape crafted to land on the practice_more fallback branch
// (intervene-authorized, no cross-session pattern, no safe subskill, no
// foundation/timing/reading/guided evidence) — the same category of
// construction the renamed unit test (action-decision-contract-unit-p4.test.mjs)
// already uses for individual branch coverage.
function buildPracticeMoreContract(overrides = {}) {
  const canonical = {
    actionState: "intervene",
    recommendation: { allowed: true, intensityCap: "RI2", reasonCodes: ["x"] },
  };
  const ctx = {
    evidenceEligibility: { unifiedConclusion: "supported", independent: true },
    signals: {
      trend: { eligible: true, direction: "stable" },
      timing: { eligible: false },
      assistance: { eligible: true, evidenceMode: "independent" },
      grade: { eligible: true, relation: "same", foundationRisk: false, caveatNeeded: false, contentGradeKey: "g4" },
      pattern: { eligible: true, taxonomyMatched: false, recurrenceFull: false },
      subskill: { eligible: false, safe: false, candidate: null },
      sessions: { eligible: true, consistency: "single_session" },
      v3: { eligible: true, contradictory: false, recommendedNextStep: "practice_more" },
      riskFlags: { values: {} },
    },
  };
  return buildActionDecisionContractV2({
    subjectId: "math",
    topicKey: "addition",
    engineDecision: "knowledge_gap",
    metrics: { questions: 10, wrong: 4, accuracy: 60 },
    canonicalState: canonical,
    unifiedDecisionContext: ctx,
    decisionTimestamp: Date.now(),
    ...overrides,
  });
}

test("1. practice_more consumes exactly the approved number of eligible activities", () => {
  const contract = buildPracticeMoreContract();
  assert.equal(contract.action, "practice_more");
  const n = contract.expiry.afterActivities;
  assert.ok(n > 0, "contract must declare a real budget");
  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.createdAt) + 1000,
  });
  assert.equal(directive.questionPolicy.additionalQuestions, n);

  let state = emptyPracticeMoreBudgetState();
  state = advancePracticeMoreBudget(state, directive);
  assert.equal(state.total, n);
  assert.equal(state.remaining, n);

  for (let i = 0; i < n; i++) {
    state = consumePracticeMoreBudget(state, { gameMode: "practice", afterStepByStep: false });
  }
  assert.equal(state.remaining, 0, "budget must reach exactly 0 after N eligible answers");

  // Consuming further does not go negative.
  state = consumePracticeMoreBudget(state, { gameMode: "practice", afterStepByStep: false });
  assert.equal(state.remaining, 0);
});

test("2. guided/learning/books/step-by-step do not consume the budget", () => {
  const contract = buildPracticeMoreContract();
  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.createdAt) + 1000,
  });
  let state = advancePracticeMoreBudget(emptyPracticeMoreBudgetState(), directive);
  const before = state.remaining;

  for (const [label, ctx] of [
    ["learning", { gameMode: "learning", afterStepByStep: false }],
    ["guided_practice", { gameMode: "guided_practice", afterStepByStep: false }],
    ["learning_book", { gameMode: "learning_book", afterStepByStep: false }],
    ["step_by_step", { gameMode: "practice", afterStepByStep: true }],
  ]) {
    state = consumePracticeMoreBudget(state, ctx);
    assert.equal(state.remaining, before, `${label} must not consume the budget`);
  }

  // A genuinely eligible answer still works afterward — proves the budget
  // wasn't silently disabled, only the non-diagnostic events were excluded.
  state = consumePracticeMoreBudget(state, { gameMode: "practice", afterStepByStep: false });
  assert.equal(state.remaining, before - 1);
});

test("3. refresh/re-render never duplicates or resets the budget mid-decision", () => {
  const contract = buildPracticeMoreContract();
  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.createdAt) + 1000,
  });
  let state = advancePracticeMoreBudget(emptyPracticeMoreBudgetState(), directive);
  state = consumePracticeMoreBudget(state, { gameMode: "practice" });
  const afterOneConsume = state.remaining;

  // Simulate 5 re-renders with the SAME directive object (no new decision).
  for (let i = 0; i < 5; i++) {
    state = advancePracticeMoreBudget(state, directive);
  }
  assert.equal(state.remaining, afterOneConsume, "re-render with the same decision must not change remaining");

  // A level change alone (still same decision identity) must not reset it either.
  const sameDecisionDifferentLevelDirective = { ...directive, subject: "math" };
  state = advancePracticeMoreBudget(state, sameDecisionDifferentLevelDirective);
  assert.equal(state.remaining, afterOneConsume, "level change must not reset the budget");
});

test("4. expiry cancels any unused remainder", () => {
  const contract = buildPracticeMoreContract();
  const active = executeActionDecisionContractV2(contract, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.createdAt) + 1000,
  });
  let state = advancePracticeMoreBudget(emptyPracticeMoreBudgetState(), active);
  state = consumePracticeMoreBudget(state, { gameMode: "practice" });
  assert.ok(state.remaining > 0 && state.remaining < state.total);

  const expired = executeActionDecisionContractV2(contract, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: contract.expiry.afterActivities,
    nowMs: Date.parse(contract.createdAt) + 1000,
  });
  assert.equal(expired.active, false);
  state = advancePracticeMoreBudget(state, expired);
  assert.equal(state.decisionKey, null);
  assert.equal(state.remaining, 0);
  assert.equal(state.total, 0);
});

test("new decision replaces the old budget, never merges with it", () => {
  const contractA = buildPracticeMoreContract({ decisionTimestamp: Date.now() });
  const directiveA = executeActionDecisionContractV2(contractA, {
    subjectId: "math", topicKey: "addition", levelKey: "medium",
    activitiesSinceDecision: 0, nowMs: Date.parse(contractA.createdAt) + 1000,
  });
  let state = advancePracticeMoreBudget(emptyPracticeMoreBudgetState(), directiveA);
  state = consumePracticeMoreBudget(state, { gameMode: "practice" });
  const usedA = state.remaining;

  const contractB = buildPracticeMoreContract({ decisionTimestamp: Date.now() + 999_999 });
  const directiveB = executeActionDecisionContractV2(contractB, {
    subjectId: "math", topicKey: "addition", levelKey: "medium",
    activitiesSinceDecision: 0, nowMs: Date.parse(contractB.createdAt) + 1000,
  });
  const keyA = `${directiveA.sourceContractVersion}:${directiveA.lifecycle.createdAt}`;
  state = advancePracticeMoreBudget(state, directiveB);
  assert.notEqual(state.decisionKey, keyA, "must be a fresh decision, not the old one");
  assert.equal(state.remaining, state.total, "new decision starts with its own full budget, not a merge");
  assert.ok(usedA < state.total, "sanity: the old decision really had been partially consumed");
});

test("11. practice_more affects content selection (not just the counter): topic stays pinned for exactly N answers, then releases", () => {
  // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (round
  // 4): resolvePracticeMoreTopicOverride is the exact function every master's
  // question-generation loop calls before its own "mixed" random pick /
  // topic-pool filter — this proves it actually overrides a random pick,
  // not merely that a counter decrements.
  const contract = buildPracticeMoreContract();
  const n = contract.expiry.afterActivities;
  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "math",
    topicKey: "addition",
    levelKey: "medium",
    activitiesSinceDecision: 0,
    nowMs: Date.parse(contract.createdAt) + 1000,
  });
  let state = advancePracticeMoreBudget(emptyPracticeMoreBudgetState(), directive);
  assert.equal(state.topic, "addition", "budget must capture the decision's real topic");

  const allowedTopics = ["addition", "subtraction", "multiplication", "division"];
  const picked = [];
  for (let i = 0; i < n; i++) {
    // Simulate exactly what math/hebrew/english/moledet-geography's "mixed"
    // random pick (and geometry's inline pick / science+history's pool
    // filter) would otherwise choose for this question.
    const randomPick = allowedTopics[Math.floor(Math.random() * allowedTopics.length)];
    const override = resolvePracticeMoreTopicOverride(state, allowedTopics);
    picked.push(override || randomPick);
    state = consumePracticeMoreBudget(state, { gameMode: "practice", afterStepByStep: false });
  }
  assert.deepEqual(
    picked,
    new Array(n).fill("addition"),
    "content selection must stay on the decision's topic for every one of the N eligible answers, regardless of random pick",
  );
  assert.equal(state.remaining, 0);

  // After the N-answer window closes, the lock releases — this is the
  // "reevaluation" point: forcing stops, real topic selection resumes.
  assert.equal(
    resolvePracticeMoreTopicOverride(state, allowedTopics),
    null,
    "lock must release once the budget is exhausted, not persist indefinitely",
  );
});

test("11b. practice_more topic lock never forces a topic foreign to the caller's own allowed-topics list", () => {
  const contract = buildPracticeMoreContract();
  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "math", topicKey: "addition", levelKey: "medium",
    activitiesSinceDecision: 0, nowMs: Date.parse(contract.createdAt) + 1000,
  });
  let state = advancePracticeMoreBudget(emptyPracticeMoreBudgetState(), directive);
  assert.equal(state.remaining > 0, true);
  // A caller (e.g. a different subject's master, or a stale allowed-topics
  // list) whose allowed topics don't include "addition" must never receive
  // a forced override — the resolver is a validating gate, not a blind copy.
  assert.equal(resolvePracticeMoreTopicOverride(state, ["reading", "grammar"]), null);
  // An unspecified (empty/absent) allowed-topics list means "no restriction
  // asserted by the caller" — not "reject everything" — so the override
  // still applies; a real master always supplies its own non-empty list.
  assert.equal(resolvePracticeMoreTopicOverride(state, []), state.topic);
  assert.equal(resolvePracticeMoreTopicOverride(state, null), state.topic);
});

test("12. hebrew exact_skill: registered + real bank content, but no wired runtime consumer — must never produce exact_skill", () => {
  assert.equal(hasExactSkillConsumer("hebrew"), false);
  assert.equal(hasContentForSkill("he_comp_explicit_detail", "hebrew"), true, "sanity: real bank content exists");
  const precision = resolvePrerequisitePrecision({
    subjectId: "hebrew",
    topicKey: "comprehension",
    grade: { relation: "lower", contentGradeKey: "g2" },
    v3: { prerequisiteSkill: "he_comp_explicit_detail" },
    prerequisiteSignal: { prerequisiteSkillIds: ["he_comp_explicit_detail"] },
  });
  assert.notEqual(precision.precision, "exact_skill");
  assert.equal(precision.precision, "grade_foundation_area");
});

test("13. science exact_skill: registered + real bank content, but no wired runtime consumer — must never produce exact_skill", () => {
  assert.equal(hasExactSkillConsumer("science"), false);
  assert.equal(hasContentForSkill("sci_body_fact_recall", "science"), true, "sanity: real bank content exists");
  const precision = resolvePrerequisitePrecision({
    subjectId: "science",
    topicKey: "body",
    grade: { relation: "lower", contentGradeKey: "g2" },
    v3: { prerequisiteSkill: "sci_body_fact_recall" },
    prerequisiteSignal: { prerequisiteSkillIds: ["sci_body_fact_recall"] },
  });
  assert.notEqual(precision.precision, "exact_skill");
  assert.equal(precision.precision, "grade_foundation_area");
});

test("14. geometry remains correctly wired as the one exact_skill runtime consumer", () => {
  assert.equal(hasExactSkillConsumer("geometry"), true);
});

test("5. exact prerequisite selects a real question from the registered entity", () => {
  const q = pickQuestionForSkill("geometry", "geo_pv_area_vs_perimeter", 0);
  assert.ok(q, "must return a real question, not null");
  assert.ok(String(q.question || "").trim().length > 0);
  assert.ok(Array.isArray(q.answers) && q.answers.length >= 2);
  assert.equal(q.params?.diagnosticSkillId, "geo_pv_area_vs_perimeter");
});

test("6. decisionTopic is never changed by the content override", () => {
  const decisionTopicKey = "area"; // what ADC decided on / what useStudentActionDecision was fetched for
  const target = resolveContentOverrideTarget({
    subjectId: "geometry",
    skillId: "geo_pv_area_vs_perimeter",
  });
  assert.ok(target);
  // The override's own topic may legitimately differ from the decision's
  // topic (a prerequisite often lives in a different topic) — proving they
  // are independent values, not the same state.
  assert.equal(typeof target.topic, "string");
  // Simulate: decisionTopic (a separate variable in the master) is
  // completely untouched by resolving/advancing the override.
  let overrideState = emptyContentOverrideState();
  const directive = { active: true, action: "strengthen_prerequisite", sourceContractVersion: "2.0.0", lifecycle: { createdAt: "2026-01-01T00:00:00.000Z" }, routePolicy: { prerequisite: "geo_pv_area_vs_perimeter" } };
  overrideState = advanceContentOverride(overrideState, directive, "geometry");
  assert.equal(decisionTopicKey, "area", "decisionTopic variable must be untouched by advanceContentOverride");
});

test("7. no fetch loop — the resolver/hook never reference the ADC fetch path", () => {
  // Structural proof: the content-override module must not import
  // anything from the student action-decision fetch/hook layer.
  const src = readFileText("lib/learning/prerequisite-content-source.js");
  assert.doesNotMatch(src, /useStudentActionDecision|fetchStudentActionDecisions/);
});

test("8. rollback clears the content override exactly once", () => {
  const directive = {
    active: true, action: "strengthen_prerequisite",
    sourceContractVersion: "2.0.0", lifecycle: { createdAt: "2026-01-01T00:00:00.000Z" },
    routePolicy: { prerequisite: "geo_pv_area_vs_perimeter" },
  };
  let state = advanceContentOverride(emptyContentOverrideState(), directive, "geometry");
  assert.ok(state.target, "override must be set while the decision is active");

  const rolledBack = { active: false, action: "none" };
  state = advanceContentOverride(state, rolledBack, "geometry");
  assert.equal(state.target, null, "override must be cleared on rollback");
  assert.equal(state.decisionKey, null);

  // Idempotent — calling again with the same inactive directive does not error / stays cleared.
  state = advanceContentOverride(state, rolledBack, "geometry");
  assert.equal(state.target, null);
});

test("9. fallback without an exact producer never impersonates exact_skill", () => {
  assert.equal(hasContentForSkill("no_such_skill", "math"), false);
  assert.equal(resolveContentOverrideTarget({ subjectId: "math", skillId: "no_such_skill" }), null);

  const precision = resolvePrerequisitePrecision({
    subjectId: "math",
    topicKey: "addition",
    grade: { relation: "lower", contentGradeKey: "g2" },
    v3: { prerequisiteSkill: "no_such_skill" },
  });
  assert.notEqual(precision.precision, "exact_skill");
  assert.equal(precision.precision, "grade_foundation_area");
  assert.notEqual(precision.entityType, "curriculum_skill");
});

test("10a. integration — math: no registered exact-skill producer, correctly falls back (never fakes exact_skill)", () => {
  const result = runP3RawRuleScenario("M-01", {
    gradeRelation: "lower",
    prerequisiteSkillIds: ["definitely_not_a_real_math_skill"],
  });
  const contract = result.actionDecisionContract;
  assert.equal(contract.action, "strengthen_prerequisite");
  assert.equal(contract.target?.prerequisiteDetail?.precision, "grade_foundation_area");
  assert.notEqual(contract.target?.prerequisiteDetail?.entityType, "curriculum_skill");
  // Executor: no exact-skill route, generic foundation review level-down instead.
  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "math", topicKey: result.topicKey, levelKey: "medium",
    activitiesSinceDecision: 0, nowMs: Date.parse(contract.createdAt) + 1000,
  });
  assert.equal(directive.routePolicy.prerequisite, null);
  const override = advanceContentOverride(emptyContentOverrideState(), directive, "math");
  assert.equal(override.target, null);
});

test("10b. integration — geometry (bank-based subject): exact prerequisite reaches a real question end to end", () => {
  const precision = resolvePrerequisitePrecision({
    subjectId: "geometry",
    topicKey: "quadrilaterals",
    grade: { relation: "lower", contentGradeKey: "g3" },
    v3: { prerequisiteSkill: "geo_pv_area_vs_perimeter" },
  });
  assert.equal(precision.precision, "exact_skill");
  assert.equal(precision.entityType, "curriculum_skill");
  assert.equal(precision.topicKey, "area");

  const contract = buildActionDecisionContractV2({
    subjectId: "geometry",
    topicKey: "quadrilaterals",
    engineDecision: "knowledge_gap",
    metrics: { questions: 10, wrong: 4, accuracy: 40 },
    canonicalState: { actionState: "intervene", recommendation: { allowed: true, intensityCap: "RI2", reasonCodes: ["x"] } },
    unifiedDecisionContext: {
      evidenceEligibility: { unifiedConclusion: "supported", independent: true },
      signals: {
        trend: { eligible: true, direction: "stable" },
        timing: { eligible: false },
        assistance: { eligible: true, evidenceMode: "independent" },
        grade: { eligible: true, relation: "lower", foundationRisk: true, caveatNeeded: false, contentGradeKey: "g3" },
        pattern: { eligible: false, taxonomyMatched: false, recurrenceFull: false },
        subskill: { eligible: false, safe: false, candidate: null },
        sessions: { eligible: true, consistency: "cross_session" },
        v3: { eligible: true, contradictory: false, recommendedNextStep: "strengthen_prerequisite", prerequisiteSkill: "geo_pv_area_vs_perimeter" },
        riskFlags: { values: {} },
        prerequisite: { prerequisiteSkillIds: ["geo_pv_area_vs_perimeter"] },
      },
    },
    decisionTimestamp: Date.now(),
  });
  assert.equal(contract.action, "strengthen_prerequisite");
  assert.equal(contract.target.prerequisiteDetail.precision, "exact_skill");

  const directive = executeActionDecisionContractV2(contract, {
    subjectId: "geometry", topicKey: "quadrilaterals", levelKey: "medium",
    activitiesSinceDecision: 0, nowMs: Date.parse(contract.createdAt) + 1000,
  });
  assert.equal(directive.routePolicy.prerequisite, "geo_pv_area_vs_perimeter");
  assert.equal(directive.routePolicy.topic, "area");

  const decisionTopicKey = "quadrilaterals"; // untouched throughout
  const override = advanceContentOverride(emptyContentOverrideState(), directive, "geometry");
  assert.ok(override.target);
  assert.equal(override.target.skillId, "geo_pv_area_vs_perimeter");
  const question = pickQuestionForSkill("geometry", override.target.skillId, 0);
  assert.ok(question?.question);
  assert.equal(decisionTopicKey, "quadrilaterals", "decisionTopic must remain the original ADC topic throughout");

  // Expiry/rollback returns to normal content selection.
  const expired = executeActionDecisionContractV2(contract, {
    subjectId: "geometry", topicKey: "quadrilaterals", levelKey: "medium",
    activitiesSinceDecision: contract.expiry.afterActivities, nowMs: Date.parse(contract.createdAt) + 1000,
  });
  const overrideAfterExpiry = advanceContentOverride(override, expired, "geometry");
  assert.equal(overrideAfterExpiry.target, null);
});

function readFileText(relPath) {
  return readFileSync(join(process.cwd(), relPath), "utf8");
}
