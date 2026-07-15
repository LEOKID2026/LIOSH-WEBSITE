import test from "node:test";
import assert from "node:assert/strict";
import { validateSameExactQuestionSet } from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import { isActivityPreviewSubjectSupported } from "../../lib/classroom-activities/classroom-activities-preview.js";
import {
  generateActivityQuestionSetClient,
  normalizeMoledetGeographyTopic,
} from "../../lib/classroom-activities/generate-activity-questions-client.js";

test("normalizeMoledetGeographyTopic maps Hebrew labels and passes English keys", () => {
  assert.equal(normalizeMoledetGeographyTopic("מולדת"), "homeland");
  assert.equal(normalizeMoledetGeographyTopic("homeland"), "homeland");
  assert.equal(normalizeMoledetGeographyTopic("  גאוגרפיה "), "geography");
});

test("isActivityPreviewSubjectSupported rejects hyphenated moledet-geography key", () => {
  assert.equal(isActivityPreviewSubjectSupported("moledet_geography"), true);
  assert.equal(isActivityPreviewSubjectSupported("moledet-geography"), false);
});

test("moledet_geography generates N=5 for g3 homeland easy", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g3",
    topic: "homeland",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "moledet_geography");
    assert.equal(item.topic, "homeland");
    assert.ok(item.choices.includes(item.correctAnswer));
  }
  const v = validateSameExactQuestionSet(qs, 5);
  assert.equal(v.ok, true);
});

test("moledet_geography generates N=5 for g5 geography hard", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g5",
    topic: "geography",
    difficulty: "hard",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "moledet_geography");
    assert.equal(item.topic, "geography");
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.includes(item.correctAnswer));
  }
});

test("moledet_geography empty pool throws (g3 mixed - no bank rows for mixed)", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "moledet_geography",
        gradeLevel: "g3",
        topic: "mixed",
        difficulty: "easy",
        count: 5,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות מולדת וגאוגרפיה/);
      assert.match(String(err.message), /כיתה ג׳/);
      assert.match(String(err.message), /ערבוב/);
      return true;
    }
  );
});

test("moledet_geography throws when N exceeds available unique items (no fallback)", async () => {
  const small = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g3",
    topic: "homeland",
    difficulty: "hard",
    count: 5,
  });
  assert.equal(small.length, 5);
  assert.ok(small.every((q) => q.sourceDifficulty === "hard"));

  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "moledet_geography",
        gradeLevel: "g3",
        topic: "homeland",
        difficulty: "hard",
        count: 500,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות מולדת וגאוגרפיה/);
      return true;
    }
  );
});

test("moledet_geography preview has no duplicate question|correctAnswer fingerprints", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g4",
    topic: "homeland",
    difficulty: "easy",
    count: 5,
  });
  const fps = qs.map((q) => `${q.question}|${q.correctAnswer}`);
  assert.equal(new Set(fps).size, fps.length);
});
