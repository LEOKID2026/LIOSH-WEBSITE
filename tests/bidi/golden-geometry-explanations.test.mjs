import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import path from "node:path";
import {
  flattenTemplateRuns,
  assertNotForbiddenLearningMath,
} from "../../lib/learning-book/learning-math-line-templates.js";
import { mix, M, unwrapLearningRuns } from "../../lib/learning-book/learning-math-line-build.js";

const ROOT = path.resolve(import.meta.dirname, "../..");

function runNodeVerify(scriptRel) {
  const script = path.join(ROOT, scriptRel);
  const r = spawnSync(`node "${script}"`, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  assert.equal(
    r.status,
    0,
    `verify script failed (${scriptRel}):\n${r.stdout}\n${r.stderr}`
  );
}

function mathFromLine(line) {
  const runs = unwrapLearningRuns(line);
  return runs.find((r) => r.type === "math")?.value;
}

function flatFromLine(line) {
  return flattenTemplateRuns(unwrapLearningRuns(line));
}

test("geometry getSolutionSteps integration (node harness)", () => {
  runNodeVerify("scripts/repair/verify-geometry-explanation-steps.mjs");
});

test("geometry circle area uses A = πr² pattern", () => {
  const line = mix`שטח: ${M("A = πr²")} עם ${M("π ≈ 3.14")}`;
  assert.equal(mathFromLine(line), "A = πr²");
  const flat = flatFromLine(line);
  assert.match(flat, /π ≈ 3.14/);
  assertNotForbiddenLearningMath(flat);
});

test("geometry structured golden formulas", () => {
  for (const { line, math } of [
    { line: mix`זוויות: ${M("52° + 101°")}`, math: "52° + 101°" },
    { line: mix`חסר: ${M("180° - 60° - 70° = 50°")}`, math: "180° - 60° - 70° = 50°" },
    { line: mix`${M("12 ס״מ")}`, math: "12 ס״מ" },
    { line: mix`${M("24 סמ״ר")}`, math: "24 סמ״ר" },
    { line: mix`${M("3 מ״ר")}`, math: "3 מ״ר" },
    { line: mix`${M("π ≈ 3.14")}`, math: "π ≈ 3.14" },
    { line: mix`שטח משולש: ${M("(12 × 5) ÷ 2 = 30")}`, math: "(12 × 5) ÷ 2 = 30" },
    { line: mix`נוסחה: ${M("((בסיס 1 + בסיס 2) × גובה) ÷ 2")}`, math: "((בסיס 1 + בסיס 2) × גובה) ÷ 2" },
    { line: mix`היקף: ${M("2 × (אורך + רוחב)")}`, math: "2 × (אורך + רוחב)" },
  ]) {
    assert.equal(mathFromLine(line), math, flatFromLine(line));
    assertNotForbiddenLearningMath(flatFromLine(line));
  }
});
