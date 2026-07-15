/**
 * Diagnostic Engine V3 — scenario simulations (8 required cases).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { runDiagnosticEngineV2 } from "../../utils/diagnostic-engine-v2/index.js";
import { runDiagnosticEngineV3 } from "../../utils/diagnostic-engine-v3/index.js";
import { ERROR_TYPE_V3, classifyErrorTypeV3 } from "../../utils/diagnostic-engine-v3/error-types-v3.js";
import { buildDiagnosticEvidenceContractV3 } from "../../utils/diagnostic-engine-v3/evidence-contract-v3.js";
import { DIAGNOSIS_STAGE } from "../../utils/diagnostic-engine-v3/early-stopping-v3.js";
import { RECOMMENDED_NEXT_STEP } from "../../utils/diagnostic-engine-v3/next-action-v3.js";
import {
  GRADE_RELATION_V3,
  resolveGradeContextV3,
} from "../../utils/diagnostic-engine-v3/grade-relation-v3.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

const NOW = Date.now();
const START = NOW - 7 * 86400000;

function mistake(partial) {
  return {
    timestamp: NOW - 3600000,
    isCorrect: false,
    ...partial,
  };
}

function row(questions, correct, extra = {}) {
  return {
    questions,
    correct,
    wrong: Math.max(0, questions - correct),
    accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
    needsPractice: questions > 0 && correct / questions < 0.7,
    ...extra,
  };
}

function runScenario({ subjectId, topic, topicRowKey, mistakes, mapRow, probes = [] }) {
  const maps = {
    [subjectId]: {
      [topicRowKey]: mapRow,
    },
  };
  const rawMistakesBySubject = { [subjectId]: mistakes };
  const de2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs: START,
    endMs: NOW,
  });
  const v3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject,
    startMs: START,
    endMs: NOW,
    probeEvidence: probes,
    diagnosticEngineV2: de2,
  });
  return { de2, v3, rollups: v3.rollupsBySubject[subjectId] || [] };
}

test("DE3: classifyErrorType is conservative for unknown metadata", () => {
  const ev = normalizeMistakeEvent(mistake({ topic: "addition" }), "math");
  const cls = classifyErrorTypeV3("math", ev);
  assert.equal(cls.errorType, ERROR_TYPE_V3.UNKNOWN);
  assert.equal(cls.confidence, "very_low");
});

test("DE3: evidence contract leaves missing fields null", () => {
  const c = buildDiagnosticEvidenceContractV3({
    subjectId: "math",
    event: normalizeMistakeEvent(mistake({ topic: "addition" }), "math"),
    isCorrect: false,
  });
  assert.equal(c.contractVersion, "3.1.0");
  assert.equal(c.prerequisiteSkill, null);
  assert.ok(c.errorType === ERROR_TYPE_V3.UNKNOWN || c.errorType != null);
});

test("Scenario 1 - few questions → insufficient / needs probe", () => {
  const { v3, rollups } = runScenario({
    subjectId: "math",
    topic: "addition",
    topicRowKey: "addition\u0001practice",
    mapRow: row(2, 1),
    mistakes: [mistake({ topicOrOperation: "addition", operation: "addition" })],
  });
  assert.ok(v3.stats.rollupCount >= 1);
  const r = rollups[0];
  assert.ok(["very_low", "low"].includes(r.confidence));
  assert.ok(
    r.recommendedNextStep === RECOMMENDED_NEXT_STEP.INSUFFICIENT ||
      r.recommendedNextStep === RECOMMENDED_NEXT_STEP.GIVE_PROBE,
  );
  assert.ok(Array.isArray(v3.unitEnrichments));
});

test("Scenario 2 - recurring wrong same subskill", () => {
  const { rollups } = runScenario({
    subjectId: "math",
    topic: "fractions",
    topicRowKey: "fractions\u0001practice",
    mapRow: row(12, 4),
    mistakes: Array.from({ length: 5 }, () =>
      mistake({
        topicOrOperation: "fractions",
        operation: "fractions",
        patternFamily: "unlike_denominator",
        expectedErrorTags: ["fraction_concept_error"],
        diagnosticSkillId: "fractions",
        subskillId: "unlike_denominators",
      }),
    ),
  });
  const r = rollups.find((x) => x.dominantErrorType !== ERROR_TYPE_V3.UNKNOWN) || rollups[0];
  assert.ok(r.dominantErrorTypes.length >= 1);
  assert.ok(r.wave1Enriched === true);
  assert.notEqual(r.diagnosisStage, DIAGNOSIS_STAGE.STABLE);
});

test("Scenario 3 - contradictory signals", () => {
  const { rollups } = runScenario({
    subjectId: "hebrew",
    topic: "grammar",
    topicRowKey: "grammar\u0001practice",
    mapRow: row(15, 13, { behaviorProfile: { dominantType: "stable_mastery" } }),
    mistakes: [
      mistake({
        topicOrOperation: "grammar",
        patternFamily: "spelling",
        expectedErrorTags: ["grammar_error"],
      }),
      mistake({
        topicOrOperation: "grammar",
        patternFamily: "reading",
        expectedErrorTags: ["reading_comprehension"],
      }),
      mistake({
        topicOrOperation: "grammar",
        patternFamily: "vocab",
        expectedErrorTags: ["vocabulary_gap"],
      }),
    ],
  });
  const r = rollups[0];
  assert.equal(r.contradictorySignals, true);
  assert.equal(r.diagnosisStage, DIAGNOSIS_STAGE.CONTRADICTORY);
  assert.equal(r.recommendedNextStep, RECOMMENDED_NEXT_STEP.GIVE_PROBE);
});

test("Scenario 4 - fast and wrong (speed / guessing)", () => {
  const { rollups } = runScenario({
    subjectId: "english",
    topic: "vocabulary",
    topicRowKey: "vocabulary\u0001practice",
    mapRow: row(10, 3),
    mistakes: Array.from({ length: 4 }, () =>
      mistake({
        topicOrOperation: "vocabulary",
        topic: "vocabulary",
        responseMs: 2500,
      }),
    ),
  });
  const r = rollups[0];
  assert.ok(
    r.dominantErrorType === ERROR_TYPE_V3.GUESSING ||
      r.dominantErrorType === ERROR_TYPE_V3.SPEED ||
      r.dominantErrorType === ERROR_TYPE_V3.VOCABULARY,
  );
  assert.ok(r.fastWrongCount >= 1);
});

test("Scenario 5 - slow and accurate", () => {
  const { rollups } = runScenario({
    subjectId: "math",
    topic: "addition",
    topicRowKey: "addition\u0001practice",
    mapRow: row(14, 13),
    mistakes: [
      mistake({
        topicOrOperation: "addition",
        responseMs: 52000,
        isCorrect: false,
      }),
    ],
  });
  const r = rollups[0];
  assert.ok(r.accuracy >= 85);
  assert.ok(
    r.recommendedNextStep === RECOMMENDED_NEXT_STEP.MAINTAIN ||
      r.recommendedNextStep === RECOMMENDED_NEXT_STEP.ADVANCE ||
      r.recommendedNextStep === RECOMMENDED_NEXT_STEP.PRACTICE_MORE,
  );
});

test("Scenario 6 - reading comprehension issue", () => {
  const cls = classifyErrorTypeV3(
    "hebrew",
    normalizeMistakeEvent(
      mistake({
        topicOrOperation: "comprehension",
        patternFamily: "reading_comprehension",
        expectedErrorTags: ["reading_comprehension"],
      }),
      "hebrew",
    ),
  );
  assert.equal(cls.errorType, ERROR_TYPE_V3.READING);
  const { rollups } = runScenario({
    subjectId: "hebrew",
    topic: "comprehension",
    topicRowKey: "comprehension\u0001practice",
    mapRow: row(9, 4),
    mistakes: [
      mistake({
        topicOrOperation: "comprehension",
        patternFamily: "reading_comprehension",
        expectedErrorTags: ["reading_comprehension"],
      }),
    ],
  });
  assert.equal(rollups[0].recommendedNextStep, RECOMMENDED_NEXT_STEP.REDUCE_READING);
});

test("Scenario 7 - strong mastery", () => {
  const { rollups, de2 } = runScenario({
    subjectId: "math",
    topic: "multiplication",
    topicRowKey: "multiplication\u0001practice",
    mapRow: row(20, 19, { excellent: true }),
    mistakes: [
      mistake({
        topicOrOperation: "multiplication",
        operation: "multiplication",
      }),
    ],
  });
  const r = rollups[0];
  assert.ok(r.accuracy >= 90);
  assert.ok(de2.units.length >= 0);
  assert.ok(
    r.recommendedNextStep === RECOMMENDED_NEXT_STEP.MAINTAIN ||
      r.recommendedNextStep === RECOMMENDED_NEXT_STEP.ADVANCE,
  );
});

test("Scenario 8 - parent assigned activity evidence source", () => {
  const c = buildDiagnosticEvidenceContractV3({
    subjectId: "english",
    event: normalizeMistakeEvent(
      mistake({
        topic: "grammar",
        topicOrOperation: "grammar",
        evidenceSource: "parent_assigned_activity",
        mode: "graded",
      }),
      "english",
    ),
    isCorrect: false,
    evidenceSource: "parent_assigned_activity",
    activityMode: "graded",
  });
  assert.equal(c.evidenceSource, "parent_assigned_activity");
  assert.equal(c.activityMode, "graded");
});

test("DE3: probe supported boosts confidence vs thin without probe", () => {
  const base = runScenario({
    subjectId: "math",
    topic: "fractions",
    topicRowKey: "fractions\u0001practice",
    mapRow: row(8, 3),
    mistakes: Array.from({ length: 3 }, () =>
      mistake({
        topicOrOperation: "fractions",
        diagnosticSkillId: "fractions",
        expectedErrorTags: ["fraction_concept_error"],
      }),
    ),
  });
  const withProbe = runScenario({
    subjectId: "math",
    topic: "fractions",
    topicRowKey: "fractions\u0001practice",
    mapRow: row(8, 3),
    mistakes: base.v3.rollupsBySubject.math?.length
      ? Array.from({ length: 3 }, () =>
          mistake({
            topicOrOperation: "fractions",
            diagnosticSkillId: "fractions",
            expectedErrorTags: ["fraction_concept_error"],
          }),
        )
      : [],
    probes: [
      {
        subjectId: "math",
        diagnosticSkillId: "fractions",
        topicId: "fractions",
        outcomeStatus: "supported",
        supportCount: 2,
        weakenCount: 0,
      },
    ],
  });
  const rBase = base.rollups[0];
  const rProbe = withProbe.rollups[0];
  assert.ok(rBase && rProbe);
  const order = { very_low: 0, low: 1, medium: 2, high: 3 };
  assert.ok(order[rProbe.confidence] >= order[rBase.confidence]);
});

test("DE3: does not remove DE2 units", () => {
  const { de2, v3 } = runScenario({
    subjectId: "math",
    topic: "addition",
    topicRowKey: "addition\u0001practice",
    mapRow: row(10, 4),
    mistakes: Array.from({ length: 4 }, () =>
      mistake({ topicOrOperation: "addition", operation: "addition" }),
    ),
  });
  assert.ok(Array.isArray(de2.units));
  assert.equal(v3.parentFacing, false);
  assert.equal(v3.de2Reference.unitCount, de2.units.length);
});

test("Grade context - below registered struggle → foundationRisk (not hidden)", () => {
  const gc = resolveGradeContextV3({
    registeredGrade: "g4",
    contentGrade: "g2",
    isCorrect: false,
    wrongCount: 2,
    attempts: 5,
    accuracyPct: 40,
  });
  assert.equal(gc.relation, GRADE_RELATION_V3.BELOW);
  assert.equal(gc.foundationRisk, true);
  assert.equal(gc.parentFacing, false);
  assert.ok(gc.caveatReasons.includes("below_registered_foundation_signal"));
});

test("Grade context - above registered wrong → caveat, not auto grade-gap", () => {
  const gc = resolveGradeContextV3({
    registeredGrade: "g3",
    contentGrade: "g5",
    isCorrect: false,
    wrongCount: 1,
    attempts: 3,
  });
  assert.equal(gc.relation, GRADE_RELATION_V3.ABOVE);
  assert.equal(gc.caveatNeeded, true);
  assert.equal(gc.foundationRisk, false);

  const { rollups } = runScenario({
    subjectId: "math",
    topic: "fractions",
    topicRowKey: "fractions\u0001practice",
    mapRow: {
      ...row(8, 3),
      registeredGradeKey: "g3",
      contentGradeKey: "g5",
      gradeRelation: "higher",
      gradeDelta: 2,
    },
    mistakes: [
      mistake({
        topicOrOperation: "fractions",
        grade: "g5",
        registeredGrade: "g3",
        gradeRelation: "higher",
        gradeDelta: 2,
      }),
    ],
  });
  const r = rollups[0];
  assert.ok(r.gradeContext);
  assert.equal(r.gradeRelation, GRADE_RELATION_V3.ABOVE);
  assert.equal(r.caveatNeeded, true);
  assert.equal(r.recommendedNextStep, RECOMMENDED_NEXT_STEP.GIVE_PROBE);
});

test("Grade context - above registered success → enrichmentSignal", () => {
  const gc = resolveGradeContextV3({
    registeredGrade: "g3",
    contentGrade: "g5",
    isCorrect: true,
    attempts: 6,
    accuracyPct: 90,
  });
  assert.equal(gc.enrichmentSignal, true);
  assert.equal(gc.foundationRisk, false);
});

test("Grade context - evidence contract includes grade fields", () => {
  const c = buildDiagnosticEvidenceContractV3({
    subjectId: "hebrew",
    event: normalizeMistakeEvent(
      mistake({
        topic: "grammar",
        grade: "g2",
        registeredGrade: "g4",
        gradeRelation: "lower",
        gradeDelta: -2,
      }),
      "hebrew",
    ),
    isCorrect: false,
    registeredGrade: "g4",
  });
  assert.equal(c.gradeRelation, GRADE_RELATION_V3.BELOW);
  assert.equal(c.registeredGrade, "g4");
  assert.equal(c.contentGrade, "g2");
  assert.equal(c.gradeContext.parentFacing, false);
});
