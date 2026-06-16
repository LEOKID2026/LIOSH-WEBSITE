#!/usr/bin/env node
/** Integration checks for getAgeAppropriateExplanation via learning mode (run via npx tsx). */
import assert from "node:assert/strict";
import { flattenTemplateRuns, unwrapLearningRuns } from "../../lib/learning-book/learning-math-line-build.js";
import { getErrorExplanation } from "../../utils/math-explanations.js";

const FORBIDDEN = ["124 = 100 + 20 + 4", "405 = 400 + 0 + 5", "80 + 5 + 1 = 95"];

function assertNotForbiddenLearningMath(rendered) {
  const norm = String(rendered || "").replace(/\s+/g, " ").trim();
  for (const bad of FORBIDDEN) {
    if (norm.includes(bad)) throw new Error(`forbidden: ${bad}`);
  }
}

function flat(output) {
  return flattenTemplateRuns(unwrapLearningRuns(output));
}

function mathTextFromOutput(output) {
  return unwrapLearningRuns(output).find((r) => r.type === "math")?.value;
}

function check(name, fn) {
  try {
    fn();
    console.log("ok", name);
  } catch (e) {
    console.error("FAIL", name, e.message);
    process.exitCode = 1;
  }
}

check("g3 addition 140 + 77 = 217", () => {
  const out = getErrorExplanation(
    {
      operation: "addition",
      a: 140,
      b: 77,
      correctAnswer: 217,
      params: { a: 140, b: 77, kind: "add_two" },
    },
    "addition",
    200,
    "g3",
    { mode: "learning" }
  );
  assert.ok(out && typeof out === "object");
  assert.equal(mathTextFromOutput(out), "140 + 77 = 217");
  assert.match(flat(out), /140 \+ 77 = 217/);
  assertNotForbiddenLearningMath(flat(out));
});

check("g2 addition embeds operands", () => {
  const out = getErrorExplanation(
    {
      operation: "addition",
      a: 5,
      b: 3,
      correctAnswer: 8,
      params: { a: 5, b: 3 },
    },
    "addition",
    6,
    "g2",
    { mode: "learning" }
  );
  const f = flat(out);
  assert.match(f, /5/);
  assert.match(f, /8/);
  assertNotForbiddenLearningMath(f);
});

if (process.exitCode) process.exit(process.exitCode);
