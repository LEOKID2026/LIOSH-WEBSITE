/**
 * P7 — inclusion/exclusion audit tests (subject-agnostic).
 */
import assert from "node:assert/strict";
import { partitionPatternEligibleMistakes } from "../../utils/learning-pattern-decision/resolve-excluded-evidence.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

const INCLUDED_MODES = ["practice", "quiz", "homework", "speed", "challenge", "marathon"];
const EXCLUDED_MODES = ["learning", "guided_practice", "learning_book", "mistakes"];

for (const mode of INCLUDED_MODES) {
  const { included } = partitionPatternEligibleMistakes(
    [{ bucketKey: "topic_x", mode, isCorrect: true, timestamp: START }],
    "science",
    "topic_x",
    START,
    END,
  );
  assert.equal(included.length, 1, `${mode} should be pattern-eligible`);
}

for (const mode of EXCLUDED_MODES) {
  const { included, excludedEvidence } = partitionPatternEligibleMistakes(
    [{ bucketKey: "topic_y", mode, isCorrect: false, timestamp: START }],
    "english",
    "topic_y",
    START,
    END,
  );
  assert.equal(included.length, 0, `${mode} should be excluded`);
  assert.ok(excludedEvidence.length > 0);
}

{
  const { bucketCounts, competitiveBucketOnly } = partitionPatternEligibleMistakes(
    [
      { bucketKey: "vocab", mode: "speed", isCorrect: false, timestamp: START },
      { bucketKey: "vocab", mode: "speed", isCorrect: false, timestamp: START + 1000 },
    ],
    "english",
    "vocab",
    START,
    END,
  );
  assert.equal(bucketCounts.competitiveCount, 2);
  assert.equal(competitiveBucketOnly, true);
}

{
  const { bucketCounts, competitiveBucketOnly } = partitionPatternEligibleMistakes(
    [
      { bucketKey: "vocab", mode: "speed", isCorrect: false, timestamp: START },
      { bucketKey: "vocab", mode: "practice", isCorrect: true, timestamp: START + 1000 },
    ],
    "english",
    "vocab",
    START,
    END,
  );
  assert.equal(bucketCounts.independentCount, 1);
  assert.equal(bucketCounts.competitiveCount, 1);
  assert.equal(competitiveBucketOnly, false);
}

// parent-assigned independent (source + mode quiz)
{
  const { included } = partitionPatternEligibleMistakes(
    [
      {
        bucketKey: "grammar",
        mode: "quiz",
        evidenceSource: "parent_assigned_activity",
        isCorrect: false,
        timestamp: START,
      },
    ],
    "english",
    "grammar",
    START,
    END,
  );
  assert.equal(included.length, 1);
}

// teacher-assigned independent (source + mode homework)
{
  const { included } = partitionPatternEligibleMistakes(
    [
      {
        bucketKey: "graphs",
        mode: "homework",
        evidenceSource: "private_teacher_assigned_activity",
        isCorrect: false,
        timestamp: START,
      },
    ],
    "science",
    "graphs",
    START,
    END,
  );
  assert.equal(included.length, 1);
}

// parent assigned guided_practice → diagnostic_guided (included)
{
  const { included, bucketCounts } = partitionPatternEligibleMistakes(
    [
      {
        bucketKey: "reading",
        mode: "guided_practice",
        evidenceSource: "parent_assigned_activity",
        isCorrect: false,
        timestamp: START,
      },
    ],
    "hebrew",
    "reading",
    START,
    END,
  );
  assert.equal(included.length, 1);
  assert.equal(bucketCounts.guidedCount, 1);
}

// learning mode excluded regardless of volume
{
  const { included, excludedEvidence } = partitionPatternEligibleMistakes(
    [
      { bucketKey: "addition", mode: "learning", isCorrect: false, timestamp: START },
      { bucketKey: "addition", mode: "learning", isCorrect: false, timestamp: START + 1 },
    ],
    "math",
    "addition",
    START,
    END,
  );
  assert.equal(included.length, 0);
  assert.ok(excludedEvidence.some((e) => /learning|guided/.test(e.reason)));
}

console.log("inclusion-audit.test.mjs - passed");
