/**
 * Evidence engine semantic tests — Omer regression + falsification matrix.
 * Run: node --test tests/learning/evidence-engine-semantic.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyMathNumericAnswer } from "../../lib/learning/classifiers/math-numeric-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/index.js";
import { buildQuestionEngineMetadataFromQuestion } from "../../lib/learning/question-engine-metadata.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import { evaluateEvidenceRecurrence, passesEvidenceRecurrenceRules } from "../../utils/diagnostic-engine-v2/evidence-recurrence.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { runDiagnosticEngineV2 } from "../../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js";
import { buildParentEvidenceStatements, gateParentPatternCopy } from "../../lib/learning/parent-report-evidence-pipeline.js";
import { applyMisconceptionAdaptiveAnswer, resolveMisconceptionAdaptiveQuestionTarget } from "../../lib/learning/misconception-adaptive-routing.js";
import { allTaxonomyIdsWithEvidenceRules } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { ALL_TAXONOMY_ROWS } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";

function makeAddThreeWrong(a, b, c, ts = Date.now()) {
  return normalizeMistakeEvent(
    {
      topic: "addition",
      topicOrOperation: "addition",
      bucketKey: "addition",
      isCorrect: false,
      userAnswer: a + b,
      correctAnswer: a + b + c,
      params: { kind: "add_three", a, b, c },
      misconceptionTag: "omitted_addend",
      timestamp: ts,
    },
    "math"
  );
}

function makeSubWrong(a, b, userAnswer, tag = null, ts = Date.now()) {
  return normalizeMistakeEvent(
    {
      topic: "subtraction",
      topicOrOperation: "subtraction",
      bucketKey: "subtraction",
      isCorrect: false,
      userAnswer,
      correctAnswer: a - b,
      params: { kind: "sub_two", a, b },
      ...(tag ? { misconceptionTag: tag, distractorFamily: tag } : {}),
      timestamp: ts,
    },
    "math"
  );
}

describe("math numeric classifier", () => {
  test("add_three omitted_addend — positive", () => {
    const hit = classifyMathNumericAnswer(67900, 101782, { kind: "add_three", a: 33002, b: 34898, c: 9782 }, "add_three");
    assert.equal(hit?.tag, "omitted_addend");
    assert.equal(hit?.evidenceType, "DIRECT_EVIDENCE");
  });

  test("subtraction diverse wrong answers — not add_instead_of_sub", () => {
    const answers = [999, 100, 50, 12, 7, 3, 880, 881];
    for (const ua of answers) {
      const hit = classifyMathNumericAnswer(ua, 33000 - 34898, { kind: "sub_two", a: 33000, b: 34898 }, "sub_two");
      assert.notEqual(hit?.tag, "add_instead_of_sub");
    }
  });

  test("subtraction a+b pattern — add_instead_of_sub", () => {
    const hit = classifyMathNumericAnswer(67898, -1898, { kind: "sub_two", a: 33000, b: 34898 }, "sub_two");
    assert.equal(hit?.tag, "add_instead_of_sub");
  });
});

describe("Omer regression — add_three omitted addend", () => {
  test("3/3 add_three wrong answers classify omitted_addend", () => {
    const cases = [
      [33002, 34898, 9782],
      [1200, 350, 450],
      [100, 200, 300],
    ];
    for (const [a, b, c] of cases) {
      const ev = classifyAnswerEvidence({
        subject: "math",
        topic: "addition",
        userAnswer: a + b,
        expectedAnswer: a + b + c,
        isCorrect: false,
        params: { kind: "add_three", a, b, c },
      });
      assert.equal(ev.detectedMisconception, "omitted_addend");
      assert.equal(ev.evidenceType, "DIRECT_EVIDENCE");
    }
  });

  test("M-08 recurrence with 3/3 evidence", () => {
    const wrongs = [
      makeAddThreeWrong(33002, 34898, 9782, Date.now() - 3000),
      makeAddThreeWrong(1200, 350, 450, Date.now() - 2000),
      makeAddThreeWrong(100, 200, 300, Date.now() - 1000),
    ];
    const m08 = TAXONOMY_BY_ID["M-08"];
    const rec = evaluateEvidenceRecurrence(wrongs, m08);
    assert.equal(rec.evidenceCount, 3);
    assert.ok(rec.recurrenceMet || rec.confirmed);
    assert.ok(passesEvidenceRecurrenceRules(wrongs, m08));
  });

  test("parent report shows observed pattern 3/3", () => {
    const wrongs = [
      makeAddThreeWrong(33002, 34898, 9782),
      makeAddThreeWrong(1200, 350, 450),
      makeAddThreeWrong(100, 200, 300),
    ];
    const pipeline = buildParentEvidenceStatements({
      questions: 3,
      correct: 0,
      wrong: 3,
      wrongEvents: wrongs,
      taxonomyId: "M-08",
    });
    const observed = pipeline.statements.find((s) => s.kind === "OBSERVED_PATTERN");
    assert.ok(observed);
    assert.match(observed.textHe, /3/);
    assert.equal(observed.evidenceRef.tag, "omitted_addend");
  });

  test("adaptive routing selects add_three probe/focus", () => {
    let state = applyMisconceptionAdaptiveAnswer({ patterns: {}, phase: "normal", activeTag: null, activeKind: null, recoveryStreak: 0 }, "omitted_addend", false);
    state = applyMisconceptionAdaptiveAnswer(state, "omitted_addend", false);
    assert.equal(state.phase, "probe");
    assert.equal(state.activeKind, "add_three");
    const target = resolveMisconceptionAdaptiveQuestionTarget(state, { operation: "addition" });
    assert.equal(target.preferKind, "add_three");
  });
});

describe("subtraction falsification — M-09 blocked without a+b evidence", () => {
  test("8 diverse wrong answers do not trigger M-09", () => {
    const wrongs = [999, 100, 50, 12, 7, 3, 880, 881].map((ua, i) =>
      makeSubWrong(33000, 34898, ua, null, Date.now() - i * 1000)
    );
    const m09 = TAXONOMY_BY_ID["M-09"];
    assert.equal(passesEvidenceRecurrenceRules(wrongs, m09), false);
    const rec = evaluateEvidenceRecurrence(wrongs, m09);
    assert.equal(rec.evidenceCount, 0);
  });

  test("DE2 does not choose M-09 without tag evidence", () => {
    const maps = {
      math: {
        "subtraction\u0001practice": {
          bucketKey: "subtraction",
          displayName: "חיסור",
          questions: 8,
          correct: 0,
          wrong: 8,
          accuracy: 0,
          needsPractice: true,
        },
      },
    };
    const raw = {
      math: [999, 100, 50, 12, 7, 3, 880, 881].map((ua, i) =>
        makeSubWrong(33000, 34898, ua, null, Date.now() - i * 1000)
      ),
    };
    const out = runDiagnosticEngineV2({
      maps,
      rawMistakesBySubject: raw,
      startMs: 0,
      endMs: Date.now() + 1000,
    });
    const unit = out.units[0];
    assert.notEqual(unit?.diagnosis?.taxonomyId, "M-09");
    assert.equal(unit?.classification?.weakFallbackBlocked || !unit?.diagnosis?.allowed, true);
  });

  test("M-09 copy gated without add_instead_of_sub", () => {
    const pipeline = buildParentEvidenceStatements({ questions: 8, correct: 0, wrong: 8, taxonomyId: "M-09" });
    const gated = gateParentPatternCopy("כיוון הפוך / הוספה במקום חיסור", pipeline);
    assert.equal(gated, null);
  });

  test("M-09 triggers when enough a+b answers", () => {
    const wrongs = [
      makeSubWrong(100, 20, 120, "add_instead_of_sub", Date.now() - 3000),
      makeSubWrong(200, 30, 230, "add_instead_of_sub", Date.now() - 2000),
      makeSubWrong(300, 40, 340, "add_instead_of_sub", Date.now() - 1000),
    ];
    const m09 = TAXONOMY_BY_ID["M-09"];
    assert.ok(passesEvidenceRecurrenceRules(wrongs, m09));
  });
});

describe("Hebrew/History ID collision resolved", () => {
  test("TAXONOMY_BY_ID H-01 resolves to Hebrew", () => {
    assert.equal(TAXONOMY_BY_ID["H-01"].subjectId, "hebrew");
  });

  test("TAXONOMY_BY_ID HI-01 resolves to History", () => {
    assert.equal(TAXONOMY_BY_ID["HI-01"].subjectId, "history");
  });

  test("no duplicate taxonomy ids in registry", () => {
    const ids = ALL_TAXONOMY_ROWS.map((r) => r.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(ids.length, 76);
  });

  test("all 76 rules have evidence requirements", () => {
    const ruleIds = allTaxonomyIdsWithEvidenceRules();
    assert.equal(ruleIds.length, 76);
    for (const row of ALL_TAXONOMY_ROWS) {
      assert.ok(ruleIds.includes(row.id), `missing evidence rule for ${row.id}`);
    }
  });
});

describe("question engine metadata wires classifier", () => {
  test("typed add_three wrong stores omitted_addend in engine metadata", () => {
    const q = {
      operation: "addition",
      correctAnswer: 101782,
      params: { kind: "add_three", a: 33002, b: 34898, c: 9782 },
    };
    const engine = buildQuestionEngineMetadataFromQuestion(q, {
      selectedValue: 67900,
      isCorrect: false,
      subject: "math",
      generatorSource: "test",
    });
    assert.equal(engine.misconceptionTag, "omitted_addend");
    assert.equal(engine.answerEvidence?.detectedMisconception, "omitted_addend");
  });
});
