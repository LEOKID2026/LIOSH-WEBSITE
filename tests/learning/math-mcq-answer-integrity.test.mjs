import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { generateQuestion, buildMathMcqAnswerList } = await import(
  href("utils/math-question-generator.js")
);
const { getLevelConfig } = await import(href("utils/math-storage.js"));
const { mcqOptionsAreDuplicate } = await import(href("utils/mcq-distractor-rebalance.js"));
const { generateForMatrixCell } = await import(
  href("scripts/learning-simulator/lib/question-generator-adapters.mjs")
);

function assertMcqIntegrity(q, label) {
  assert.ok(Array.isArray(q.answers), `${label}: answers missing`);
  assert.ok(q.answers.length >= 4, `${label}: need 4 options`);
  for (const a of q.answers) {
    assert.ok(
      typeof a === "string" || typeof a === "number",
      `${label}: answer must be primitive, got ${typeof a}`
    );
    assert.notEqual(String(a), "[object Object]", `${label}: object rendered as string`);
  }
  for (let i = 0; i < q.answers.length; i++) {
    for (let j = i + 1; j < q.answers.length; j++) {
      assert.ok(
        !mcqOptionsAreDuplicate(q.answers[i], q.answers[j]),
        `${label}: duplicate options ${i}/${j}`
      );
    }
  }
  const match = q.answers.some(
    (a) => String(a) === String(q.correctAnswer) || Number(a) === Number(q.correctAnswer)
  );
  assert.ok(match, `${label}: correctAnswer not in options`);
}

const MATRIX_CASES = [
  ["g1", "multiplication", "hard"],
  ["g1", "number_sense", "easy"],
  ["g2", "fractions", "medium"],
  ["g3", "word_problems", "easy"],
  ["g4", "zero_one_properties", "medium"],
  ["g4", "factors_multiples", "easy"],
  ["g4", "prime_composite", "easy"],
  ["g4", "prime_composite", "medium"],
  ["g4", "prime_composite", "hard"],
  ["g6", "factors_multiples", "hard"],
];

test("math MCQ matrix samples have primitive unique options", async () => {
  for (const [grade, topic, level] of MATRIX_CASES) {
    for (let sample = 0; sample < 6; sample++) {
      const gen = await generateForMatrixCell(
        { grade, subjectCanonical: "math", level, topic },
        sample
      );
      if (gen.unsupported || !gen.ok || !gen.raw?.answers?.length) continue;
      assertMcqIntegrity(gen.raw, `${grade}/${topic}/${level}#${sample}`);
      assert.ok(
        gen.raw.params?.mcqOptionCells?.length >= 4,
        `${grade}/${topic}/${level}#${sample}: mcqOptionCells preserved`
      );
    }
  }
});

test("buildMathMcqAnswerList dedupes numeric multiplication options", () => {
  const params = { kind: "mul", a: 2, b: 3 };
  const list = buildMathMcqAnswerList(6, "multiplication", params, (a, b) => a, (n) => n);
  assert.ok(Array.isArray(list));
  const values = list.map((c) => (typeof c === "object" ? c.value : c));
  assert.equal(new Set(values.map(String)).size, values.length);
});

test("number_sense even_odd stem avoids listing both parity labels", () => {
  const lc = getLevelConfig(2, "easy");
  let saw = false;
  for (let i = 0; i < 30; i++) {
    const q = generateQuestion(lc, "number_sense", "g2", null);
    if (q.params?.kind === "ns_even_odd") {
      saw = true;
      assert.match(q.question, /זוגי\?/);
      assert.doesNotMatch(q.question, /אי-זוגי/);
    }
  }
  assert.ok(saw, "expected ns_even_odd sample");
});
