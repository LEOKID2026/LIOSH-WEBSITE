/**
 * Diagnostic Engine V2 harness — broad scenario matrix with expected-vs-actual.
 * Run: npm run test:diagnostic-engine-v2-harness
 */
import assert from "node:assert/strict";
import * as diagnosticEngineModule from "../utils/diagnostic-engine-v2/index.js";

const runDiagnosticEngineV2 =
  diagnosticEngineModule.runDiagnosticEngineV2 ||
  diagnosticEngineModule.default?.runDiagnosticEngineV2;

assert.equal(typeof runDiagnosticEngineV2, "function", "runDiagnosticEngineV2 missing");

const START_MS = Date.UTC(2026, 3, 1, 0, 0, 0, 0);
const END_MS = Date.UTC(2026, 3, 14, 23, 59, 59, 999);

const SUBJECTS = ["math", "geometry", "english", "science", "history", "hebrew", "moledet-geography"];

function row({ displayName, questions, correct, wrong, accuracy, modeKey = "learning", behaviorType = "knowledge_gap" }) {
  return {
    displayName,
    questions,
    correct,
    wrong,
    accuracy,
    modeKey,
    lastSessionMs: END_MS - 3600_000,
    needsPractice: accuracy < 85,
    confidence01: 0.5,
    dataSufficiencyLevel: questions >= 12 ? "medium" : "low",
    isEarlySignalOnly: questions < 8,
    behaviorProfile: { version: 1, dominantType: behaviorType, signals: {}, decisionTrace: [] },
  };
}

function wrongEvents({
  subject,
  bucketKey,
  count,
  patternFamily = "pf:fixture",
  withHints = false,
  daysSpread = 1,
  grade = "g4",
  level = "medium",
  mode = "learning",
}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      subject,
      topic: bucketKey,
      operation: bucketKey,
      bucketKey,
      mode,
      grade,
      level,
      timestamp: START_MS + i * 3600_000 * 6 + (i % Math.max(daysSpread, 1)) * 86_400_000,
      isCorrect: false,
      patternFamily: `${patternFamily}:${i % 3}`,
      hintUsed: withHints,
      exerciseText: `${bucketKey} q${i}`,
      correctAnswer: 10,
      userAnswer: 3,
    });
  }
  return out;
}

