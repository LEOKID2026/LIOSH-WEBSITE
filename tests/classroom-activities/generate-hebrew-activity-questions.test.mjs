import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateSameExactQuestionSet } from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import { isActivityPreviewSubjectSupported } from "../../lib/classroom-activities/classroom-activities-preview.js";
import {
  generateActivityQuestionSetClient,
  normalizeHebrewTopic,
} from "../../lib/classroom-activities/generate-activity-questions-client.js";

const ADAPTER_SRC = readFileSync(
  fileURLToPath(
    new URL("../../lib/classroom-activities/generate-activity-questions-client.js", import.meta.url)
  ),
  "utf8"
);

test("normalizeHebrewTopic maps labels from hebrew-constants TOPICS only", () => {
  assert.equal(normalizeHebrewTopic("קריאה", "g2"), "reading");
  assert.equal(normalizeHebrewTopic("הבנת הנקרא", "g4"), "comprehension");
  assert.equal(normalizeHebrewTopic("עושר שפתי", "g2"), "vocabulary");
  assert.equal(normalizeHebrewTopic("reading", "g4"), "reading");
});

test("isActivityPreviewSubjectSupported includes hebrew and english (B3/B4)", () => {
  assert.equal(isActivityPreviewSubjectSupported("hebrew"), true);
  assert.equal(isActivityPreviewSubjectSupported("english"), true);
  assert.equal(isActivityPreviewSubjectSupported("history"), false);
});

test("adapter does not import archive hebrew-questions banks", () => {
  assert.equal(ADAPTER_SRC.includes("data/hebrew-questions"), false);
  assert.equal(ADAPTER_SRC.includes("hebrew-questions/g"), false);
  assert.match(ADAPTER_SRC, /utils\/hebrew-question-generator\.js/);
});

test("hebrew generates N=5 for g2 vocabulary easy", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g2",
    topic: "vocabulary",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "hebrew");
    assert.equal(item.topic, "vocabulary");
    assert.equal(item.params?.answerMode, "choice");
    assert.ok(item.choices.includes(item.correctAnswer));
  }
  const v = validateSameExactQuestionSet(qs, 5);
  assert.equal(v.ok, true);
});

test("hebrew generates N=5 for g4 reading medium", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "reading",
    difficulty: "medium",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "hebrew");
    assert.equal(item.topic, "reading");
    assert.equal(item.params?.answerMode, "choice");
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.includes(item.correctAnswer));
  }
});

test("hebrew invalid topic for grade throws with no fallback", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "hebrew",
        gradeLevel: "g3",
        topic: "not_a_real_topic",
        difficulty: "easy",
        count: 5,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות עברית/);
      assert.match(String(err.message), /כיתה ג׳/);
      return true;
    }
  );
});

test("hebrew dedup: unique question|correctAnswer fingerprints", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "comprehension",
    difficulty: "easy",
    count: 5,
  });
  const fps = qs.map((q) => `${q.question}|${q.correctAnswer}`);
  assert.equal(new Set(fps).size, fps.length);
});

test("hebrew typing-mode items are excluded (all frozen items are MCQ choice)", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "reading",
    difficulty: "medium",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.params?.answerMode, "choice");
    assert.ok(item.choices.length >= 2);
  }
});

test("hebrew throws when N exceeds unique MCQ pool (no fallback)", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "hebrew",
        gradeLevel: "g2",
        topic: "vocabulary",
        difficulty: "easy",
        count: 500,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות עברית/);
      return true;
    }
  );
});
