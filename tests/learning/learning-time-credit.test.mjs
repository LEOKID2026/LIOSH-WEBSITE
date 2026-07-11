import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveQuestionTimeCreditTier,
  creditVisibleSliceMs,
  legacyAccumulateQuestionMs,
  legacyTopicCreditSeconds,
  fairnessTopicCreditSeconds,
  topicCreditSecondsFromQuestionClose,
  sumCreditedFromVisibleIntervals,
  capSessionCreditedMs,
  sessionCreditedMsToDurationSeconds,
  resolveTierCapMs,
  TIER_DEFAULT_MS,
  TIER_HARD_MS,
  TIER_LONG_READING_MS,
  TIER_LEGACY_GAME_MS,
  SESSION_MAX_CREDITED_MS,
  QuestionTimeLedger,
  createQuestionTimeLedger,
} from "../../utils/learning-time-credit/index.js";
import { LEARNING_UNIT_CREDIT_CAP_MS } from "../../lib/learning/learning-time-credit-policy.js";

test("tier classification — legacy game modes (classification only)", () => {
  assert.equal(
    resolveQuestionTimeCreditTier({ subjectId: "math", gameMode: "challenge", question: {} }),
    "legacy_game"
  );
  assert.equal(resolveTierCapMs("legacy_game", true), LEARNING_UNIT_CREDIT_CAP_MS);
});

test("unified tier caps — all tiers 10 minutes", () => {
  assert.equal(TIER_DEFAULT_MS, LEARNING_UNIT_CREDIT_CAP_MS);
  assert.equal(TIER_HARD_MS, LEARNING_UNIT_CREDIT_CAP_MS);
  assert.equal(TIER_LONG_READING_MS, LEARNING_UNIT_CREDIT_CAP_MS);
  assert.equal(TIER_LEGACY_GAME_MS, LEARNING_UNIT_CREDIT_CAP_MS);
  assert.equal(resolveTierCapMs("default", true), LEARNING_UNIT_CREDIT_CAP_MS);
  assert.equal(resolveTierCapMs("default", false), LEARNING_UNIT_CREDIT_CAP_MS);
});

test("creditVisibleSliceMs — respects unified cap", () => {
  assert.equal(creditVisibleSliceMs(90_000, LEARNING_UNIT_CREDIT_CAP_MS, 0), 90_000);
  assert.equal(creditVisibleSliceMs(900_000, LEARNING_UNIT_CREDIT_CAP_MS, 0), 600_000);
});

test("session cap — stored duration capped at 1 hour", () => {
  assert.equal(capSessionCreditedMs(SESSION_MAX_CREDITED_MS), SESSION_MAX_CREDITED_MS);
  assert.equal(sessionCreditedMsToDurationSeconds(SESSION_MAX_CREDITED_MS + 1), 3600);
});

test("legacy accumulate — 5 min stays 5 min", () => {
  assert.equal(legacyAccumulateQuestionMs(300_000), 300_000);
});

test("QuestionTimeLedger — 15 min caps at 10 min", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
  });
  const closed = ledger.closeQuestion(900_000);
  assert.equal(closed.creditedMs, LEARNING_UNIT_CREDIT_CAP_MS);
});

test("QuestionTimeLedger — challenge mode credits up to 10 min", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "challenge",
    question: { operation: "addition" },
    now: 0,
  });
  assert.equal(ledger.tierCapMs, LEARNING_UNIT_CREDIT_CAP_MS);
  const closed = ledger.closeQuestion(200_000);
  assert.equal(closed.creditedMs, 200_000);
});

test("fairness topic credit — credited seconds from ms", () => {
  assert.equal(fairnessTopicCreditSeconds(360_000), 360);
  assert.equal(topicCreditSecondsFromQuestionClose(360_000, true, 360), 360);
});
