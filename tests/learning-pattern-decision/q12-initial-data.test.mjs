/**
 * BLOCKER 1 — q=1–2 initial_topic_data policy (subject-agnostic).
 */
import assert from "node:assert/strict";
import {
  buildLearningPatternDecision,
  findForbiddenParentWords,
} from "../../utils/learning-pattern-decision/index.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

function mkWrong(subjectId, bucket, n, pf = "pf:repeat", samePattern = true) {
  return Array.from({ length: n }, (_, i) =>
    normalizeMistakeEvent(
      {
        bucketKey: bucket,
        mode: "practice",
        isCorrect: false,
        patternFamily: samePattern ? pf : `${pf}:${i}`,
        timestamp: START + i * 86_400_000,
      },
      subjectId,
    ),
  );
}

function buildCase({ subjectId, bucket, name, q, c, w, acc, mistakes, mode = "practice" }) {
  return buildLearningPatternDecision({
    subjectId,
    topicRowKey: bucket,
    row: { bucketKey: bucket, displayName: name, questions: q, correct: c, wrong: w, accuracy: acc },
    rawMistakes: (mistakes || mkWrong(subjectId, bucket, w)).map((e) => ({ ...e, mode })),
    startMs: START,
    endMs: END,
  });
}

function assertInitialOnly(lpd) {
  assert.equal(lpd.topicStatus, "initial_data");
  assert.equal(lpd.findingType, "initial_topic_data");
  assert.equal(lpd.parentWordingLevel, "factual_observation");
  assert.equal(lpd.templateId, "initial_topic_data");
  assert.notEqual(lpd.findingType, "practice_focus");
  assert.notEqual(lpd.topicStatus, "practice_focus");
  assert.notEqual(lpd.topicStatus, "difficulty_observed");
  assert.ok(!lpd.parentVisibleFinding.includes("כדאי לחזק"));
  assert.ok(!lpd.parentVisibleFinding.includes("כדאי לשים דגש"));
  assert.ok(!lpd.parentVisibleFinding.includes("דפוס חוזר"));
  assert.ok(!lpd.parentVisibleFinding.includes("הצלחה טובה"));
  assert.equal(findForbiddenParentWords(lpd.parentVisibleFinding).length, 0);
  assert.equal(lpd.recommendedFocus, null);
}

/** A — q=1, correct=0/wrong=1 */
{
  const lpd = buildCase({
    subjectId: "math",
    bucket: "addition",
    name: "חיבור",
    q: 1,
    c: 0,
    w: 1,
    acc: 0,
    mistakes: mkWrong("math", "addition", 1),
  });
  assertInitialOnly(lpd);
  assert.ok(lpd.parentVisibleFinding.length > 0);
}

/** B — q=2, wrong=2, different patterns */
{
  const lpd = buildCase({
    subjectId: "math",
    bucket: "addition",
    name: "חיבור",
    q: 2,
    c: 0,
    w: 2,
    acc: 0,
    mistakes: mkWrong("math", "addition", 2, "pf:x", false),
  });
  assertInitialOnly(lpd);
  assert.equal(lpd.repeatedMistakePatterns.length, 0);
}

/** C — q=2, wrong=2, same pattern */
{
  const lpd = buildCase({
    subjectId: "geometry",
    bucket: "perimeter",
    name: "היקף",
    q: 2,
    c: 0,
    w: 2,
    acc: 0,
    mistakes: mkWrong("geometry", "perimeter", 2, "pf:same", true),
  });
  assertInitialOnly(lpd);
  assert.ok(lpd.detectedPatterns.length >= 1, "internal detectedPatterns may populate");
  assert.notEqual(lpd.parentWordingLevel, "repeated_pattern");
}

/** D — q=2, correct=2 */
{
  const lpd = buildCase({
    subjectId: "english",
    bucket: "grammar",
    name: "דקדוק",
    q: 2,
    c: 2,
    w: 0,
    acc: 100,
    mistakes: [],
  });
  assertInitialOnly(lpd);
  assert.notEqual(lpd.topicStatus, "positive_observed");
}

/** E — parent-assigned independent q=2 */
{
  const lpd = buildCase({
    subjectId: "english",
    bucket: "grammar",
    name: "דקדוק",
    q: 2,
    c: 0,
    w: 2,
    acc: 0,
    mistakes: mkWrong("english", "grammar", 2, "pf:assigned", false),
    mode: "quiz",
  });
  assertInitialOnly(lpd);
}

console.log("q12-initial-data.test.mjs - all passed");
