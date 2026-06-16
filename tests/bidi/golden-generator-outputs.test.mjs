import assert from "node:assert/strict";
import test from "node:test";
import {
  flattenTemplateRuns,
  assertNotForbiddenLearningMath,
} from "../../lib/learning-book/learning-math-line-templates.js";
import { mix, M, unwrapLearningRuns } from "../../lib/learning-book/learning-math-line-build.js";
import { buildComparisonSignWrongAnswerRuns } from "../../utils/comparison-sign-mcq.js";
import { buildAdditionOrSubtractionAnimation } from "../../utils/math-animations.js";

function mathFromLine(line) {
  const runs = unwrapLearningRuns(line);
  return runs.find((r) => r.type === "math")?.value;
}

function flatFromLine(line) {
  return flattenTemplateRuns(unwrapLearningRuns(line));
}

test("comparison conclusion runs 735 > 708", () => {
  const runs = buildComparisonSignWrongAnswerRuns({
    params: { a: 735, b: 708 },
    correctAnswer: ">",
  });
  const flat = flattenTemplateRuns(runs);
  assert.match(flat, /735 > 708/);
  assert.match(flat, /735 גדול מ-708/);
  assertNotForbiddenLearningMath(flat);
});

test("addition animation column step math island", () => {
  const steps = buildAdditionOrSubtractionAnimation(58, 37, 95, "addition");
  const columnStep = steps.find((s) => String(s.id || "").startsWith("step-"));
  assert.ok(columnStep?.runs?.length);
  const math = columnStep.runs.find((r) => r.type === "math")?.value;
  assert.equal(math, "8 + 7 = 15");
  assertNotForbiddenLearningMath(flattenTemplateRuns(columnStep.runs));
});

test("half animation calc uses 12 ÷ 2 = 6 template", () => {
  const line = mix`חצי: ${M("12 ÷ 2 = 6")}`;
  assert.equal(mathFromLine(line), "12 ÷ 2 = 6");
});

test("structured mix templates golden", () => {
  for (const { line, math } of [
    { line: mix`${M("100 + 20 + 4 = 124")}`, math: "100 + 20 + 4 = 124" },
    { line: mix`${M("400 + 0 + 5 = 405")}`, math: "400 + 0 + 5 = 405" },
    { line: mix`${M("58 + 37 = 95")}`, math: "58 + 37 = 95" },
    { line: mix`${M("80 + 15 = 95")}`, math: "80 + 15 = 95" },
    { line: mix`${M("6 + 6 = 12")}`, math: "6 + 6 = 12" },
    { line: mix`${M("12 ÷ 2 = 6")}`, math: "12 ÷ 2 = 6" },
    { line: mix`חצי: ${M("12 ÷ 2 = 6")}`, math: "12 ÷ 2 = 6" },
    { line: mix`${M("735 > 708")}`, math: "735 > 708" },
    { line: mix`${M("708 < 735")}`, math: "708 < 735" },
    { line: mix`${M("π ≈ 3.14")}`, math: "π ≈ 3.14" },
    { line: mix`${M("A = πr²")}`, math: "A = πr²" },
    { line: mix`${M("10%")} מתוך 490`, math: "10%" },
    { line: mix`${M("3/4")}`, math: "3/4" },
    { line: mix`${M("52° + 101°")}`, math: "52° + 101°" },
    { line: mix`${M("12 ס״מ")}`, math: "12 ס״מ" },
    { line: mix`${M("24 סמ״ר")}`, math: "24 סמ״ר" },
    { line: mix`${M("1,000")}`, math: "1,000" },
  ]) {
    assert.equal(mathFromLine(line), math, flatFromLine(line));
    assertNotForbiddenLearningMath(flatFromLine(line));
  }
});
