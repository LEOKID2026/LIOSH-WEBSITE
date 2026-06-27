#!/usr/bin/env node
/**
 * Phase A self-test: parent-assigned activities must flow through the SAME
 * content-grade evidence pipeline as self-practice.
 *
 * Validates:
 *  1. Aggregation reads the actual activity content grade from
 *     attempt.question_snapshot.grade and produces correct gradeRelation
 *     (same / lower / higher) on the per-topic byContentGrade slices.
 *  2. Parent activity at a LOWER grade that fails -> gradeRelation=lower.
 *  3. Parent activity at a HIGHER grade that succeeds -> gradeRelation=higher.
 *  4. Parent activity at SAME grade with high success -> gradeRelation=same,
 *     and the slice still carries the strength signal (accuracy=100).
 *  5. Self-practice in another grade is NOT broken.
 *  6. Parent activity at the same grade (no snapshot grade) falls back to
 *     the profile grade and is NOT broken.
 *  7. Diagnostic engine maps gradeRelation -> evidenceScope:
 *       lower  -> prerequisite_foundation
 *       higher -> enrichment_stretch
 *       same   -> registered_grade_primary
 *
 * Run: node scripts/parent-activity-grade-evidence-selftest.mjs
 */

const aggMod = await import(
  new URL("../lib/parent-server/report-data-aggregate.server.js", import.meta.url).href
);
const engineMod = await import(
  new URL("../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js", import.meta.url).href
);
const sourceMod = await import(
  new URL("../lib/learning-supabase/evidence-source.js", import.meta.url).href
);
const rowIdentityMod = await import(
  new URL("../utils/parent-report-output-integrity/row-identity-v1.js", import.meta.url).href
);
const truthPacketMod = await import(
  new URL("../utils/parent-copilot/truth-packet-v1.js", import.meta.url).href
);
const { EVIDENCE_CATEGORIES } = await import(
  new URL("../lib/learning/activity-classification.js", import.meta.url).href
);

const { aggregateReportPayloadFromActivityRows } = aggMod;
const { runDiagnosticEngineV2 } = engineMod;
const {
  EVIDENCE_SOURCE,
  summarizeEvidenceSources,
  mergeEvidenceSourceCounts,
  normalizeEvidenceSourceKey,
} = sourceMod;
const { buildRowIdentityV1 } = rowIdentityMod;
const { buildTruthPacketV1 } = truthPacketMod;

let passed = 0;
const failures = [];

/**
 * @param {string} name
 * @param {boolean} cond
 * @param {string} [detail]
 */
