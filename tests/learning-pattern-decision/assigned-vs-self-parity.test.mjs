/**
 * Assigned vs self-practice — same stats must yield identical LPD (source-agnostic).
 */
import assert from "node:assert/strict";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/index.js";
import { EVIDENCE_SOURCE } from "../../lib/learning-supabase/evidence-source.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

/** @type {const} */
const SOURCES = [
  { label: "self-practice", mode: "practice", evidenceSource: null },
  { label: "parent-assigned", mode: "quiz", evidenceSource: EVIDENCE_SOURCE.PARENT_ASSIGNED },
  { label: "teacher-assigned", mode: "homework", evidenceSource: EVIDENCE_SOURCE.PRIVATE_TEACHER_ASSIGNED },
];

/**
 * @param {object} p
 * @param {typeof SOURCES[number]} source
 */
function buildForSource(
  source,
  { q, c, w, acc, patternFamily = "pf:parity", samePattern = true, wrongCount = w },
) {
  const mistakes = Array.from({ length: wrongCount }, (_, i) => {
    const raw = {
      bucketKey: "grammar",
      mode: source.mode,
      isCorrect: false,
      patternFamily: samePattern ? patternFamily : `${patternFamily}:${i}`,
      timestamp: START + i * 86_400_000,
    };
    if (source.evidenceSource) raw.evidenceSource = source.evidenceSource;
    return normalizeMistakeEvent(raw, "english");
  });

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

/**
 * @param {ReturnType<typeof buildLearningPatternDecision>[]} lpds
 */
function assertLpdParity(lpds, context) {
  const [base, ...rest] = lpds;
  const pick = (lpd) => ({
    topicStatus: lpd.topicStatus,
    findingType: lpd.findingType,
    parentWordingLevel: lpd.parentWordingLevel,
    templateId: lpd.templateId,
    parentVisibleFinding: lpd.parentVisibleFinding,
    recommendedFocus: lpd.recommendedFocus,
    blockedClaims: [...(lpd.blockedClaims || [])].sort(),
  });

  const basePick = pick(base);
  for (const lpd of rest) {
    assert.deepEqual(pick(lpd), basePick, `${context}: LPD must match across evidence sources`);
  }
}

/** A — q=1–2 → initial_topic_data (all sources) */
{
  const lpds = SOURCES.map((src) =>
    buildForSource(src, { q: 2, c: 0, w: 2, acc: 0, wrongCount: 2, samePattern: false }),
  );
  assertLpdParity(lpds, "q=2 initial");
  assert.equal(lpds[0].findingType, "initial_topic_data");
  assert.equal(lpds[0].topicStatus, "initial_data");
  assert.equal(lpds[0].parentWordingLevel, "factual_observation");
  assert.equal(lpds[0].templateId, "initial_topic_data");
  assert.equal(lpds[0].recommendedFocus, null);
}

/** B — q>=5 same pattern → difficulty_pattern / repeated wording */
{
  const lpds = SOURCES.map((src) =>
    buildForSource(src, { q: 5, c: 1, w: 4, acc: 20, wrongCount: 4, samePattern: true }),
  );
  assertLpdParity(lpds, "q=5 repeated difficulty");
  assert.equal(lpds[0].findingType, "difficulty_pattern");
  assert.match(lpds[0].parentVisibleFinding, /דפוס חוזר/);
  assert.ok(lpds[0].blockedClaims.includes("no_root_cause_claim"));
}

/** C — q=5/5 correct → positive_observed */
{
  const lpds = SOURCES.map((src) =>
    buildLearningPatternDecision({
      subjectId: "english",
      topicRowKey: "grammar",
      row: {
        bucketKey: "grammar",
        displayName: "דקדוק",
        questions: 5,
        correct: 5,
        wrong: 0,
        accuracy: 100,
      },
      rawMistakes: [],
      startMs: START,
      endMs: END,
    }),
  );
  // Same row stats — source only affects rawMistakes; empty for all
  assertLpdParity(lpds, "q=5 all correct");
  assert.equal(lpds[0].topicStatus, "positive_observed");
  assert.equal(lpds[0].findingType, "success_pattern");
  assert.ok(lpds[0].parentVisibleFinding.includes("הצלחה"));
}

console.log("assigned-vs-self-parity.test.mjs - all passed");
