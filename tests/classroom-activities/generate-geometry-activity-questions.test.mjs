import test from "node:test";
import assert from "node:assert/strict";
import { validateSameExactQuestionSet, answersMatch } from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import {
  generateActivityQuestionSetClient,
  normalizeGeometryTopic,
} from "../../lib/classroom-activities/generate-activity-questions-client.js";

test("normalizeGeometryTopic maps Hebrew labels and English keys", () => {
  assert.equal(normalizeGeometryTopic("שטח", "g3"), "area");
  assert.equal(normalizeGeometryTopic("area", "g3"), "area");
});

test("geometry generates N=5 for g3 area easy", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "area",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "geometry");
    assert.equal(item.topic, "area");
    assert.ok(item.params?.kind);
    assert.ok(getGeometryDiagramSpec({ topic: item.topic, shape: item.shape, params: item.params }));
  }
});

test("geometry generates N=5 for g6 pythagoras hard", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g6",
    topic: "pythagoras",
    difficulty: "hard",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "geometry");
    assert.equal(item.topic, "pythagoras");
    assert.ok(item.choices?.includes(item.correctAnswer));
  }
});

test("geometry invalid topic for grade throws (g1 pythagoras)", async () => {
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
      assert.match(String(err.message), /אין מספיק שאלות גאומטריה/);
      return true;
    }
  );
});

test("geometry items pass validateSameExactQuestionSet and MCQ rules", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "area",
    difficulty: "easy",
    count: 5,
  });
  const v = validateSameExactQuestionSet(qs, 5);
  assert.equal(v.ok, true);
  for (const item of qs) {
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.includes(item.correctAnswer));
    assert.match(String(item.correctAnswer), /\S/);
  }
});

test("geometry numeric correctAnswer is string", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "area",
    difficulty: "easy",
    count: 3,
  });
  for (const item of qs) {
    assert.equal(typeof item.correctAnswer, "string");
    if (/^\d+(\.\d+)?$/.test(item.correctAnswer)) {
      assert.ok(Number.isFinite(Number(item.correctAnswer)));
    }
  }
});

test("geometry dedup fingerprints", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g4",
    topic: "perimeter",
    difficulty: "medium",
    count: 5,
  });
  const fps = qs.map((q) => `${q.question}|${q.correctAnswer}`);
  assert.equal(new Set(fps).size, fps.length);
});

test("geometry Hebrew label answers score via answersMatch when present", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g6",
    topic: "area",
    difficulty: "hard",
    count: 10,
  });
  const hebrew = qs.find((q) => /[\u0590-\u05FF]/.test(q.correctAnswer) && !/^\d+$/.test(q.correctAnswer));
  if (hebrew) {
    assert.equal(answersMatch(hebrew.correctAnswer, hebrew.correctAnswer), true);
    const wrong = hebrew.choices.find((c) => c !== hebrew.correctAnswer);
    if (wrong) assert.equal(answersMatch(wrong, hebrew.correctAnswer), false);
  }
});

const CORE_DIAGRAM_GEOMETRY_CASES = [
  { gradeLevel: "g3", topic: "parallel_perpendicular" },
  { gradeLevel: "g4", topic: "parallel_perpendicular" },
  { gradeLevel: "g4", topic: "diagonal" },
  { gradeLevel: "g4", topic: "symmetry" },
  { gradeLevel: "g5", topic: "parallel_perpendicular" },
  { gradeLevel: "g5", topic: "diagonal" },
  { gradeLevel: "g5", topic: "heights" },
  { gradeLevel: "g5", topic: "tiling" },
];

for (const tc of CORE_DIAGRAM_GEOMETRY_CASES) {
  for (const difficulty of ["easy", "medium", "hard"]) {
    test(`geometry core diagram topic ${tc.gradeLevel} ${tc.topic} ${difficulty}`, async () => {
      const qs = await generateActivityQuestionSetClient({
        subject: "geometry",
        gradeLevel: tc.gradeLevel,
        topic: tc.topic,
        difficulty,
        count: 5,
      });
      assert.equal(qs.length, 5);
      for (const item of qs) {
        assert.equal(item.subject, "geometry");
        assert.equal(item.topic, tc.topic);
        const spec = getGeometryDiagramSpec({
          topic: item.topic,
          shape: item.shape,
          params: item.params,
        });
        assert.ok(spec?.kind, `expected diagram spec for ${item.params?.kind}`);
      }
    });
  }
}

const BROKEN_GEOMETRY_CASES = [
  { name: "g3 shapes_basic medium", gradeLevel: "g3", topic: "shapes_basic", difficulty: "medium" },
  { name: "g3 rotation easy", gradeLevel: "g3", topic: "rotation", difficulty: "easy" },
  { name: "g2 transformations easy", gradeLevel: "g2", topic: "transformations", difficulty: "easy" },
  { name: "g5 solids easy", gradeLevel: "g5", topic: "solids", difficulty: "easy" },
  { name: "g6 circles medium", gradeLevel: "g6", topic: "circles", difficulty: "medium" },
];

for (const tc of BROKEN_GEOMETRY_CASES) {
  test(`geometry ${tc.name} generates N=5`, async () => {
    const qs = await generateActivityQuestionSetClient({
      subject: "geometry",
      gradeLevel: tc.gradeLevel,
      topic: tc.topic,
      difficulty: tc.difficulty,
      count: 5,
    });
    assert.equal(qs.length, 5);
    for (const item of qs) {
      assert.ok(Array.isArray(item.choices));
      assert.ok(item.choices.includes(item.correctAnswer));
    }
  });
}
