import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateSameExactQuestionSet } from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import { isActivityPreviewSubjectSupported } from "../../lib/classroom-activities/classroom-activities-preview.js";
import {
  generateActivityQuestionSetClient,
  normalizeEnglishTopic,
} from "../../lib/classroom-activities/generate-activity-questions-client.js";

const ADAPTER_SRC = readFileSync(
  fileURLToPath(
    new URL("../../lib/classroom-activities/generate-activity-questions-client.js", import.meta.url)
  ),
  "utf8"
);

test("normalizeEnglishTopic maps ENGLISH_TOPICS labels", () => {
  assert.equal(normalizeEnglishTopic("דקדוק", "g3"), "grammar");
  assert.equal(normalizeEnglishTopic("תרגום", "g3"), "translation");
  assert.equal(normalizeEnglishTopic("grammar", "g3"), "grammar");
});

test("english in preview subjects; adapter uses english-question-generator only", () => {
  assert.equal(isActivityPreviewSubjectSupported("english"), true);
  assert.match(ADAPTER_SRC, /utils\/english-question-generator\.js/);
  assert.doesNotMatch(ADAPTER_SRC, /pages\/learning\/english-master/);
});

test("english generates N=5 for g3 grammar easy", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "grammar",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "english");
    assert.equal(item.topic, "grammar");
    assert.equal(item.params?.answerMode, "choice");
    assert.ok(item.choices.includes(item.correctAnswer));
  }
  assert.equal(validateSameExactQuestionSet(qs, 5).ok, true);
});

test("english generates translation MCQ with pre-expanded choices (g3 easy pool)", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "translation",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "english");
    assert.equal(item.topic, "translation");
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.length >= 2);
    assert.ok(item.choices.includes(item.correctAnswer));
    assert.equal(item.params?.answerMode, "choice");
  }
  assert.equal(validateSameExactQuestionSet(qs, 5).ok, true);
});

test("english translation g6 easy passes after global_advanced pool wiring", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g6",
    topic: "translation",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.topic, "translation");
    assert.ok(item.choices.includes(item.correctAnswer));
  }
});

test("english generates N=5 for g2 vocabulary easy", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g2",
    topic: "vocabulary",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "english");
    assert.equal(item.topic, "vocabulary");
    assert.ok(item.choices.includes(item.correctAnswer));
  }
});

test("english invalid topic throws Hebrew error", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "english",
        gradeLevel: "g3",
        topic: "not_a_real_topic",
        difficulty: "easy",
        count: 5,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות אנגלית/);
      return true;
    }
  );
});

test("english writing topic yields no MCQ pool (throws)", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "english",
        gradeLevel: "g2",
        topic: "writing",
        difficulty: "easy",
        count: 5,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות אנגלית/);
      return true;
    }
  );
});

test("english dedup fingerprints", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "grammar",
    difficulty: "easy",
    count: 5,
  });
  const fps = qs.map((q) => `${q.question}|${q.correctAnswer}`);
  assert.equal(new Set(fps).size, fps.length);
});
