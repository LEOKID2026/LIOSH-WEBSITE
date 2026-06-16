import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import path from "node:path";
import { assertNotForbiddenLearningMath } from "../../lib/learning-book/learning-math-line-templates.js";

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

test("getAgeAppropriateExplanation integration (node harness)", () => {
  runNodeVerify("scripts/repair/verify-age-explanation.mjs");
});

test("forbidden patterns rejected in age explanation flatten", () => {
  assert.throws(() => assertNotForbiddenLearningMath("124 = 100 + 20 + 4"), /forbidden/);
  assert.throws(() => assertNotForbiddenLearningMath("80 + 5 + 1 = 95"), /forbidden/);
});
