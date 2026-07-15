/**
 * Assigned activity LPD policy — parent/teacher independent, q tiers.
 */
import assert from "node:assert/strict";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/index.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

function assignedCase({ mode, source, q, c, w, acc, pf = "pf:assigned", same = true }) {
  const mistakes = Array.from({ length: w }, (_, i) =>
    normalizeMistakeEvent(
      {
        bucketKey: "grammar",
        mode,
        evidenceSource: source,
        isCorrect: false,
        patternFamily: same ? pf : `${pf}:${i}`,
        timestamp: START + i * 86_400_000,
      },
      "english",
    ),
  );
  return buildLearningPatternDecision({
    subjectId: "english",
    topicRowKey: "grammar",
    row: {
      bucketKey: "grammar",
      displayName: "דקדוק",
      questions: q,
      correct: c,
      wrong: w,
      accuracy: acc,
    },
    rawMistakes: mistakes,
    startMs: START,
    endMs: END,
  });
}

// parent assigned q=2 → initial only
{
  const lpd = assignedCase({
    mode: "quiz",
    source: "parent_assigned_activity",
    q: 2,
    c: 0,
    w: 2,
    acc: 0,
  });
  assert.equal(lpd.findingType, "initial_topic_data");
  assert.ok(!lpd.parentVisibleFinding.includes("כדאי לחזק"));
}

// teacher assigned q=2 → initial only
{
  const lpd = assignedCase({
    mode: "homework",
    source: "private_teacher_assigned_activity",
    q: 2,
    c: 1,
    w: 1,
    acc: 50,
  });
  assert.equal(lpd.topicStatus, "initial_data");
}

// parent assigned q=5 same pattern → repeated allowed
{
  const lpd = assignedCase({
    mode: "quiz",
    source: "parent_assigned_activity",
    q: 5,
    c: 1,
    w: 4,
    acc: 20,
    same: true,
  });
  assert.equal(lpd.findingType, "difficulty_pattern");
  assert.match(lpd.parentVisibleFinding, /דפוס חוזר/);
}

console.log("assigned-activity-lpd.test.mjs - all passed");
