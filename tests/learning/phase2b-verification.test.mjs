import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { detectStemLeak } = await import(href("lib/learning/question-engine-metadata.js"));
const { detectMcqObviousAnswerRisks } = await import(
  href("scripts/qa/lib/mcq-obvious-answer-risk.mjs")
);
const { generateForMatrixCell } = await import(
  href("scripts/learning-simulator/lib/question-generator-adapters.mjs")
);

test("geometry transformations procedural stems avoid answer-label leakage", async () => {
  const cell = { grade: "g2", subjectCanonical: "geometry", level: "hard", topic: "transformations" };
  for (let i = 0; i < 40; i += 1) {
    const gen = await generateForMatrixCell(cell, i);
    assert.ok(gen.ok && gen.raw, `sample ${i} should generate`);
    const stem = String(gen.raw.question || "");
    const correct = String(gen.raw.correctAnswer || "");
    assert.ok(
      !detectStemLeak(stem, correct),
      `stem leak for correct=${correct}: ${stem}`
    );
    for (const opt of gen.raw.answers || []) {
      assert.doesNotMatch(String(opt), /- לא |באופן שונה/);
    }
  }
});

test("prime_composite classify options stay parallel short labels", async () => {
  const cell = { grade: "g4", subjectCanonical: "math", level: "easy", topic: "prime_composite" };
  for (let i = 0; i < 20; i += 1) {
    const gen = await generateForMatrixCell(cell, i);
    if (!gen.ok || !gen.raw || gen.raw.params?.subKind !== "pc_classify") continue;
    const opts = gen.raw.answers.map(String);
    assert.deepEqual(new Set(opts).size, 4);
    for (const opt of opts) {
      assert.ok(opt.length <= 10, `option too long: ${opt}`);
    }
    const risks = detectMcqObviousAnswerRisks(gen.raw, {
      subject: "math",
      grade: "g4",
      topic: "prime_composite",
      difficulty: "easy",
    });
    const warns = risks.filter((r) => r.severity === "WARN" || r.severity === "FAIL");
    assert.equal(warns.length, 0, JSON.stringify(warns));
  }
});
