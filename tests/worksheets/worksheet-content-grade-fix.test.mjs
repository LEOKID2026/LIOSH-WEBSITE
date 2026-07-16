/**
 * Worksheet content grade fix — forced kinds, 18 failures, guard layer.
 * Run: node --test tests/worksheets/worksheet-content-grade-fix.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  listWorksheetMathForcedKinds,
  isMathKindAllowedForGrade,
  pickWorksheetMathForcedKind,
} from "../../lib/worksheets/worksheet-math-kind-allowlist.js";
import { checkMathQuestionBounds } from "../../lib/worksheets/worksheet-math-content-bounds.server.js";
import { guardWorksheetQuestion } from "../../lib/worksheets/worksheet-content-guard.server.js";
import { selectMathWorksheetQuestions } from "../../lib/worksheets/worksheet-math-selector.server.js";
import { selectGeometryWorksheetQuestions } from "../../lib/worksheets/worksheet-geometry-selector.server.js";
import { selectHebrewWorksheetQuestions } from "../../lib/worksheets/worksheet-hebrew-selector.server.js";
import { selectEnglishWorksheetQuestions } from "../../lib/worksheets/worksheet-english-selector.server.js";
import { analyzePageUniformity } from "../../lib/worksheets/worksheet-page-consistency.server.js";
import { worksheetQuestionFingerprint } from "../../lib/worksheets/worksheet-fingerprint.server.js";
import { READY_WORKSHEET_CATALOG } from "../../lib/worksheets/worksheet-ready-catalog.js";

const PREVIOUSLY_FAILING = [
  { subjectId: "geometry", fn: selectGeometryWorksheetQuestions, args: { gradeKey: "g3", topicKey: "parallel_perpendicular", levelKey: "hard" } },
  { subjectId: "geometry", fn: selectGeometryWorksheetQuestions, args: { gradeKey: "g4", topicKey: "parallel_perpendicular", levelKey: "hard" } },
  { subjectId: "geometry", fn: selectGeometryWorksheetQuestions, args: { gradeKey: "g5", topicKey: "parallel_perpendicular", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g2", topicKey: "reading", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g3", topicKey: "speaking", levelKey: "medium" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g3", topicKey: "speaking", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g4", topicKey: "speaking", levelKey: "medium" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g4", topicKey: "speaking", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g5", topicKey: "speaking", levelKey: "medium" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g5", topicKey: "speaking", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g6", topicKey: "speaking", levelKey: "medium" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g6", topicKey: "speaking", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g5", topicKey: "writing", levelKey: "medium" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g5", topicKey: "writing", levelKey: "hard" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g6", topicKey: "writing", levelKey: "medium" } },
  { subjectId: "hebrew", fn: selectHebrewWorksheetQuestions, args: { gradeKey: "g6", topicKey: "writing", levelKey: "hard" } },
  { subjectId: "english", fn: selectEnglishWorksheetQuestions, args: { gradeKey: "g6", topicKey: "writing", levelKey: "medium" } },
  { subjectId: "english", fn: selectEnglishWorksheetQuestions, args: { gradeKey: "g6", topicKey: "writing", levelKey: "hard" } },
];

describe("worksheet-content-grade-fix", () => {
  test("g5 horizontal_add_sub forced kinds exclude g1-only kinds", () => {
    const kinds = listWorksheetMathForcedKinds({
      formatId: "horizontal_add_sub",
      gradeKey: "g5",
      topicKey: "addition",
    });
    assert.ok(!kinds.includes("add_tens_only"));
    assert.ok(!kinds.includes("add_second_decade"));
    assert.ok(kinds.includes("add_two") || kinds.includes("add_three"));
  });

  test("g1 horizontal_add_sub excludes add_three", () => {
    const kinds = listWorksheetMathForcedKinds({
      formatId: "horizontal_add_sub",
      gradeKey: "g1",
      topicKey: "addition",
    });
    assert.ok(!kinds.includes("add_three"));
    assert.ok(kinds.includes("add_tens_only") || kinds.includes("add_second_decade"));
  });

  test("pickWorksheetMathForcedKind rotates only allowed kinds", () => {
    for (let i = 0; i < 20; i += 1) {
      const kind = pickWorksheetMathForcedKind("horizontal_add_sub", i, "g5", "addition");
      assert.ok(isMathKindAllowedForGrade(kind, "g5"));
    }
  });

  test("g5 addition regular horizontal has no g1-only kinds in output", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g5",
      topicKey: "addition",
      levelKey: "medium",
      count: 12,
      seed: 5,
      mathPracticeFormat: "horizontal_add_sub",
    });
    for (const q of questions) {
      const kind = String(q.params?.kind || "");
      assert.ok(kind !== "add_tens_only", kind);
      assert.ok(kind !== "add_second_decade", kind);
    }
    const texts = questions.map((q) => String(q.question || ""));
    assert.ok(!texts.some((t) => t.includes("17 + 1") || t.includes("17+1")));
    assert.ok(!texts.some((t) => t.includes("10 + 50") || t.includes("10+50")));
  });

  test("g5 addition page avoids extreme spread", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g5",
      topicKey: "addition",
      levelKey: "medium",
      count: 12,
      seed: 5,
      mathPracticeFormat: "horizontal_add_sub",
    });
    const uni = analyzePageUniformity(questions, { subjectId: "math", topicKey: "addition" });
    assert.equal(uni.spreadExtreme, false, `ratio=${uni.ratio}`);
  });

  test("g1 addition horizontal excludes add_three", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g1",
      topicKey: "addition",
      levelKey: "medium",
      count: 12,
      seed: 42,
      mathPracticeFormat: "horizontal_add_sub",
    });
    assert.ok(questions.every((q) => q.params?.kind !== "add_three"));
  });

  test("all 18 previously failing combos generate 8 questions", () => {
    for (const row of PREVIOUSLY_FAILING) {
      const { questions } = row.fn({ ...row.args, count: 8, seed: 42 });
      assert.equal(questions.length, 8, JSON.stringify(row.args));
      const fps = new Set(
        questions.map((q) => worksheetQuestionFingerprint(q, row.subjectId))
      );
      assert.equal(fps.size, 8, `duplicates in ${JSON.stringify(row.args)}`);
    }
  });

  test("g2 and g3 english writing generate 8 questions", () => {
    for (const gradeKey of ["g2", "g3"]) {
      const { questions } = selectEnglishWorksheetQuestions({
        gradeKey,
        topicKey: "writing",
        levelKey: "medium",
        count: 8,
        seed: 42,
      });
      assert.equal(questions.length, 8, gradeKey);
    }
  });

  test("previously thin combos generate count 12 and 20", () => {
    const thinCombos = [
      { fn: selectGeometryWorksheetQuestions, subjectId: "geometry", args: { gradeKey: "g5", topicKey: "parallel_perpendicular", levelKey: "hard" } },
      { fn: selectGeometryWorksheetQuestions, subjectId: "geometry", args: { gradeKey: "g6", topicKey: "circles", levelKey: "medium" } },
      { fn: selectEnglishWorksheetQuestions, subjectId: "english", args: { gradeKey: "g4", topicKey: "writing", levelKey: "medium" } },
      { fn: selectEnglishWorksheetQuestions, subjectId: "english", args: { gradeKey: "g6", topicKey: "sentences", levelKey: "medium" } },
    ];
    for (const row of thinCombos) {
      for (const count of [12, 20]) {
        const { questions } = row.fn({ ...row.args, count, seed: 42 });
        assert.equal(questions.length, count, `${row.subjectId} ${count}`);
        const fps = new Set(questions.map((q) => worksheetQuestionFingerprint(q, row.subjectId)));
        assert.equal(fps.size, count, `duplicates ${row.subjectId} ${count}`);
      }
    }
  });

  test("ready catalog entries still generate", () => {
    for (const entry of READY_WORKSHEET_CATALOG) {
      const subjectId = entry.subjectId;
      let questions;
      if (subjectId === "math") {
        ({ questions } = selectMathWorksheetQuestions({
          gradeKey: entry.gradeKey,
          topicKey: entry.topicKey,
          levelKey: entry.levelKey,
          count: entry.count,
          seed: 42,
          mathPracticeFormat: entry.mathPracticeFormat,
        }));
      } else if (subjectId === "geometry") {
        ({ questions } = selectGeometryWorksheetQuestions({
          gradeKey: entry.gradeKey,
          topicKey: entry.topicKey,
          levelKey: entry.levelKey,
          count: entry.count,
          seed: 42,
        }));
      } else if (subjectId === "hebrew") {
        ({ questions } = selectHebrewWorksheetQuestions({
          gradeKey: entry.gradeKey,
          topicKey: entry.topicKey,
          levelKey: entry.levelKey,
          count: entry.count,
          seed: 42,
        }));
      } else if (subjectId === "english") {
        ({ questions } = selectEnglishWorksheetQuestions({
          gradeKey: entry.gradeKey,
          topicKey: entry.topicKey,
          levelKey: entry.levelKey,
          count: entry.count,
          seed: 42,
        }));
      }
      assert.ok(questions?.length >= entry.count, entry.id);
    }
  });

  test("guard rejects disallowed kind", () => {
    const bad = {
      question: "17 + 1 = __",
      correctAnswer: "18",
      subject: "math",
      topic: "addition",
      operation: "addition",
      gradeLevel: "g5",
      params: { kind: "add_second_decade", a: 17, b: 1 },
      a: 17,
      b: 1,
    };
    const result = guardWorksheetQuestion(bad, {
      subjectId: "math",
      gradeKey: "g5",
      topicKey: "addition",
      levelKey: "medium",
      sourceDifficulty: "medium",
      displayLevel: "regular",
      mathPracticeFormat: "horizontal_add_sub",
      seenFingerprints: new Set(),
      existingQuestions: [],
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "KIND_NOT_ALLOWED_FOR_GRADE");
  });

  test("bounds check flags too-easy g5 addition", () => {
    const bounds = checkMathQuestionBounds(
      { question: "17 + 1 = __", params: { kind: "add_two", a: 17, b: 1 }, a: 17, b: 1 },
      { gradeKey: "g5", topicKey: "addition", sourceDifficulty: "easy" }
    );
    assert.equal(bounds.ok, false);
  });
});
