import test from "node:test";
import assert from "node:assert/strict";

import {
  TAXONOMY_RECURRENCE_POLICY,
} from "../../utils/diagnostic-engine-v2/taxonomy-recurrence-policy.js";
import {
  TAXONOMY_BY_ID,
} from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  assessSubskillCandidateSafety,
} from "../../utils/subskill-candidate-safety.js";

function wrongs(sessionIds) {
  return sessionIds.map((sessionId, index) => ({
    isCorrect: false,
    mode: "practice",
    sessionId,
    timestamp: Date.UTC(2026, 6, 20 + (index % 2), 10, index),
    questionLabel: `recurrence-${index}`,
    userAnswer: `wrong-${index}`,
    misconceptionTag: "add_instead_of_sub",
    metadata: {
      metadataSource: "question_metadata_normalizer",
      possibleErrorPatterns: ["add_instead_of_sub"],
    },
  }));
}

function safety(events, overrides = {}) {
  return assessSubskillCandidateSafety({
    subjectId: "math",
    row: { questions: 20, accuracy: 55, gradeRelation: "same" },
    wrongs: events,
    taxonomyMatch: {
      subskillCandidate: { taxonomyId: "M-09", labelHe: "חיסור" },
      normalizedBucketKey: "subtraction",
      matchStrength: "strong",
    },
    candidateIdsRaw: ["M-09"],
    candidateIdsOrdered: ["M-09"],
    chosenId: "M-09",
    recurrenceMatched: true,
    disambiguationApplied: true,
    disambiguationWinnerId: "M-09",
    ...overrides,
  });
}

test("P3B every taxonomy rule has an explicit recurrence family policy", () => {
  assert.equal(Object.keys(TAXONOMY_RECURRENCE_POLICY).length, 76);
  assert.deepEqual(
    Object.keys(TAXONOMY_RECURRENCE_POLICY).sort(),
    Object.keys(TAXONOMY_BY_ID).sort(),
  );
  for (const policy of Object.values(TAXONOMY_RECURRENCE_POLICY)) {
    assert.ok(policy.minWrongEvents >= 3, policy.ruleId);
    assert.equal(policy.minSessionsForSubskill, 2, policy.ruleId);
    assert.equal(policy.recentActivityRequired, true, policy.ruleId);
    assert.equal(policy.sameSessionBehavior, "topic_level_only", policy.ruleId);
  }
});

test("P3B same-session recurrence cannot create a subskill claim", () => {
  const result = safety(
    wrongs([
      "session-one",
      "session-one",
      "session-one",
      "session-one",
      "session-one",
      "session-one",
    ]),
  );
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(result.blockReasons.includes("below_recurrence_min_sessions"));
});

test("P3B cross-session recent recurrence can pass when all other gates pass", () => {
  const result = safety(
    wrongs([
      "session-one",
      "session-two",
      "session-one",
      "session-two",
      "session-one",
      "session-two",
    ]),
  );
  assert.equal(result.distinctSessions, 2);
  assert.equal(result.safeToShowSubskill, true);
});

test("P3B stale and counter-evidenced patterns remain blocked", () => {
  const events = wrongs([
    "session-one",
    "session-two",
    "session-one",
    "session-two",
    "session-one",
    "session-two",
  ]);
  const stale = safety(events, { patternActiveRecently: false });
  const counter = safety(events, { counterEvidenceStrong: true });
  assert.equal(stale.safeToShowSubskill, false);
  assert.ok(stale.blockReasons.includes("pattern_not_recently_active"));
  assert.equal(counter.safeToShowSubskill, false);
  assert.ok(counter.blockReasons.includes("counter_evidence_strong"));
});