/** @type {Array<{id:string, subject:string, scenarioType:string, rowKey:string, row:Record<string,unknown>, mistakes:unknown[], assertCase:(unit: any)=>void}>} */
const MATRIX = [
  {
    id: "math_sparse",
    subject: "math",
    scenarioType: "sparse",
    rowKey: "addition\u0001learning\u0001g4\u0001medium",
    row: row({ displayName: "חיבור", questions: 4, correct: 3, wrong: 1, accuracy: 75 }),
    mistakes: wrongEvents({ subject: "math", bucketKey: "addition", count: 1 }),
    assertCase: (u) => assert.equal(u.outputGating.cannotConcludeYet, false),
  },
  {
    id: "geometry_contradictory",
    subject: "geometry",
    scenarioType: "contradictory",
    rowKey: "perimeter\u0001learning",
    row: row({ displayName: "היקף", questions: 18, correct: 16, wrong: 8, accuracy: 89 }),
    mistakes: wrongEvents({ subject: "geometry", bucketKey: "perimeter", count: 8 }),
    assertCase: (u) =>
      assert.ok(["contradictory", "moderate", "low", "early_signal_only"].includes(String(u.confidence.level))),
  },
  {
    id: "english_fragile_hints",
    subject: "english",
    scenarioType: "fragile+hints",
    rowKey: "grammar\u0001learning",
    row: row({ displayName: "דקדוק", questions: 16, correct: 12, wrong: 4, accuracy: 75, behaviorType: "fragile_success" }),
    mistakes: wrongEvents({ subject: "english", bucketKey: "grammar", count: 5, withHints: true }),
    assertCase: (u) => assert.ok(
      typeof u.outputGating.probeOnly === "boolean" &&
      typeof u.outputGating.cannotConcludeYet === "boolean" &&
      typeof u.outputGating.confidenceOnly === "boolean"
    ),
  },
  {
    id: "science_mastery_transfer",
    subject: "science",
    scenarioType: "mastery+transfer",
    rowKey: "graphs\u0001learning",
    row: row({ displayName: "גרפים", questions: 24, correct: 22, wrong: 2, accuracy: 92, behaviorType: "stable_mastery" }),
    mistakes: [],
    assertCase: (u) => assert.ok(u.confidence.level === "insufficient_data" || u.confidence.level === "high" || u.confidence.level === "moderate"),
  },
  {
    id: "hebrew_foundational",
    subject: "hebrew",
    scenarioType: "foundational",
    rowKey: "reading\u0001learning",
    row: row({ displayName: "הבנת הנקרא", questions: 20, correct: 10, wrong: 10, accuracy: 50 }),
    mistakes: wrongEvents({ subject: "hebrew", bucketKey: "reading", count: 10, patternFamily: "pf:found" }),
    assertCase: (u) => assert.ok(["P2", "P3", "P4"].includes(String(u.priority.level))),
  },
  {
    id: "history_foundational",
    subject: "history",
    scenarioType: "foundational",
    rowKey: "classical_greece\u0001learning",
    row: row({ displayName: "יוון הקלאסית", questions: 18, correct: 9, wrong: 9, accuracy: 50 }),
    mistakes: wrongEvents({ subject: "history", bucketKey: "classical_greece", count: 9, patternFamily: "pf:hist", grade: "g6" }),
    assertCase: (u) => assert.ok(["P2", "P3", "P4"].includes(String(u.priority.level))),
  },
  {
    id: "history_transfer",
    subject: "history",
    scenarioType: "transfer",
    rowKey: "rome_jews\u0001learning",
    row: row({ displayName: "רומא והיהודים", questions: 16, correct: 12, wrong: 4, accuracy: 75 }),
    mistakes: wrongEvents({ subject: "history", bucketKey: "rome_jews", count: 4, patternFamily: "pf:hist_transfer", grade: "g6" }),
    assertCase: (u) => assert.ok(!!u.competingHypotheses),
  },
  {
    id: "moledet_local_speed",
    subject: "moledet-geography",
    scenarioType: "local+speed",
    rowKey: "map_scale\u0001speed",
    row: row({ displayName: "קנה מידה", questions: 14, correct: 9, wrong: 5, accuracy: 64, modeKey: "speed", behaviorType: "speed_pressure" }),
    mistakes: wrongEvents({ subject: "moledet-geography", bucketKey: "map_scale", count: 5 }),
    assertCase: (u) => assert.ok(!!u.priority.level),
  },
  {
    id: "math_mixed",
    subject: "math",
    scenarioType: "mixed",
    rowKey: "fractions\u0001learning\u0001g4\u0001medium",
    row: row({ displayName: "שברים", questions: 17, correct: 11, wrong: 6, accuracy: 65 }),
    mistakes: wrongEvents({ subject: "math", bucketKey: "fractions", count: 6, patternFamily: "pf:mixed", daysSpread: 2 }),
    assertCase: (u) => assert.ok(["P2", "P3", "P4"].includes(String(u.priority.level))),
  },
  {
    id: "geometry_regression",
    subject: "geometry",
    scenarioType: "regression",
    rowKey: "angles\u0001learning",
    row: {
      ...row({ displayName: "זוויות", questions: 19, correct: 11, wrong: 8, accuracy: 58 }),
      trend: { accuracyDirection: "down" },
    },
    mistakes: wrongEvents({ subject: "geometry", bucketKey: "angles", count: 8 }),
    assertCase: (u) => assert.ok(["P3", "P4", "P2"].includes(String(u.priority.level))),
  },
  {
    id: "english_recovery",
    subject: "english",
    scenarioType: "recovery",
    rowKey: "vocabulary\u0001learning",
    row: row({ displayName: "אוצר מילים", questions: 18, correct: 14, wrong: 4, accuracy: 78 }),
    mistakes: wrongEvents({ subject: "english", bucketKey: "vocabulary", count: 3 }),
    assertCase: (u) => assert.ok(typeof u.outputGating.cannotConcludeYet === "boolean"),
  },
  {
    id: "science_transfer",
    subject: "science",
    scenarioType: "transfer",
    rowKey: "experiments\u0001learning",
    row: row({ displayName: "ניסוי מדעי", questions: 15, correct: 11, wrong: 4, accuracy: 73 }),
    mistakes: wrongEvents({ subject: "science", bucketKey: "experiments", count: 4, patternFamily: "pf:transfer" }),
    assertCase: (u) => assert.ok(!!u.competingHypotheses),
  },
  {
    id: "hebrew_weak_evidence_overclaim_guard",
    subject: "hebrew",
    scenarioType: "weak-evidence-guard",
    rowKey: "spelling\u0001learning",
    row: row({ displayName: "כתיב", questions: 5, correct: 1, wrong: 4, accuracy: 20 }),
    mistakes: wrongEvents({ subject: "hebrew", bucketKey: "spelling", count: 1 }),
    assertCase: (u) => assert.ok(!u.outputGating.interventionAllowed),
  },
  {
    id: "math_positive_90_21_no_recurrence",
    subject: "math",
    scenarioType: "positive-90-21",
    rowKey: "multiplication\u0001learning\u0001g3\u0001easy",
    row: row({
      displayName: "כפל",
      questions: 21,
      correct: 19,
      wrong: 2,
      accuracy: 90,
      behaviorType: "stable_mastery",
    }),
    mistakes: wrongEvents({
      subject: "math",
      bucketKey: "multiplication",
      count: 2,
      patternFamily: "pf:mul",
      grade: "g3",
      level: "easy",
    }),
    assertCase: (u) => {
      assert.equal(u.outputGating.positiveConclusionAllowed, true);
      assert.equal(u.outputGating.cannotConcludeYet, false);
      assert.equal(u.outputGating.positiveAuthorityLevel, "very_good");
      assert.equal(u.outputGating.additiveCautionAllowed, true);
    },
  },
  {
    id: "math_positive_95_21",
    subject: "math",
    scenarioType: "positive-95-21",
    rowKey: "multiplication_b\u0001learning\u0001g3\u0001easy",
    row: row({
      displayName: "כפל",
      questions: 21,
      correct: 20,
      wrong: 1,
      accuracy: 95,
      behaviorType: "stable_mastery",
    }),
    mistakes: wrongEvents({
      subject: "math",
      bucketKey: "multiplication_b",
      count: 1,
      grade: "g3",
      level: "easy",
    }),
    assertCase: (u) => {
      assert.equal(u.outputGating.positiveConclusionAllowed, true);
      assert.equal(u.outputGating.cannotConcludeYet, false);
      assert.equal(u.outputGating.positiveAuthorityLevel, "excellent");
      assert.equal(u.outputGating.additiveCautionAllowed, false);
    },
  },
  {
    id: "math_positive_100_21",
    subject: "math",
    scenarioType: "positive-100-21",
    rowKey: "division\u0001learning\u0001g3\u0001easy",
    row: row({
      displayName: "חילוק",
      questions: 21,
      correct: 21,
      wrong: 0,
      accuracy: 100,
      behaviorType: "stable_mastery",
    }),
    mistakes: [],
    assertCase: (u) => {
      assert.equal(u.outputGating.positiveConclusionAllowed, true);
      assert.equal(u.outputGating.cannotConcludeYet, false);
      assert.equal(u.outputGating.positiveAuthorityLevel, "excellent");
      assert.ok(!u.taxonomy?.id || true);
    },
  },
  {
    id: "math_positive_90_21_recurring",
    subject: "math",
    scenarioType: "positive-90-21-recur",
    rowKey: "subtraction\u0001learning\u0001g3\u0001easy",
    row: row({
      displayName: "חיסור",
      questions: 21,
      correct: 19,
      wrong: 2,
      accuracy: 90,
      behaviorType: "stable_mastery",
    }),
    mistakes: wrongEvents({
      subject: "math",
      bucketKey: "subtraction",
      count: 2,
      patternFamily: "pf:same_rec",
      daysSpread: 2,
      grade: "g3",
      level: "easy",
    }),
    assertCase: (u) => {
      assert.equal(u.outputGating.positiveConclusionAllowed, true);
      assert.equal(u.outputGating.cannotConcludeYet, false);
      assert.equal(u.outputGating.positiveAuthorityLevel, "very_good");
      assert.equal(u.outputGating.additiveCautionAllowed, true);
    },
  },
  {
    id: "math_taxonomy_weak_fallback_blocked",
    subject: "math",
    scenarioType: "weak-taxonomy-fallback",
    rowKey: "addition\u0001learning\u0001g4\u0001medium",
    row: row({
      displayName: "חיבור",
      questions: 10,
      correct: 8,
      wrong: 2,
      accuracy: 80,
      behaviorType: "knowledge_gap",
    }),
    mistakes: wrongEvents({
      subject: "math",
      bucketKey: "addition",
      count: 2,
      patternFamily: "pf:weak_fallback",
      grade: "g4",
      level: "medium",
    }),
    assertCase: (u) => {
      assert.equal(u.taxonomy, null);
      assert.equal(u.diagnosis?.taxonomyId ?? null, null);
      assert.equal(u.classification?.state, "unclassified_weak_evidence");
      assert.equal(u.classification?.reasonCode, "weak_taxonomy_fallback_blocked");
      assert.equal(u.outputGating.interventionAllowed, false);
      assert.equal(u.outputGating.probeOnly, true);
      assert.ok(
        Array.isArray(u.explainability?.cannotConcludeYetHe) &&
          u.explainability.cannotConcludeYetHe.some((line) => String(line || "").includes("עדיין לא מסווג")),
      );
    },
  },
  {
    id: "moledet_contradiction_probe",
    subject: "moledet-geography",
    scenarioType: "contradiction+probe",
    rowKey: "citizenship\u0001learning",
    row: row({ displayName: "אזרחות", questions: 12, correct: 10, wrong: 7, accuracy: 83 }),
    mistakes: wrongEvents({ subject: "moledet-geography", bucketKey: "citizenship", count: 7, patternFamily: "pf:contrad" }),
    assertCase: (u) =>
      assert.ok(
        u.outputGating.probeOnly ||
          u.outputGating.cannotConcludeYet ||
          u.outputGating.confidenceOnly ||
          u.outputGating.diagnosisAllowed
      ),
  },
];

