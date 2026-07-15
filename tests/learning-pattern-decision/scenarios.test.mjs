/**
 * P9 — Scenario regression suite (multi-subject, subject-agnostic engine).
 * Run: npm run test:learning-pattern-decision:scenarios
 */
import assert from "node:assert/strict";
import {
  buildLearningPatternDecision,
  findForbiddenParentWords,
  partitionPatternEligibleMistakes,
} from "../../utils/learning-pattern-decision/index.js";
import { traceRowConflictReport as conflictReport } from "../../utils/learning-pattern-decision/trace-row-conflict-report.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

function mkWrong(subjectId, bucket, n, pf = "pf:repeat", mode = "practice", samePattern = true) {
  return Array.from({ length: n }, (_, i) =>
    normalizeMistakeEvent(
      {
        bucketKey: bucket,
        mode,
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

function assertNoForbidden(text) {
  const hits = findForbiddenParentWords(text);
  assert.equal(hits.length, 0, `forbidden words: ${hits.join(", ")} in "${text}"`);
}

/** Scenario 1 — 3q 2w same pattern (math example) */
{
  const lpd = buildCase({
    subjectId: "math",
    bucket: "addition",
    name: "חיבור",
    q: 3,
    c: 1,
    w: 2,
    acc: 33,
    mistakes: mkWrong("math", "addition", 2),
  });
  assert.ok(lpd.detectedPatterns.length >= 1);
  assert.equal(lpd.parentWordingLevel, "factual_observation");
  assert.notEqual(lpd.parentWordingLevel, "repeated_pattern");
  assertNoForbidden(lpd.parentVisibleFinding);
  assert.equal(conflictReport(lpd).conflict, false);
}

/** Scenario 1b — english */
{
  const lpd = buildCase({
    subjectId: "english",
    bucket: "grammar",
    name: "דקדוק",
    q: 3,
    c: 1,
    w: 2,
    acc: 33,
    mistakes: mkWrong("english", "grammar", 2, "pf:verb"),
  });
  assert.equal(lpd.parentWordingLevel, "factual_observation");
  assert.ok(lpd.detectedPatterns.length >= 1);
}

/** Scenario 2 — 5q 4w same pattern */
{
  const lpd = buildCase({
    subjectId: "math",
    bucket: "addition",
    name: "חיבור",
    q: 5,
    c: 1,
    w: 4,
    acc: 20,
    mistakes: mkWrong("math", "addition", 4),
  });
  assert.equal(lpd.findingType, "difficulty_pattern");
  assert.match(lpd.parentVisibleFinding, /דפוס חוזר/);
}

/** Scenario 3 — 5q 4w different pattern types */
{
  const mistakes = Array.from({ length: 4 }, (_, i) =>
    normalizeMistakeEvent(
      {
        bucketKey: "perimeter",
        mode: "practice",
        isCorrect: false,
        patternFamily: `pf:distinct-${i}`,
        timestamp: START + i * 86_400_000,
      },
      "geometry",
    ),
  );
  const lpd = buildCase({
    subjectId: "geometry",
    bucket: "perimeter",
    name: "היקף",
    q: 5,
    c: 1,
    w: 4,
    acc: 20,
    mistakes,
  });
  assert.equal(lpd.topicStatus, "difficulty_observed");
  assert.equal(lpd.repeatedMistakePatterns.length, 0);
}

/** Scenario 4 — 5q 5 correct */
{
  const lpd = buildCase({
    subjectId: "math",
    bucket: "addition",
    name: "חיבור",
    q: 5,
    c: 5,
    w: 0,
    acc: 100,
    mistakes: [],
  });
  assert.equal(lpd.topicStatus, "positive_observed");
  assert.ok(lpd.parentVisibleFinding.includes("הצלחה"));
}

/** Scenario 5 — 10q 5w same pattern (hebrew) */
{
  const lpd = buildCase({
    subjectId: "hebrew",
    bucket: "reading",
    name: "הבנת הנקרא",
    q: 10,
    c: 5,
    w: 5,
    acc: 50,
    mistakes: mkWrong("hebrew", "reading", 5, "pf:comprehension"),
  });
  assert.equal(lpd.parentWordingLevel, "repeated_pattern");
}

/** Scenario 6 — 12q 6w same pattern (science) */
{
  const lpd = buildCase({
    subjectId: "science",
    bucket: "graphs",
    name: "גרפים",
    q: 12,
    c: 6,
    w: 6,
    acc: 50,
    mistakes: mkWrong("science", "graphs", 6, "pf:axis"),
  });
  assert.ok(["supported", "strong"].includes(lpd.evidenceStrength));
  assert.equal(lpd.observedPatternLevel, "consistent");
}

/** Scenario 8 — learning mode excluded */
{
  const { excludedEvidence, included } = partitionPatternEligibleMistakes(
    [{ bucketKey: "grammar", mode: "learning", isCorrect: false, timestamp: START }],
    "english",
    "grammar",
    START,
    END,
  );
  assert.equal(included.length, 0);
  assert.ok(excludedEvidence.some((e) => e.reason.includes("learning")));
}

/** Scenario 9 — not practiced */
{
  const lpd = buildCase({
    subjectId: "history",
    bucket: "ancient",
    name: "עתיקה",
    q: 0,
    c: 0,
    w: 0,
    acc: 0,
    mistakes: [],
  });
  assert.equal(lpd.topicStatus, "not_practiced");
  assert.equal(lpd.parentWordingLevel, "no_parent_text");
}

/** Scenario 11 — competitive bucket */
{
  const lpd = buildCase({
    subjectId: "english",
    bucket: "vocabulary",
    name: "אוצר מילים",
    q: 8,
    c: 3,
    w: 5,
    acc: 37.5,
    mistakes: mkWrong("english", "vocabulary", 5, "pf:speed", "speed"),
    mode: "speed",
  });
  assert.equal(lpd.competitiveBucketOnly, true);
  assert.match(lpd.parentVisibleFinding, /תחרותי|מהירות/);
}

/** Scenario — missing V3 still produces LPD via topic performance */
{
  const lpd = buildCase({
    subjectId: "moledet-geography",
    bucket: "maps",
    name: "מפות",
    q: 6,
    c: 2,
    w: 4,
    acc: 33,
    mistakes: mkWrong("moledet-geography", "maps", 4),
  });
  assert.ok(lpd.enrichmentMissing.includes("de2_unit"));
  assert.ok(lpd.parentVisibleFinding.length > 0);
  assert.ok(lpd.trace.some((t) => t.includes("fallback:topic_performance_only")));
}

/** Scenario 7 — high success + reliability softens strength (history) */
{
  const lpd = buildLearningPatternDecision({
    subjectId: "history",
    topicRowKey: "timeline",
    row: {
      bucketKey: "timeline",
      displayName: "ציר זמן",
      questions: 20,
      correct: 18,
      wrong: 2,
      accuracy: 90,
    },
    professionalSlice: { reliabilitySoftened: true },
    rawMistakes: mkWrong("history", "timeline", 2),
    startMs: START,
    endMs: END,
  });
  assert.equal(lpd.evidenceStrength, "supported");
  assert.ok(lpd.trace.some((t) => t.includes("reliability_softened")));
  assert.ok(lpd.parentVisibleFinding.length > 0);
}

/** Scenario 10 — subject not practiced (no row with q>0) handled at report level */
{
  const lpd = buildCase({
    subjectId: "history",
    bucket: "unused-topic",
    name: "לא תורגל",
    q: 0,
    c: 0,
    w: 0,
    acc: 0,
    mistakes: [],
  });
  assert.equal(lpd.topicStatus, "not_practiced");
}

/** Scenario 12 — parent-assigned independent (quiz mode) included */
{
  const lpd = buildCase({
    subjectId: "english",
    bucket: "grammar",
    name: "דקדוק",
    q: 6,
    c: 2,
    w: 4,
    acc: 33,
    mistakes: mkWrong("english", "grammar", 4, "pf:assigned", "quiz"),
    mode: "quiz",
  });
  assert.equal(lpd.findingType, "difficulty_pattern");
  assert.ok(lpd.excludedEvidence.length === 0 || lpd.practicedQuestions > 0);
}

/** Scenario 13 — teacher-assigned homework included */
{
  const { included } = partitionPatternEligibleMistakes(
    [{ bucketKey: "graphs", mode: "homework", isCorrect: false, timestamp: START }],
    "science",
    "graphs",
    START,
    END,
  );
  assert.equal(included.length, 1);
}

/** Scenario 14 — mixed success + difficulty */
{
  const mistakes = [
    ...mkWrong("hebrew", "spelling", 2, "pf:spell"),
    ...Array.from({ length: 8 }, () =>
      normalizeMistakeEvent(
        { bucketKey: "spelling", mode: "practice", isCorrect: true, timestamp: START },
        "hebrew",
      ),
    ),
  ];
  const lpd = buildLearningPatternDecision({
    subjectId: "hebrew",
    topicRowKey: "spelling",
    row: {
      bucketKey: "spelling",
      displayName: "כתיב",
      questions: 10,
      correct: 8,
      wrong: 2,
      accuracy: 80,
    },
    rawMistakes: mistakes,
    startMs: START,
    endMs: END,
  });
  assert.equal(lpd.topicStatus, "mixed");
  assert.equal(lpd.findingType, "mixed_pattern");
}

/** Scenario 15 — book reading excluded from pattern input */
{
  const { included, excludedEvidence } = partitionPatternEligibleMistakes(
    [{ bucketKey: "reading", mode: "learning_book", isCorrect: false, timestamp: START }],
    "hebrew",
    "reading",
    START,
    END,
  );
  assert.equal(included.length, 0);
  assert.ok(excludedEvidence.some((e) => /book/.test(String(e.reason))));
}

/** Scenario 16 — recurrence at q=10 (geometry) */
{
  const lpd = buildCase({
    subjectId: "geometry",
    bucket: "area",
    name: "שטח",
    q: 10,
    c: 4,
    w: 6,
    acc: 40,
    mistakes: mkWrong("geometry", "area", 6, "pf:area"),
  });
  assert.equal(lpd.observedPatternLevel, "repeated");
  assert.equal(lpd.parentWordingLevel, "repeated_pattern");
}

/** Forbidden wording grep — all scenario outputs */
for (const sc of [
  buildCase({ subjectId: "math", bucket: "addition", name: "חיבור", q: 5, c: 1, w: 4, acc: 20, mistakes: mkWrong("math", "addition", 4) }),
  buildCase({ subjectId: "english", bucket: "grammar", name: "דקדוק", q: 8, c: 7, w: 1, acc: 87.5, mistakes: mkWrong("english", "grammar", 1) }),
]) {
  assertNoForbidden(sc.parentVisibleFinding);
}

console.log("scenarios.test.mjs - all scenarios passed");
