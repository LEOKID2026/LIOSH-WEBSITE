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

test("tier classification — legacy game modes", () => {
  assert.equal(
    resolveQuestionTimeCreditTier({ subjectId: "math", gameMode: "challenge", question: {} }),
    "legacy_game"
  );
  assert.equal(
    resolveQuestionTimeCreditTier({ subjectId: "geometry", gameMode: "speed", question: {} }),
    "legacy_game"
  );
  assert.equal(resolveTierCapMs("legacy_game", true), TIER_LEGACY_GAME_MS);
});

test("tier classification — math hard and default", () => {
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "math",
      gameMode: "learning",
      question: { operation: "addition", params: { kind: "add_two" } },
    }),
    "default"
  );
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "math",
      gameMode: "learning",
      question: { operation: "word_problems", params: { kind: "wp_leftover" } },
    }),
    "hard"
  );
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "math",
      gameMode: "practice",
      question: { params: { kind: "wp_multi_step" } },
    }),
    "hard"
  );
});

test("tier classification — geometry conceptual is hard; long_reading wins on Hebrew reading", () => {
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "geometry",
      gameMode: "learning",
      question: { topic: "triangles", params: { kind: "concept_area" } },
    }),
    "hard"
  );
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "hebrew",
      gameMode: "learning",
      question: { topic: "reading", params: { kind: "reading_short" } },
    }),
    "long_reading"
  );
});

test("tier classification — english grammar default; science experiments hard", () => {
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "english",
      gameMode: "learning",
      question: { topic: "grammar", params: { kind: "present_simple" } },
    }),
    "default"
  );
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "science",
      gameMode: "learning",
      question: {
        topic: "experiments",
        params: { patternFamily: "sci_experiments_scientific_method" },
      },
    }),
    "hard"
  );
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "moledet",
      gameMode: "learning",
      question: { topic: "maps", params: { kind: "maps" } },
    }),
    "long_reading"
  );
});

test("tier classification — precedence long_reading over hard", () => {
  assert.equal(
    resolveQuestionTimeCreditTier({
      subjectId: "hebrew",
      gameMode: "learning",
      question: {
        topic: "reading",
        answerMode: "hebrew_audio_recorded_manual",
        params: { kind: "reading_comprehension_multi" },
      },
    }),
    "long_reading"
  );
});

test("fairness tier caps", () => {
  assert.equal(resolveTierCapMs("default", true), TIER_DEFAULT_MS);
  assert.equal(resolveTierCapMs("hard", true), TIER_HARD_MS);
  assert.equal(resolveTierCapMs("long_reading", true), TIER_LONG_READING_MS);
  assert.equal(resolveTierCapMs("default", false), 120_000);
});

test("creditVisibleSliceMs — 90s visible default tier", () => {
  assert.equal(creditVisibleSliceMs(90_000, TIER_DEFAULT_MS, 0), 90_000);
});

test("creditVisibleSliceMs — 8 min hard caps at 480s", () => {
  assert.equal(creditVisibleSliceMs(480_000, TIER_HARD_MS, 0), 480_000);
  assert.equal(creditVisibleSliceMs(500_000, TIER_HARD_MS, 0), 480_000);
});

test("creditVisibleSliceMs — running total respects room", () => {
  assert.equal(creditVisibleSliceMs(200_000, TIER_DEFAULT_MS, 250_000), 50_000);
  assert.equal(creditVisibleSliceMs(100_000, TIER_DEFAULT_MS, 300_000), 0);
});

test("sumCreditedFromVisibleIntervals — hidden gap excluded", () => {
  const total = sumCreditedFromVisibleIntervals(
    [
      { startMs: 0, endMs: 120_000 },
      { startMs: 420_000, endMs: 480_000 },
    ],
    TIER_DEFAULT_MS
  );
  assert.equal(total, 180_000);
});

test("session cap — 3 hours", () => {
  assert.equal(capSessionCreditedMs(SESSION_MAX_CREDITED_MS), SESSION_MAX_CREDITED_MS);
  assert.equal(capSessionCreditedMs(SESSION_MAX_CREDITED_MS + 60_000), SESSION_MAX_CREDITED_MS);
  assert.equal(sessionCreditedMsToDurationSeconds(SESSION_MAX_CREDITED_MS + 1), 10_800);
});

test("legacy accumulate — 5 min caps at 120s", () => {
  assert.equal(legacyAccumulateQuestionMs(300_000), 120_000);
});

test("legacy topic credit — zero at 300s+, positive below", () => {
  assert.equal(legacyTopicCreditSeconds(299), 299);
  assert.equal(legacyTopicCreditSeconds(300), 0);
  assert.equal(legacyTopicCreditSeconds(360), 0);
});

test("fairness topic credit — 6 min geometry credits 360s not zero", () => {
  assert.equal(fairnessTopicCreditSeconds(360_000), 360);
  assert.equal(
    topicCreditSecondsFromQuestionClose(360_000, true, 360),
    360
  );
});

test("QuestionTimeLedger — visible 6 min on hard question", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "geometry",
    gameMode: "learning",
    question: { topic: "triangles", params: { kind: "concept_proof" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assert.equal(ledger.tier, "hard");
  assert.equal(ledger.tierCapMs, TIER_HARD_MS);
  const closed = ledger.closeQuestion(360_000);
  assert.equal(closed.creditedMs, 360_000);
  assert.equal(closed.creditedSecForTopic, 360);
});

test("QuestionTimeLedger — hidden time not credited", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition", params: { kind: "add" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  ledger.flushVisibleSlice(60_000);
  ledger.onHidden(60_000);
  const closed = ledger.closeQuestion(360_000);
  assert.equal(closed.creditedMs, 60_000);
});

test("QuestionTimeLedger — 20 min visible MCQ caps at 300s", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(1_200_000);
  assert.equal(closed.creditedMs, TIER_DEFAULT_MS);
});

test("QuestionTimeLedger — fairness off uses legacy 120s wall", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: false,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(400_000);
  assert.equal(closed.creditedMs, 120_000);
  assert.equal(closed.creditedSecForTopic, 0);
});

test("QuestionTimeLedger — challenge stays legacy_game cap", () => {
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "challenge",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assert.equal(ledger.tierCapMs, TIER_LEGACY_GAME_MS);
  const closed = ledger.closeQuestion(200_000);
  assert.equal(closed.creditedMs, 120_000);
});