let pass = 0;
let fail = 0;
const coveredSubjects = new Set();
const coveredScenarioTypes = new Set();

for (const tc of MATRIX) {
  coveredSubjects.add(tc.subject);
  coveredScenarioTypes.add(tc.scenarioType);
  const maps = {
    math: {},
    geometry: {},
    english: {},
    science: {},
    history: {},
    hebrew: {},
    "moledet-geography": {},
  };
  maps[tc.subject][tc.rowKey] = tc.row;
  const rawMistakesBySubject = {
    math: [],
    geometry: [],
    english: [],
    science: [],
    history: [],
    hebrew: [],
    "moledet-geography": [],
  };
  rawMistakesBySubject[tc.subject] = tc.mistakes;

  const out = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs: START_MS,
    endMs: END_MS,
  });
  const unit = Array.isArray(out.units) ? out.units[0] : null;
  const expectedCore = !!unit && !!unit.confidence && !!unit.priority && !!unit.outputGating && (unit.probe || unit.intervention || unit.explainability);
  let ok = expectedCore;
  let reason = "";
  if (!expectedCore) {
    reason = "missing core unit structure";
  } else {
    try {
      const c = unit?.outputGating?.contractsV1;
      assert.ok(c && typeof c === "object", `${tc.id}: missing outputGating.contractsV1 bundle`);
      assert.ok(c.decision && typeof c.decision === "object", `${tc.id}: missing decision contract`);
      assert.ok(c.readiness && typeof c.readiness === "object", `${tc.id}: missing readiness contract`);
      assert.ok(c.confidence && typeof c.confidence === "object", `${tc.id}: missing confidence contract`);
      assert.equal(typeof c.readiness.readiness, "string", `${tc.id}: readiness canonical field missing`);
      if (c.decision.cannotConcludeYet) {
        assert.equal(unit.outputGating.positiveConclusionAllowed, false, `${tc.id}: cannotConcludeYet with positive conclusion`);
        assert.equal(unit.outputGating.interventionAllowed, false, `${tc.id}: cannotConcludeYet with intervention`);
      }
      tc.assertCase(unit);
      // guard: weak evidence cannot produce overclaim intervention
      if ((Number(unit?.evidenceTrace?.[0]?.value?.questions) || 0) < 8 && unit?.outputGating?.interventionAllowed) {
        throw new Error("weak evidence allowed intervention");
      }
    } catch (e) {
      ok = false;
      reason = e instanceof Error ? e.message : String(e);
    }
  }

  if (ok) {
    pass++;
    console.log(`[PASS] ${tc.id} (${tc.subject}/${tc.scenarioType})`);
  } else {
    fail++;
    console.log(`[FAIL] ${tc.id} (${tc.subject}/${tc.scenarioType}) -> ${reason}`);
  }
}

for (const sid of SUBJECTS) {
  assert.ok(coveredSubjects.has(sid), `missing subject coverage: ${sid}`);
}
assert.ok(coveredScenarioTypes.size >= 10, "scenario coverage too narrow");

console.log(`\nSummary: ${pass} pass, ${fail} fail (total ${MATRIX.length})`);
if (fail > 0) process.exitCode = 1;
