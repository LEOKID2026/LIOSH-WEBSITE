/**
 * Public demo math formats — horizontal g1, horizontal+vertical g2-g6.
 * Run: node --test tests/worksheets/public-worksheets-math-formats.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getPublicDemoAllowlistEntry } from "../../lib/worksheets/worksheet-public-demo.constants.js";
import { validatePublicDemoGenerationParams } from "../../lib/worksheets/worksheet-public-demo-allowlist.server.js";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";

describe("public-worksheets-math-formats", () => {
  test("g1 allows horizontal only", () => {
    const entry = getPublicDemoAllowlistEntry("math", "g1");
    assert.deepEqual(entry?.mathPracticeFormats, ["horizontal_add_sub"]);

    const ok = validatePublicDemoGenerationParams({
      subjectId: "math",
      gradeKey: "g1",
      topicKey: "addition",
      levelKey: "regular",
      mathPracticeFormat: "horizontal_add_sub",
    });
    assert.equal(ok.ok, true);

    const bad = validatePublicDemoGenerationParams({
      subjectId: "math",
      gradeKey: "g1",
      topicKey: "addition",
      levelKey: "regular",
      mathPracticeFormat: "vertical_add_sub",
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.error, "INVALID_MATH_PRACTICE_FORMAT");
  });

  test("g2-g6 allow horizontal and vertical", async () => {
    for (const gradeKey of ["g2", "g3", "g4", "g5", "g6"]) {
      const entry = getPublicDemoAllowlistEntry("math", gradeKey);
      assert.deepEqual(entry?.mathPracticeFormats, ["horizontal_add_sub", "vertical_add_sub"]);

      for (const fmt of entry.mathPracticeFormats) {
        const validated = validatePublicDemoGenerationParams({
          subjectId: "math",
          gradeKey,
          topicKey: "addition",
          levelKey: "regular",
          mathPracticeFormat: fmt,
          seed: 87000 + gradeKey.charCodeAt(1),
        });
        assert.equal(validated.ok, true, `${gradeKey}/${fmt}`);
        const gen = await generateWorksheetForParent(validated.normalized);
        assert.equal(gen.ok, true, `${gradeKey}/${fmt}`);
        assert.equal(gen.worksheetPayload.questions.length, 8);
      }
    }
  });
});