function assert(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ok  - ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL- ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Part 1: aggregation (the actual Phase A code change)
// ---------------------------------------------------------------------------

const student = { id: "stu-test", full_name: "ילד בדיקה", grade_level: "g3", is_active: true };
const fromDate = new Date("2025-09-01T00:00:00.000Z");
const toDate = new Date("2026-06-14T00:00:00.000Z");
const fetchMeta = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

/**
 * @param {object} opts
 */
function parentAttempt({ idx, topic, grade, correct, subject = "math", mode = "guided_practice" }) {
  return {
    id: `att-${topic}-${grade}-${idx}`,
    student_id: student.id,
    activity_id: `act-${topic}-${grade}`,
    question_index: idx,
    skill_key: null,
    is_correct: correct,
    time_spent_ms: 12000,
    hints_used: 0,
    answered_at: "2026-01-15T10:00:00.000Z",
    correct_answer: "x",
    selected_answer: correct ? "x" : "y",
    question_snapshot: { grade, question: `שאלה ${idx}`, subject, topic },
    parent_assigned_activities: {
      subject,
      topic,
      subtopic: null,
      mode,
      difficulty_level: "easy",
    },
  };
}

const parentActivityAttempts = [
  // g3 child working a g2 (lower) topic and FAILING -> foundation gap
  ...[0, 1, 2].map((i) => parentAttempt({ idx: i, topic: "fractions", grade: "g2", correct: false })),
  // g3 child working a g4 (higher) topic and SUCCEEDING -> above grade
  ...[0, 1, 2].map((i) => parentAttempt({ idx: i, topic: "fractions", grade: "g4", correct: true })),
  // g3 child working a g3 (same) topic and EXCELLING -> strength at grade
  ...[0, 1, 2, 3].map((i) =>
    parentAttempt({ idx: i, topic: "addition", grade: "g3", correct: true })
  ),
  // g3 parent activity with NO snapshot grade -> must fall back to profile grade
  {
    id: "att-nograde-0",
    student_id: student.id,
    activity_id: "act-nograde",
    question_index: 0,
    skill_key: null,
    is_correct: true,
    time_spent_ms: 9000,
    hints_used: 0,
    answered_at: "2026-01-16T10:00:00.000Z",
    correct_answer: "x",
    selected_answer: "x",
    question_snapshot: { question: "ללא כיתה", subject: "math", topic: "subtraction" },
    parent_assigned_activities: {
      subject: "math",
      topic: "subtraction",
      subtopic: null,
      mode: "guided_practice",
      difficulty_level: "easy",
    },
  },
];

// Self-practice answers (must carry Phase-1 evidence classification to pass evidence gate).
const answers = [
  // higher grade self-practice (must keep working as before)
  {
    id: "ans-self-0",
    learning_session_id: "sess-self",
    answer_payload: {
      subject: "math",
      topic: "division",
      contentGradeLevel: "g4",
      registeredGradeLevel: "g3",
      gradeRelation: "higher",
      isCorrect: true,
      evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
      isDiagnosticEligible: true,
      gameMode: "practice",
    },
    is_correct: true,
    answered_at: "2026-02-01T10:00:00.000Z",
    created_at: "2026-02-01T10:00:00.000Z",
  },
  // self-practice on the SAME topic+grade as a parent activity (fractions g4)
  // -> the slice must hold BOTH sources without losing provenance (req 3)
  {
    id: "ans-self-1",
    learning_session_id: "sess-self",
    answer_payload: {
      subject: "math",
      topic: "fractions",
      contentGradeLevel: "g4",
      registeredGradeLevel: "g3",
      gradeRelation: "higher",
      isCorrect: true,
      evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
      isDiagnosticEligible: true,
      gameMode: "practice",
    },
    is_correct: true,
    answered_at: "2026-02-02T10:00:00.000Z",
    created_at: "2026-02-02T10:00:00.000Z",
  },
];

const payload = aggregateReportPayloadFromActivityRows(
  student,
  [],
  answers,
  fromDate,
  toDate,
  fetchMeta,
  parentActivityAttempts
);

const mathTopics = payload?.subjects?.math?.topics || {};

const fracG2 = mathTopics?.fractions?.byContentGrade?.g2;
const fracG4 = mathTopics?.fractions?.byContentGrade?.g4;
const addG3 = mathTopics?.addition?.byContentGrade?.g3;
const subG3 = mathTopics?.subtraction?.byContentGrade?.g3;
const divG4 = mathTopics?.division?.byContentGrade?.g4;

assert(
  "parent lower-grade slice exists (fractions g2)",
  !!fracG2,
  `byContentGrade keys: ${Object.keys(mathTopics?.fractions?.byContentGrade || {}).join(",")}`
);
assert("parent lower-grade gradeRelation=lower", fracG2?.gradeRelation === "lower", `got ${fracG2?.gradeRelation}`);
assert("parent lower-grade failure reflected (accuracy 0)", fracG2?.accuracy === 0, `got ${fracG2?.accuracy}`);

assert("parent higher-grade slice exists (fractions g4)", !!fracG4);
assert("parent higher-grade gradeRelation=higher", fracG4?.gradeRelation === "higher", `got ${fracG4?.gradeRelation}`);
assert("parent higher-grade success reflected (accuracy 100)", fracG4?.accuracy === 100, `got ${fracG4?.accuracy}`);

assert(
  "same topic keeps separate grade slices (g2 + g4 under fractions)",
  !!fracG2 && !!fracG4 && fracG2 !== fracG4
);

assert("parent same-grade slice exists (addition g3)", !!addG3);
assert("parent same-grade gradeRelation=same", addG3?.gradeRelation === "same", `got ${addG3?.gradeRelation}`);
assert("parent same-grade strength signal (accuracy 100)", addG3?.accuracy === 100, `got ${addG3?.accuracy}`);

assert("parent no-snapshot-grade falls back to profile grade (subtraction g3)", !!subG3, "expected fallback slice under g3");
assert("parent fallback gradeRelation=same", subG3?.gradeRelation === "same", `got ${subG3?.gradeRelation}`);

assert("self-practice higher-grade NOT broken (division g4)", !!divG4);
assert("self-practice gradeRelation=higher", divG4?.gradeRelation === "higher", `got ${divG4?.gradeRelation}`);

// ---------------------------------------------------------------------------
// Part 2: diagnostic engine maps gradeRelation -> evidenceScope
// ---------------------------------------------------------------------------

/**
 * @param {string} topicRowKey
 * @param {string} gradeRelation
 * @param {string} contentGradeKey
 * @param {number} gradeDelta
 */
function engineRow(topicRowKey, gradeRelation, contentGradeKey, gradeDelta, accuracy) {
  return {
    displayName: topicRowKey,
    questions: 12,
    correct: Math.round((12 * accuracy) / 100),
    wrong: 12 - Math.round((12 * accuracy) / 100),
    accuracy,
    needsPractice: accuracy < 60,
    registeredGradeKey: "g3",
    contentGradeKey,
    gradeRelation,
    gradeDelta,
    dataSufficiencyLevel: "medium",
    confidence01: 0.6,
  };
}

const engineMaps = {
  math: {
    "fractions::grade:g2": engineRow("fractions::grade:g2", "lower", "g2", -1, 30),
    "multiplication::grade:g4": engineRow("multiplication::grade:g4", "higher", "g4", 1, 90),
    "addition::grade:g3": engineRow("addition::grade:g3", "same", "g3", 0, 95),
  },
};

const engineResult = runDiagnosticEngineV2({
  maps: engineMaps,
  rawMistakesBySubject: {},
  startMs: fromDate.getTime(),
  endMs: toDate.getTime(),
});

const units = Array.isArray(engineResult?.units) ? engineResult.units : [];
const byKey = new Map(units.map((u) => [u.topicRowKey, u]));

const uLower = byKey.get("fractions::grade:g2");
const uHigher = byKey.get("multiplication::grade:g4");
const uSame = byKey.get("addition::grade:g3");

assert("engine produced unit for lower", !!uLower);
assert(
  "engine lower -> prerequisite_foundation",
  uLower?.gradeEvidence?.evidenceScope === "prerequisite_foundation",
  `got ${uLower?.gradeEvidence?.evidenceScope}`
);

assert("engine produced unit for higher", !!uHigher);
assert(
  "engine higher -> enrichment_stretch",
  uHigher?.gradeEvidence?.evidenceScope === "enrichment_stretch",
  `got ${uHigher?.gradeEvidence?.evidenceScope}`
);

assert("engine produced unit for same", !!uSame);
assert(
  "engine same -> registered_grade_primary",
  uSame?.gradeEvidence?.evidenceScope === "registered_grade_primary",
  `got ${uSame?.gradeEvidence?.evidenceScope}`
);

assert(
  "engine carries contentGradeKey through to unit",
  uHigher?.gradeEvidence?.contentGradeKey === "g4",
  `got ${uHigher?.gradeEvidence?.contentGradeKey}`
);

// ---------------------------------------------------------------------------
// Part 3: evidence source provenance (Phase C)
// ---------------------------------------------------------------------------

// helper behavior
assert("normalize alias self", normalizeEvidenceSourceKey("self") === EVIDENCE_SOURCE.SELF_PRACTICE);
assert("normalize alias parent", normalizeEvidenceSourceKey("parent_activity") === EVIDENCE_SOURCE.PARENT_ASSIGNED);
assert("normalize unknown -> null", normalizeEvidenceSourceKey("xyz") === null);
{
  const merged = mergeEvidenceSourceCounts({ self_practice: 1 }, { self_practice: 1, parent_assigned_activity: 4 });
  const sum = summarizeEvidenceSources(merged);
  assert("summarize primary is the max", sum.primaryEvidenceSource === EVIDENCE_SOURCE.PARENT_ASSIGNED, JSON.stringify(sum));
  assert("summarize lists both sources", sum.evidenceSources.length === 2);
}

// aggregation provenance: parent slices vs self slices
assert(
  "parent lower-grade primary source = parent_assigned_activity",
  fracG2?.primaryEvidenceSource === EVIDENCE_SOURCE.PARENT_ASSIGNED,
  `got ${fracG2?.primaryEvidenceSource}`
);
assert(
  "parent same-grade primary source = parent_assigned_activity",
  addG3?.primaryEvidenceSource === EVIDENCE_SOURCE.PARENT_ASSIGNED,
  `got ${addG3?.primaryEvidenceSource}`
);
assert(
  "self-practice slice primary source = self_practice (division g4)",
  divG4?.primaryEvidenceSource === EVIDENCE_SOURCE.SELF_PRACTICE,
  `got ${divG4?.primaryEvidenceSource}`
);

// req 3: same topic + same content grade holds BOTH sources
assert(
  "fractions g4 holds parent + self evidence",
  !!fracG4?.evidenceSourceCounts &&
    Number(fracG4.evidenceSourceCounts[EVIDENCE_SOURCE.PARENT_ASSIGNED]) > 0 &&
    Number(fracG4.evidenceSourceCounts[EVIDENCE_SOURCE.SELF_PRACTICE]) > 0,
  JSON.stringify(fracG4?.evidenceSourceCounts)
);
assert(
  "fractions g4 lists both sources",
  Array.isArray(fracG4?.evidenceSources) && fracG4.evidenceSources.length === 2,
  JSON.stringify(fracG4?.evidenceSources)
);
assert(
  "fractions g4 gradeRelation still correct with mixed sources",
  fracG4?.gradeRelation === "higher",
  `got ${fracG4?.gradeRelation}`
);

// ---------------------------------------------------------------------------
// Part 4: row identity exposes source + Copilot truth packet reads it
// ---------------------------------------------------------------------------

const riv = buildRowIdentityV1({
  subjectId: "math",
  topicRowKey: "fractions::grade:g4",
  displayName: "שברים",
  contentGradeKey: "g4",
  registeredGradeKey: "g3",
  gradeRelation: "higher",
  questions: 12,
  accuracy: 90,
  evidenceSources: fracG4?.evidenceSources,
  primaryEvidenceSource: fracG4?.primaryEvidenceSource,
  evidenceSourceCounts: fracG4?.evidenceSourceCounts,
});
assert("rowIdentityV1 exposes evidenceSources", Array.isArray(riv.evidenceSources) && riv.evidenceSources.length === 2);
assert(
  "rowIdentityV1 exposes primaryEvidenceSource",
  riv.primaryEvidenceSource === EVIDENCE_SOURCE.PARENT_ASSIGNED,
  `got ${riv.primaryEvidenceSource}`
);

const truthPayload = {
  registeredGradeKey: "g3",
  subjectProfiles: [
    {
      subject: "math",
      subjectQuestionCount: 12,
      subjectAccuracy: 90,
      topicRecommendations: [
        {
          topicRowKey: "fractions::grade:g4",
          topicKey: "fractions::grade:g4",
          displayName: "שברים",
          questions: 12,
          accuracy: 90,
          rowIdentityV1: riv,
          contractsV1: {
            narrative: {
              contractVersion: "v1",
              textSlots: {
                observation: "בשברים ברמת כיתה ד׳ נספרו 12 שאלות עם דיוק גבוה.",
                interpretation: "נראית שליטה טובה מעל רמת הכיתה הרשומה.",
                uncertainty: "כדאי להמשיך לעקוב לאורך עוד תרגול.",
              },
            },
            readiness: { readiness: "ready" },
            confidence: { confidenceBand: "high" },
            decision: { cannotConcludeYet: false },
          },
        },
      ],
    },
  ],
};

const tp = buildTruthPacketV1(truthPayload, {
  scopeType: "topic",
  scopeId: "fractions::grade:g4",
  scopeLabel: "שברים",
});
assert("truth packet built for topic scope", !!tp && !!tp.surfaceFacts);
assert(
  "truth packet surfaceFacts exposes evidenceSources",
  Array.isArray(tp?.surfaceFacts?.evidenceSources) && tp.surfaceFacts.evidenceSources.length === 2,
  JSON.stringify(tp?.surfaceFacts?.evidenceSources)
);
assert(
  "truth packet surfaceFacts primaryEvidenceSource = parent_assigned_activity",
  tp?.surfaceFacts?.primaryEvidenceSource === EVIDENCE_SOURCE.PARENT_ASSIGNED,
  `got ${tp?.surfaceFacts?.primaryEvidenceSource}`
);
assert(
  "truth packet still carries gradeRelation (regression)",
  tp?.surfaceFacts?.gradeRelation === "higher",
  `got ${tp?.surfaceFacts?.gradeRelation}`
);

// ---------------------------------------------------------------------------
// Part 5: insights/recommendation phrasing layer (grade scope + evidence source)
// ---------------------------------------------------------------------------

// Import composers FIRST so it is the entry of its own import graph. The copilot
// modules have a pre-existing benign cycle (contract -> topic-evidence-answer ->
// composers -> contract); entering via composers initializes ANSWER_CONTRACT in the
// correct order, while entering via contract first would hit a TDZ on ANSWER_CONTRACT.
const composersMod = await import(
  new URL("../utils/parent-copilot/intent-answer-composers.js", import.meta.url).href
);
const contractMod = await import(
  new URL("../utils/parent-copilot/intent-answer-contract.js", import.meta.url).href
);
const insightMod = await import(
  new URL("../utils/parent-report-language/grade-insight-he.js", import.meta.url).href
);
const recMod = await import(
  new URL("../utils/parent-report-recommendation-consistency.js", import.meta.url).href
);

const { gradeScopeMeaningHe, evidenceSourcePhraseHe, masteryReallocationHe } = insightMod;
const { resolveUnitParentActionHe } = recMod;
const { resolveAnswerContract, ANSWER_CONTRACT } = contractMod;
const { tryComposeIntentAnswer } = composersMod;

// 5a. helper phrasing
assert(
  "gradeScopeMeaningHe lower+needsSupport => foundation framing",
  gradeScopeMeaningHe({ gradeRelation: "lower", needsSupport: true }).includes("מתחת לכיתה הרשומה") &&
    gradeScopeMeaningHe({ gradeRelation: "lower", needsSupport: true }).includes("יסודות"),
  gradeScopeMeaningHe({ gradeRelation: "lower", needsSupport: true })
);
assert(
  "gradeScopeMeaningHe higher+isStrength => enrichment/advance",
  gradeScopeMeaningHe({ gradeRelation: "higher", isStrength: true }).includes("מעל רמת הכיתה") &&
    gradeScopeMeaningHe({ gradeRelation: "higher", isStrength: true }).includes("להעלות קושי"),
  gradeScopeMeaningHe({ gradeRelation: "higher", isStrength: true })
);
assert(
  "gradeScopeMeaningHe same+isStrength => mastery/advance",
  gradeScopeMeaningHe({ gradeRelation: "same", isStrength: true }).includes("שליטה טובה ברמת הכיתה"),
  gradeScopeMeaningHe({ gradeRelation: "same", isStrength: true })
);
assert(
  "evidenceSourcePhraseHe parent hidden from parent-facing copy",
  evidenceSourcePhraseHe("parent_assigned_activity") === ""
);
assert("evidenceSourcePhraseHe unknown => empty", evidenceSourcePhraseHe("xyz") === "");
assert("masteryReallocationHe mentions reallocating time", masteryReallocationHe("שברים").includes("להפנות"));

// 5b. recommendation layer appends grade-scope insight (higher + strength)
const strengthHigherUnit = {
  subjectId: "math",
  displayName: "שברים",
  canonicalState: {
    actionState: "maintain",
    recommendation: { allowed: true, family: "maintain" },
    evidence: { positiveAuthorityLevel: "very_good" },
  },
  gradeEvidence: { gradeRelation: "higher", evidenceScope: "enrichment_stretch" },
};
const actHigher = resolveUnitParentActionHe(strengthHigherUnit, "g4");
assert(
  "resolveUnitParentActionHe appends enrichment insight for higher+strength",
  typeof actHigher === "string" && actHigher.includes("מעל רמת הכיתה"),
  String(actHigher)
);

// 5c. Copilot contract routing for progression family
const progQuestions = [
  "איפה אפשר להתקדם?",
  "האם כדאי לעלות רמה?",
  "האם כדאי לרדת רמה בשברים?",
  "האם יש נושא שהילד כבר שולט בו?",
  "האם הילד עובד מעל הכיתה שלו?",
  "האם הילד מתקשה גם מתחת לכיתה שלו?",
  "האם כדאי להתמקד בנושא אחר?",
];
for (const u of progQuestions) {
  const c = resolveAnswerContract({ utteranceStr: u, scopeType: "executive", stageAIntent: "", payload: {} });
  assert(`contract(progression) for "${u}"`, c === ANSWER_CONTRACT.progression, `got ${c}`);
}
assert(
  'regression: "מה המקצוע החזק?" stays strength',
  resolveAnswerContract({ utteranceStr: "מה המקצוע החזק?", scopeType: "executive", stageAIntent: "", payload: {} }) ===
    ANSWER_CONTRACT.strength
);

// 5d. composeProgression end-to-end (executive scope)
const progPayload = {
  registeredGradeKey: "g3",
  subjectProfiles: [
    {
      subject: "math",
      subjectQuestionCount: 50,
      topicRecommendations: [
        {
          topicRowKey: "fractions::grade:g4",
          displayName: "שברים",
          questions: 26,
          accuracy: 92,
          rowIdentityV1: {
            contentGradeKey: "g4",
            gradeRelation: "higher",
            primaryEvidenceSource: "parent_assigned_activity",
            evidenceSources: ["parent_assigned_activity"],
          },
        },
        {
          topicRowKey: "division::grade:g3",
          displayName: "חילוק",
          questions: 14,
          accuracy: 40,
          rowIdentityV1: { contentGradeKey: "g3", gradeRelation: "same", primaryEvidenceSource: "self_practice" },
        },
        {
          topicRowKey: "counting::grade:g2",
          displayName: "מנייה",
          questions: 10,
          accuracy: 35,
          rowIdentityV1: { contentGradeKey: "g2", gradeRelation: "lower", primaryEvidenceSource: "parent_assigned_activity" },
        },
      ],
    },
  ],
};
const execPacket = { scopeType: "executive", scopeId: "", surfaceFacts: {} };
const answerText = (a) => (a?.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");

const aAdvance = tryComposeIntentAnswer({ utteranceStr: "איפה אפשר להתקדם?", truthPacket: execPacket, payload: progPayload });
assert("progression advance uses progression contract", aAdvance?.answerContract === ANSWER_CONTRACT.progression, JSON.stringify(aAdvance?.answerContract));
assert("progression advance mentions advancing/leveling up", /להתקדם|להעלות קושי|מעל רמת הכיתה/u.test(answerText(aAdvance)), answerText(aAdvance));

const aAbove = tryComposeIntentAnswer({ utteranceStr: "האם הילד עובד מעל הכיתה שלו?", truthPacket: execPacket, payload: progPayload });
assert("above-grade answers yes with higher rows", answerText(aAbove).includes("מעל הכיתה הרשומה"), answerText(aAbove));

const aBelow = tryComposeIntentAnswer({ utteranceStr: "האם הילד מתקשה גם מתחת לכיתה שלו?", truthPacket: execPacket, payload: progPayload });
assert("below-grade detects lower weak topic", answerText(aBelow).includes("מתחת לכיתה הרשומה") && answerText(aBelow).includes("מנייה"), answerText(aBelow));

const aElse = tryComposeIntentAnswer({ utteranceStr: "האם כדאי להתמקד בנושא אחר?", truthPacket: execPacket, payload: progPayload });
assert("focus-elsewhere suggests reallocating time", answerText(aElse).includes("להפנות"), answerText(aElse));

// 5e. composeStrength is now gradeRelation-aware
const aStrength = tryComposeIntentAnswer({ utteranceStr: "מה המקצוע החזק?", truthPacket: execPacket, payload: progPayload });
assert("strength contract used", aStrength?.answerContract === ANSWER_CONTRACT.strength, JSON.stringify(aStrength?.answerContract));
assert("strength next-step is no longer conservative-only for higher+strength", /מעל רמת הכיתה|להעלות קושי/u.test(answerText(aStrength)), answerText(aStrength));
assert(
  "strength does not surface parent source phrase (internal provenance policy)",
  !answerText(aStrength).includes("בפעילות שנשלחה מההורה"),
  answerText(aStrength)
);

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error(`FAILED ${failures.length} / ${passed + failures.length}`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`PASSED all ${passed} checks`);
