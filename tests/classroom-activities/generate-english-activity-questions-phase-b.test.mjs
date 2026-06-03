import test from "node:test";
import assert from "node:assert/strict";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";

const COUNT = 5;

/** @param {string} grade @param {string} topic @param {string} difficulty */
async function expectEnglishCount5(grade, topic, difficulty) {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: grade,
    topic,
    difficulty,
    count: COUNT,
  });
  assert.equal(qs.length, COUNT, `${grade} ${topic} ${difficulty}`);
  for (const item of qs) {
    assert.equal(item.subject, "english");
    assert.equal(item.topic, topic);
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.length >= 2);
    assert.ok(item.choices.includes(item.correctAnswer));
    assert.equal(item.params?.answerMode, "choice");
  }
  const fps = qs.map((q) => `${q.question}|${q.correctAnswer}`);
  assert.equal(new Set(fps).size, COUNT, `duplicate fingerprints ${grade} ${topic} ${difficulty}`);
  return qs;
}

const GRAMMAR_MATRIX = [
  ["g3", "hard"],
  ["g4", "medium"],
  ["g4", "hard"],
  ["g5", "medium"],
  ["g5", "hard"],
  ["g6", "medium"],
  ["g6", "hard"],
];

for (const [grade, difficulty] of GRAMMAR_MATRIX) {
  test(`english-grammar-${grade}-${difficulty}-count5`, async () => {
    await expectEnglishCount5(grade, "grammar", difficulty);
  });
}

const SENTENCE_MATRIX = [
  ["g3", "medium"],
  ["g3", "hard"],
  ["g4", "medium"],
  ["g4", "hard"],
  ["g5", "medium"],
  ["g5", "hard"],
  ["g6", "medium"],
  ["g6", "hard"],
];

for (const [grade, difficulty] of SENTENCE_MATRIX) {
  test(`english-sentences-${grade}-${difficulty}-count5`, async () => {
    await expectEnglishCount5(grade, "sentences", difficulty);
  });
}

const TRANSLATION_MATRIX = [
  ["g2", "hard"],
  ["g3", "easy"],
  ["g3", "medium"],
  ["g3", "hard"],
  ["g4", "easy"],
  ["g4", "medium"],
  ["g4", "hard"],
  ["g5", "easy"],
  ["g5", "medium"],
  ["g5", "hard"],
  ["g6", "easy"],
  ["g6", "medium"],
  ["g6", "hard"],
];

for (const [grade, difficulty] of TRANSLATION_MATRIX) {
  test(`english-translation-${grade}-${difficulty}-count5`, async () => {
    await expectEnglishCount5(grade, "translation", difficulty);
  });
}

test("english-all-items-are-mcq", async () => {
  const qs = await expectEnglishCount5("g5", "grammar", "medium");
  for (const item of qs) {
    assert.ok(item.choices.length >= 2);
  }
});

test("english-no-duplicate-fingerprints", async () => {
  await expectEnglishCount5("g4", "translation", "easy");
});

test("english-invalid-topic-throws", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "english",
        gradeLevel: "g3",
        topic: "invalid_xyz",
        difficulty: "easy",
        count: COUNT,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות אנגלית/);
      return true;
    }
  );
});

for (const topic of ["grammar", "sentences", "translation"]) {
  test(`english-topic-fidelity-${topic}`, async () => {
    const qs = await generateActivityQuestionSetClient({
      subject: "english",
      gradeLevel: "g5",
      topic,
      difficulty: "medium",
      count: COUNT,
    });
    assert.equal(qs.length, COUNT);
    for (const item of qs) {
      assert.equal(item.topic, topic);
    }
  });
}
