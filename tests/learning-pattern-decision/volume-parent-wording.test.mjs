/**
 * Remaining audit closure — q=12/q=40 volume vs parent wording, forbidden overclaim.
 */
import assert from "node:assert/strict";
import {
  buildLearningPatternDecision,
  findForbiddenParentWords,
  resolveEvidenceStrength,
} from "../../utils/learning-pattern-decision/index.js";
import { resolveEvidenceStrength as sharedResolve } from "../../utils/evidence-strength-policy.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

function mkWrong(subjectId, bucket, n, pf, same = true) {
  return Array.from({ length: n }, (_, i) =>
    normalizeMistakeEvent(
      {
        bucketKey: bucket,
        mode: "practice",
        isCorrect: false,
        patternFamily: same ? pf : `${pf}:${i}`,
        timestamp: START + i * 86_400_000,
      },
      subjectId,
    ),
  );
}

function buildCase({ q, c, w, acc, mistakes = [] }) {
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "addition",
    row: {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: q,
      correct: c,
      wrong: w,
      accuracy: acc,
    },
    rawMistakes: mistakes.map((e) => ({ ...e, mode: "practice" })),
    startMs: START,
    endMs: END,
  });
}

const FORBIDDEN_OVERCLAIM = [/שליטה/u, /ודאי/u, /קבוע/u, /אבחון/u, /רמת קושי גבוהה/u];

function assertNoOverclaim(text) {
  assert.equal(findForbiddenParentWords(text).length, 0);
  for (const re of FORBIDDEN_OVERCLAIM) {
    assert.doesNotMatch(text, re, `overclaim in: ${text}`);
  }
}

// evidenceStrength at q=12/q=40 — trace label only, shared policy
assert.equal(resolveEvidenceStrength(12), "strong");
assert.equal(resolveEvidenceStrength(40), "strong");
assert.equal(sharedResolve(12), "strong");

// q=12 — mixed wrongs, no repeated pattern: volume alone must not yield strong_pattern
{
  const mistakes = mkWrong("math", "addition", 8, "pf:mix", false);
  const lpd = buildCase({ q: 12, c: 4, w: 8, acc: 33, mistakes });
  assert.equal(lpd.evidenceStrength, "strong");
  assert.equal(lpd.observedPatternLevel, "observed");
  assert.notEqual(lpd.parentWordingLevel, "strong_pattern");
  assert.ok(!lpd.parentVisibleFinding.includes("רמת קושי גבוהה"));
  assertNoOverclaim(lpd.parentVisibleFinding);
}

// q=40 — high volume, no pattern: no strong parent claim from volume alone
{
  const mistakes = mkWrong("math", "addition", 16, "pf:var", false);
  const lpd = buildCase({ q: 40, c: 20, w: 20, acc: 50, mistakes });
  assert.equal(lpd.evidenceStrength, "strong");
  assert.notEqual(lpd.parentWordingLevel, "strong_pattern");
  assertNoOverclaim(lpd.parentVisibleFinding);
}

// q=12 — repeated pattern at 4/5+ still allowed repeated wording (product rule)
{
  const mistakes = mkWrong("math", "addition", 10, "pf:same", true);
  const lpd = buildCase({ q: 12, c: 2, w: 10, acc: 17, mistakes });
  assert.equal(lpd.findingType, "difficulty_pattern");
  assert.match(lpd.parentVisibleFinding, /דפוס חוזר/);
  assertNoOverclaim(lpd.parentVisibleFinding);
}

// difficulty template must not use "רמת קושי גבוהה" (softened wording)
{
  const lpd = buildCase({
    q: 6,
    c: 1,
    w: 5,
    acc: 17,
    mistakes: mkWrong("math", "addition", 5, "pf:a", false),
  });
  assert.ok(!lpd.parentVisibleFinding.includes("רמת קושי גבוהה"));
  assert.ok(lpd.parentVisibleFinding.length > 0);
}

console.log("volume-parent-wording.test.mjs - all passed");
