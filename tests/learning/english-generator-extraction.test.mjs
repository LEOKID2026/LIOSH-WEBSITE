import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ENGLISH_LEVELS,
  ENGLISH_TOPICS,
  ENGLISH_GRADES,
  getLevelForGrade,
  generateQuestion,
  resolveEnglishQType,
  buildMcqFromOptionPool,
} from "../../utils/english-question-generator.js";

const MASTER_SRC = readFileSync(
  fileURLToPath(new URL("../../pages/learning/english-master.js", import.meta.url)),
  "utf8"
);

function assertMcqShape(q, topic) {
  assert.ok(q?.question && String(q.question).trim().length > 0);
  assert.ok(q?.correctAnswer && String(q.correctAnswer).trim().length > 0);
  assert.ok(Array.isArray(q.answers), "answers array expected");
  assert.ok(q.answers.length >= 2, "MCQ needs at least 2 choices");
  assert.ok(q.answers.includes(q.correctAnswer), "choices must include correctAnswer");
  assert.equal(q.topic, topic);
  assert.ok(q.params && typeof q.params === "object");
}

test("english-master imports extracted generator", () => {
  assert.match(MASTER_SRC, /from ["'].*english-question-generator\.js["']/);
  assert.doesNotMatch(MASTER_SRC, /^function generateQuestion\(/m);
});

test("extracted generateQuestion: grammar g3 easy returns MCQ shape", () => {
  const level = getLevelForGrade("easy", "g3");
  const q = generateQuestion(level, "grammar", "g3", null, "easy", null);
  assertMcqShape(q, "grammar");
  assert.equal(resolveEnglishQType({
    selectedTopic: "grammar",
    levelKey: "easy",
    gradeKey: "g3",
    question: q.question,
    correctAnswer: q.correctAnswer,
    params: q.params,
  }), "choice");
});

test("extracted generateQuestion: translation g3 medium returns MCQ with pre-expanded choices", () => {
  const level = getLevelForGrade("medium", "g3");
  const q = generateQuestion(level, "translation", "g3", null, "medium", null);
  assertMcqShape(q, "translation");
  assert.equal(q.params?.direction, "en_to_he");
  assert.equal(q.qType || q.params?.answerMode, "choice");
});

test("extracted generateQuestion: vocabulary g2 easy returns MCQ", () => {
  const level = getLevelForGrade("easy", "g2");
  const q = generateQuestion(level, "vocabulary", "g2", null, "easy", null);
  assertMcqShape(q, "vocabulary");
  assert.ok(q.params?.listKey);
  const pool = q.params.direction === "he_to_en"
    ? ["sun", "dog"].filter(Boolean)
    : null;
  if (pool) {
    const built = buildMcqFromOptionPool(q.correctAnswer, pool, 4);
    assert.ok(built.includes(q.correctAnswer));
  }
});

test("getLevelForGrade uses ENGLISH_LEVELS bands", () => {
  const easy = getLevelForGrade("easy", "g3");
  assert.equal(easy.name, ENGLISH_LEVELS.easy.name);
  assert.ok(easy.maxWords >= 3);
});

test("ENGLISH_TOPICS labels match curriculum-facing keys", () => {
  assert.equal(ENGLISH_TOPICS.grammar.name, "דקדוק");
  assert.equal(ENGLISH_TOPICS.vocabulary.name, "אוצר מילים");
  assert.ok(ENGLISH_GRADES.g3.topics.includes("grammar"));
});
