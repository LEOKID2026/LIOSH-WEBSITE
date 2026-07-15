/**
 * Public demo generator — always 8 exercises, server-enforced.
 * Run: node --test tests/worksheets/public-worksheets-demo-count.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PUBLIC_DEMO_COUNT,
  PUBLIC_DEMO_ALLOWED_BY_GRADE,
} from "../../lib/worksheets/worksheet-public-demo.constants.js";
import { validatePublicDemoGenerationParams } from "../../lib/worksheets/worksheet-public-demo-allowlist.server.js";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("public-worksheets-demo-count", () => {
  test("PUBLIC_DEMO_COUNT is 8", () => {
    assert.equal(PUBLIC_DEMO_COUNT, 8);
  });

  test("validatePublicDemoGenerationParams always normalizes count to 8", () => {
    const base = { subjectId: "math", gradeKey: "g3", topicKey: "addition", levelKey: "regular" };
    for (const clientCount of [undefined, 6, 8, 12, 20]) {
      const res = validatePublicDemoGenerationParams({ ...base, count: clientCount });
      assert.equal(res.ok, true, `count=${clientCount}`);
      assert.equal(res.normalized.count, 8);
    }
  });

  test("every allowlist combination generates exactly 8 questions", async () => {
    for (const [subjectId, grades] of Object.entries(PUBLIC_DEMO_ALLOWED_BY_GRADE)) {
      for (const [gradeKey, entry] of Object.entries(grades)) {
        const validated = validatePublicDemoGenerationParams({
          subjectId,
          gradeKey,
          topicKey: entry.topicKey,
          levelKey: "regular",
          mathPracticeFormat: entry.mathPracticeFormats?.[0],
          seed: 88000 + gradeKey.charCodeAt(1),
        });
        assert.equal(validated.ok, true, `${subjectId}/${gradeKey}`);
        const gen = await generateWorksheetForParent(validated.normalized);
        assert.equal(gen.ok, true, `${subjectId}/${gradeKey}: ${gen.ok ? "" : gen.code}`);
        assert.equal(gen.worksheetPayload.questions.length, 8, `${subjectId}/${gradeKey}`);
        assert.equal(gen.generation.count, 8);
      }
    }
  });

  test("refresh with different seeds can vary questions", async () => {
    const params = {
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 8,
      mathPracticeFormat: "horizontal_add_sub",
    };
    const a = await generateWorksheetForParent({ ...params, seed: 88101 });
    const b = await generateWorksheetForParent({ ...params, seed: 88102 });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    const sigA = a.worksheetPayload.questions.map((q) => q.stemHe).join("|");
    const sigB = b.worksheetPayload.questions.map((q) => q.stemHe).join("|");
    assert.notEqual(sigA, sigB);
  });

  test("CreateWorksheetTab public-demo hides count selector", () => {
    const src = readFileSync(join(ROOT, "components/worksheets/CreateWorksheetTab.jsx"), "utf8");
    assert.match(src, /variant === "public-demo"/);
    assert.match(src, /!isPublicDemo \?/);
    assert.doesNotMatch(src, /COUNT_OPTIONS\.map[\s\S]*variant === "public-demo"/);
  });
});
