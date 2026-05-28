import test from "node:test";
import assert from "node:assert/strict";
import { formatGradeLevelHe } from "../lib/learning-student-defaults.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";

test("formatGradeLevelHe g3 returns כיתה ג׳", () => {
  assert.equal(formatGradeLevelHe("g3"), "כיתה ג׳");
});

test("formatGradeLevelHe for all g1–g6 returns proper Hebrew letters", () => {
  const expected = {
    g1: "כיתה א׳",
    g2: "כיתה ב׳",
    g3: "כיתה ג׳",
    g4: "כיתה ד׳",
    g5: "כיתה ה׳",
    g6: "כיתה ו׳",
  };
  for (const [key, label] of Object.entries(expected)) {
    assert.equal(formatGradeLevelHe(key), label);
  }
});

test("generator error messages do not contain raw grade keys", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "geometry",
        gradeLevel: "g1",
        topic: "pythagoras",
        difficulty: "easy",
        count: 5,
      }),
    (err) => {
      assert.match(String(err.message), /כיתה/);
      assert.doesNotMatch(String(err.message), /\bg[1-6]\b/);
      return true;
    }
  );
});
