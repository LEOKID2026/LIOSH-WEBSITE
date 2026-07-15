import test from "node:test";
import assert from "node:assert/strict";

import {
  LEARNING_UNIT_CREDIT_CAP_MS,
  LEARNING_UNIT_CREDIT_CAP_MINUTES,
  LEARNING_UNIT_CREDIT_CAP_SECONDS,
  creditLearningUnitMs,
  creditedMsToRoundedMinutes,
  isLearningModeCreditable,
  isNonCreditingPlayActivity,
  resolveServerAnswerCreditedMs,
  resolveSessionOrphanCreditedMs,
} from "../../lib/learning/learning-time-credit-policy.js";
import {
  applyPageCreditCap,
  computePageCreditedDwellMs,
} from "../../lib/learning/book-dwell-policy.js";
import {
  createQuestionTimeLedger,
  legacyAccumulateQuestionMs,
  resolveTierCapMs,
} from "../../utils/learning-time-credit/index.js";

test("central cap constants - 10 minutes", () => {
  assert.equal(LEARNING_UNIT_CREDIT_CAP_MS, 600_000);
  assert.equal(LEARNING_UNIT_CREDIT_CAP_SECONDS, 600);
  assert.equal(LEARNING_UNIT_CREDIT_CAP_MINUTES, 10);
});

test("1. question 2 minutes → 2 minutes credited", () => {
  assert.equal(creditLearningUnitMs(120_000), 120_000);
});

test("2. question 15 minutes → 10 minutes credited", () => {
  assert.equal(creditLearningUnitMs(900_000), 600_000);
});

test("3. open question 30 minutes → 10 minutes credited", () => {
  assert.equal(creditLearningUnitMs(1_800_000), 600_000);
});

test("4. new question resets cap via separate ledger units", () => {
  const q1 = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: {},
    now: 0,
  });
  for (let t = 30_000; t <= 900_000; t += 30_000) q1.flushVisibleSlice(t);
  const c1 = q1.closeQuestion(900_000);
  assert.equal(c1.creditedMs, 600_000);

  const q2 = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: {},
    now: 0,
  });
  q2.flushVisibleSlice(60_000);
  q2.flushVisibleSlice(120_000);
  const c2 = q2.closeQuestion(120_000);
  assert.equal(c2.creditedMs, 120_000);
});

test("5. book page 4 minutes → 4 minutes", () => {
  assert.equal(applyPageCreditCap(240_000), 240_000);
  assert.equal(computePageCreditedDwellMs(240_000, 0), 240_000);
});

test("6. book page open 20 minutes active → 20 minutes (no page 10-cap)", () => {
  assert.equal(applyPageCreditCap(1_200_000), 1_200_000);
});

test("7. book pages accumulate without page unit cap", () => {
  assert.equal(applyPageCreditCap(1_200_000), 1_200_000);
  assert.equal(applyPageCreditCap(180_000), 180_000);
});

test("8. hidden tab does not accrue after onHidden", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: {},
    now: 0,
    initiallyVisible: true,
    maxSliceMs: 600_000,
  });
  ledger.onHidden(300_000);
  const closed = ledger.closeQuestion(480_000);
  assert.equal(closed.creditedMs, 300_000);
});

test("8b. visible continuous unit still credits hints window while visible", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: {},
    now: 0,
    initiallyVisible: true,
    maxSliceMs: 600_000,
  });
  const closed = ledger.closeQuestion(480_000);
  assert.equal(closed.creditedMs, 480_000);
});

test("9. parent activity credited via server policy", () => {
  assert.equal(
    resolveServerAnswerCreditedMs({ rawTimeSpentMs: 240_000, gameMode: "parent_assigned" }),
    240_000
  );
});

test("10. solo game mode is not a learning mode", () => {
  assert.equal(isLearningModeCreditable("solo"), false);
  assert.equal(isNonCreditingPlayActivity("solo_game"), true);
});

test("11. educational game excluded", () => {
  assert.equal(isNonCreditingPlayActivity("educational_game"), true);
  assert.equal(isLearningModeCreditable("educational_game"), false);
});

test("12. arcade excluded", () => {
  assert.equal(isNonCreditingPlayActivity("arcade"), true);
});

test("13. all learning modes credit including challenge/speed/marathon", () => {
  assert.equal(isLearningModeCreditable("challenge"), true);
  assert.equal(isLearningModeCreditable("speed"), true);
  assert.equal(isLearningModeCreditable("marathon"), true);
  assert.equal(resolveTierCapMs("legacy_game", true), LEARNING_UNIT_CREDIT_CAP_MS);
});

test("14. monthly minutes aggregation helper rounds consistently", () => {
  assert.equal(creditedMsToRoundedMinutes(125_000), 2.08);
});

test("session orphan - credits open unit without double-counting answers", () => {
  assert.equal(resolveSessionOrphanCreditedMs(120_000, 300_000), 180_000);
  assert.equal(resolveSessionOrphanCreditedMs(600_000, 900_000), 300_000);
});

test("legacy accumulate uses 10 min cap not 120s", () => {
  assert.equal(legacyAccumulateQuestionMs(300_000), 300_000);
  assert.equal(legacyAccumulateQuestionMs(900_000), 600_000);
});
