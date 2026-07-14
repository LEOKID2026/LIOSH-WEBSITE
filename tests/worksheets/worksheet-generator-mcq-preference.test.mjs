/**
 * Worksheet generator MCQ preference — parent create tab only.
 * Run: node --test tests/worksheets/worksheet-generator-mcq-preference.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";
import {
  auditWorksheetPayloadForAnswerLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import {
  isWorksheetMcqOffered,
  isWorksheetMcqSupported,
  normalizePreferMcq,
} from "../../lib/worksheets/worksheet-mcq-preference.js";
import { buildWorksheetMathMcqOptions } from "../../lib/worksheets/worksheet-math-mcq-options.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("worksheet-generator-mcq-preference", () => {
  test("default preferMcq is false in hub form and generation", async () => {
    const hubSrc = readFileSync(
      join(ROOT, "components/worksheets/ParentWorksheetsHub.jsx"),
      "utf8"
    );
    assert.match(hubSrc, /preferMcq:\s*false/);

    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 6,
      seed: 501,
      mathPracticeFormat: "horizontal_add_sub",
      preferMcq: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.generation.preferMcq, false);
    assert.ok(result.worksheetPayload.questions.every((q) => !q.optionsHe?.length));
    assert.ok(result.worksheetPayload.questions.every((q) => q.questionType !== "mcq"));
  });

  test("addition with preferMcq=true returns optionsHe", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 6,
      seed: 712,
      mathPracticeFormat: "horizontal_add_sub",
      preferMcq: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.generation.preferMcq, true);
    assert.ok(result.worksheetPayload.questions.length >= 4);
    assert.ok(result.worksheetPayload.questions.every((q) => (q.optionsHe?.length || 0) >= 4));
    assert.ok(result.worksheetPayload.questions.every((q) => q.questionType === "mcq"));
    assert.equal(auditWorksheetPayloadForAnswerLeaks(result.worksheetPayload).pass, true);
  });

  test("multiplication with preferMcq=true is not blocked", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "multiplication",
      levelKey: "regular",
      count: 6,
      seed: 813,
      mathPracticeFormat: "basic_multiplication",
      preferMcq: true,
    });
    assert.equal(result.ok, true);
    assert.ok(result.worksheetPayload.questions.some((q) => q.optionsHe?.length >= 4));
  });

  test("division with preferMcq=true is not blocked", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g4",
      topicKey: "division",
      levelKey: "regular",
      count: 6,
      seed: 914,
      mathPracticeFormat: "basic_division",
      preferMcq: true,
    });
    assert.equal(result.ok, true);
    assert.ok(result.worksheetPayload.questions.some((q) => q.optionsHe?.length >= 4));
  });

  test("preferMcq true for geometry keeps MCQ options", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "geometry",
      gradeKey: "g3",
      topicKey: "area",
      levelKey: "regular",
      count: 4,
      seed: 303,
      preferMcq: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.generation.preferMcq, true);
    assert.ok(
      result.worksheetPayload.questions.some(
        (q) => q.questionType === "mcq" || q.questionType === "diagram_mcq"
      )
    );
  });

  test("preferMcq false for geometry strips choice options from printable payload", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "geometry",
      gradeKey: "g3",
      topicKey: "area",
      levelKey: "regular",
      count: 4,
      seed: 303,
      preferMcq: false,
    });
    assert.equal(result.ok, true);
    assert.ok(result.worksheetPayload.questions.every((q) => !q.optionsHe?.length));
  });

  test("refresh route preserves preferMcq in generate request", () => {
    const previewSrc = readFileSync(
      join(ROOT, "pages/parent/worksheets/preview.js"),
      "utf8"
    );
    const createSrc = readFileSync(
      join(ROOT, "components/worksheets/CreateWorksheetTab.jsx"),
      "utf8"
    );

    assert.match(previewSrc, /typeof gen\.preferMcq === "boolean"/);
    assert.match(createSrc, /WORKSHEET_UI_HE\.preferMcq/);
    assert.equal(createSrc.includes("disabled={!mcqSupported}"), false);
    assert.equal(createSrc.includes("worksheet-checkbox-card-disabled"), false);
  });

  test("math and geometry always offer MCQ checkbox", () => {
    assert.equal(isWorksheetMcqOffered("math"), true);
    assert.equal(isWorksheetMcqOffered("geometry"), true);
    assert.equal(isWorksheetMcqOffered("hebrew"), false);
    assert.equal(
      isWorksheetMcqSupported("math", "g3", "addition", "horizontal_add_sub"),
      true
    );
    assert.equal(normalizePreferMcq(undefined), undefined);
    assert.equal(normalizePreferMcq(false), false);
    assert.equal(normalizePreferMcq(true), true);
  });

  test("distractor builder returns four unique numeric options", () => {
    const opts = buildWorksheetMathMcqOptions(178);
    assert.ok(opts);
    assert.equal(opts.length, 4);
    assert.ok(opts.includes("178"));
    assert.equal(new Set(opts).size, 4);
  });
});
