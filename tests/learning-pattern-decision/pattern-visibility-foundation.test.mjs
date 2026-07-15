/**
 * P1 — Pattern visibility + overclaim guard (subject-agnostic).
 * Run: npm run test:learning-pattern-decision:foundation
 */
import assert from "node:assert/strict";
import { resolveConfidenceLevel } from "../../utils/diagnostic-engine-v2/confidence-policy.js";
import {
  buildLearningPatternDecision,
  resolveEvidenceStrength,
  findForbiddenParentWords,
} from "../../utils/learning-pattern-decision/index.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

function wrongEvents(subjectId, bucketKey, count, patternFamily = "pf:fixture", mode = "practice") {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(
      normalizeMistakeEvent(
        {
          bucketKey,
          operation: bucketKey,
          mode,
          isCorrect: false,
          patternFamily,
          timestamp: Date.UTC(2026, 3, 10) + i * 3600_000,
        },
        subjectId,
      ),
    );
  }
  return out;
}

// q=3/w=2 — no moderate overclaim
{
  const level = resolveConfidenceLevel({
    events: [],
    wrongs: [{}, {}],
    row: { questions: 3, wrong: 2 },
    recurrenceFull: false,
    hintInvalidates: false,
  });
  assert.notEqual(level, "moderate", "q=3/w=2 must not be moderate");
  assert.equal(level, "early_signal_only");
}

// Subject-agnostic composition — multiple subjects (examples only in tests)
const SUBJECT_CASES = [
  { subjectId: "math", topicKey: "addition", topicName: "חיבור" },
  { subjectId: "english", topicKey: "grammar", topicName: "דקדוק" },
  { subjectId: "hebrew", topicKey: "reading", topicName: "הבנת הנקרא" },
  { subjectId: "geometry", topicKey: "perimeter", topicName: "היקף" },
  { subjectId: "science", topicKey: "graphs", topicName: "גרפים" },
];

for (const sc of SUBJECT_CASES) {
  const mistakes = wrongEvents(sc.subjectId, sc.topicKey, 2, "pf:same");
  const lpd = buildLearningPatternDecision({
    subjectId: sc.subjectId,
    topicRowKey: `${sc.topicKey}\u0001practice\u0001g4\u0001medium`,
    row: {
      bucketKey: sc.topicKey,
      displayName: sc.topicName,
      questions: 3,
      correct: 1,
      wrong: 2,
      accuracy: 33,
    },
    rawMistakes: mistakes.map((e) => ({ ...e, mode: "practice" })),
    startMs: 0,
    endMs: Date.UTC(2026, 4, 1),
  });

  assert.ok(lpd.detectedPatterns.length >= 1, `${sc.subjectId}: internal pattern populated`);
  assert.equal(lpd.parentWordingLevel, "factual_observation", `${sc.subjectId}: q3-4 factual only`);
  assert.notEqual(lpd.topicStatus, "difficulty_repeated", `${sc.subjectId}: no difficulty_repeated at q=3`);
  assert.equal(findForbiddenParentWords(lpd.parentVisibleFinding).length, 0);
  assert.ok(lpd.enrichmentMissing.includes("de2_unit"), `${sc.subjectId}: trace missing enrichment`);
}

// 5q 4w same pattern — difficulty_repeated visible to parent
for (const sc of SUBJECT_CASES.slice(0, 2)) {
  const mistakes = wrongEvents(sc.subjectId, sc.topicKey, 4, "pf:same");
  const lpd = buildLearningPatternDecision({
    subjectId: sc.subjectId,
    topicRowKey: sc.topicKey,
    row: {
      bucketKey: sc.topicKey,
      displayName: sc.topicName,
      questions: 5,
      correct: 1,
      wrong: 4,
      accuracy: 20,
    },
    rawMistakes: mistakes.map((e) => ({ ...e, mode: "practice" })),
    startMs: 0,
    endMs: Date.UTC(2026, 4, 1),
  });
  assert.equal(lpd.findingType, "difficulty_pattern");
  assert.equal(lpd.topicStatus, "difficulty_repeated");
  assert.equal(lpd.parentWordingLevel, "repeated_pattern");
  assert.match(lpd.parentVisibleFinding, /מופיע דפוס חוזר/);
  assert.doesNotMatch(lpd.parentVisibleFinding, /אין מספיק|אבחון|אזהרה/i);
}

// 5q 5 correct — positive_observed
{
  const lpd = buildLearningPatternDecision({
    subjectId: "science",
    topicRowKey: "graphs",
    row: {
      bucketKey: "graphs",
      displayName: "גרפים",
      questions: 5,
      correct: 5,
      wrong: 0,
      accuracy: 100,
    },
    rawMistakes: [],
    startMs: 0,
    endMs: Date.UTC(2026, 4, 1),
  });
  assert.equal(lpd.topicStatus, "positive_observed");
  assert.equal(lpd.findingType, "success_pattern");
  assert.ok(lpd.parentVisibleFinding.includes("הצלחה טובה"));
}

// evidenceStrength — q=12 not a display gate
assert.equal(resolveEvidenceStrength(5), "emerging");
assert.equal(resolveEvidenceStrength(12), "strong");
assert.equal(resolveEvidenceStrength(3), "small_sample");

console.log("pattern-visibility-foundation.test.mjs - all passed");
