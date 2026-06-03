import test from "node:test";
import assert from "node:assert/strict";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";

const COUNT = 5;

/** @param {string} grade @param {string} topic @param {string} difficulty */
async function expectScienceCount5(grade, topic, difficulty) {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: grade,
    topic,
    difficulty,
    count: COUNT,
  });
  assert.equal(qs.length, COUNT, `${grade} ${topic} ${difficulty}`);
  for (const item of qs) {
    assert.equal(item.subject, "science");
    assert.equal(item.topic, topic);
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.length >= 2);
    assert.ok(item.choices.includes(item.correctAnswer));
  }
  const fps = qs.map(
    (q) => `${q.question}|${q.choices.indexOf(q.correctAnswer)}`
  );
  assert.equal(new Set(fps).size, COUNT, `duplicate fingerprints ${grade} ${topic} ${difficulty}`);
  return qs;
}

const SCIENCE_MATRIX = [
  ["g1", "materials", "medium"],
  ["g1", "materials", "hard"],
  ["g1", "earth_space", "medium"],
  ["g1", "earth_space", "hard"],
  ["g1", "environment", "medium"],
  ["g1", "environment", "hard"],
  ["g2", "materials", "hard"],
  ["g2", "earth_space", "medium"],
  ["g2", "earth_space", "hard"],
  ["g2", "environment", "medium"],
  ["g2", "environment", "hard"],
  ["g3", "materials", "easy"],
  ["g3", "materials", "hard"],
  ["g3", "earth_space", "easy"],
  ["g3", "earth_space", "hard"],
  ["g3", "environment", "easy"],
  ["g3", "environment", "hard"],
  ["g4", "materials", "easy"],
  ["g4", "earth_space", "easy"],
  ["g4", "environment", "easy"],
  ["g5", "materials", "easy"],
  ["g5", "materials", "medium"],
  ["g5", "earth_space", "easy"],
  ["g5", "environment", "easy"],
  ["g6", "materials", "easy"],
  ["g6", "materials", "medium"],
  ["g6", "earth_space", "easy"],
  ["g6", "environment", "easy"],
];

for (const [grade, topic, difficulty] of SCIENCE_MATRIX) {
  test(`science-${topic}-${grade}-${difficulty}-count5`, async () => {
    await expectScienceCount5(grade, topic, difficulty);
  });
}

test("science-all-items-are-mcq", async () => {
  await expectScienceCount5("g1", "materials", "medium");
});

test("science-no-duplicate-fingerprints", async () => {
  await expectScienceCount5("g3", "environment", "easy");
});

test("science-invalid-topic-throws", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "science",
        gradeLevel: "g3",
        topic: "invalid_xyz",
        difficulty: "easy",
        count: COUNT,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות מדע/);
      return true;
    }
  );
});

for (const topic of ["materials", "earth_space", "environment"]) {
  test(`science-topic-fidelity-${topic}`, async () => {
    const qs = await generateActivityQuestionSetClient({
      subject: "science",
      gradeLevel: "g2",
      topic,
      difficulty: "easy",
      count: COUNT,
    });
    assert.equal(qs.length, COUNT);
    for (const item of qs) {
      assert.equal(item.topic, topic);
    }
  });
}
