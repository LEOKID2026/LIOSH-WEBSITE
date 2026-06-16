#!/usr/bin/env node
/** Integration checks for geometry getSolutionSteps (run via npx tsx). */
import assert from "node:assert/strict";
import { flattenTemplateRuns } from "../../lib/learning-book/learning-math-line-build.js";
import { getSolutionSteps as getGeometrySolutionSteps } from "../../utils/geometry-explanations.js";

const FORBIDDEN = ["124 = 100 + 20 + 4", "405 = 400 + 0 + 5", "80 + 5 + 1 = 95"];

function assertNotForbiddenLearningMath(rendered) {
  const norm = String(rendered || "").replace(/\s+/g, " ").trim();
  for (const bad of FORBIDDEN) {
    if (norm.includes(bad)) throw new Error(`forbidden: ${bad}`);
  }
}

function flatFromSteps(steps) {
  return steps.map((s) => String(s?.props?.["data-learning-flat"] ?? "")).join(" ");
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

check("triangle area", () => {
  const steps = getGeometrySolutionSteps(
    { shape: "triangle", correctAnswer: 30, params: { base: 12, height: 5 } },
    "area",
    "g4"
  );
  const joined = flatFromSteps(steps);
  assert.match(joined, /12 × 5 = 60/);
  assert.match(joined, /60 ÷ 2 = 30/);
  assertNotForbiddenLearningMath(joined);
});

check("angles 180 minus sum", () => {
  const steps = getGeometrySolutionSteps(
    { shape: "triangle", correctAnswer: 47, params: { angle1: 52, angle2: 81 } },
    "angles",
    "g5"
  );
  const joined = flatFromSteps(steps);
  assert.match(joined, /180° - \(52° \+ 81°\)/);
  assert.match(joined, /180° - 133° = 47°/);
  assertNotForbiddenLearningMath(joined);
});

check("rectangle perimeter 2×(L+W)", () => {
  const steps = getGeometrySolutionSteps(
    { shape: "rectangle", correctAnswer: 34, params: { length: 10, width: 7 } },
    "perimeter",
    "g4"
  );
  const joined = flatFromSteps(steps);
  assert.match(joined, /10 \+ 7 = 17/);
  assert.match(joined, /17 × 2 = 34/);
  assertNotForbiddenLearningMath(joined);
});

check("circle area pi formula in math island", () => {
  const steps = getGeometrySolutionSteps(
    { shape: "circle", correctAnswer: 78.5, params: { radius: 5 } },
    "area",
    "g5"
  );
  const joined = flatFromSteps(steps);
  assert.match(joined, /π × רדיוס²/);
  assert.match(joined, /3\.14 × 25 = 78\.5/);
  assertNotForbiddenLearningMath(joined);
});

if (process.exitCode) process.exit(process.exitCode);
