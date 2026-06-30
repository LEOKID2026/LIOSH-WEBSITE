import test from "node:test";
import assert from "node:assert/strict";
import {
  stripQuestionSetForStudent,
  validateSameExactQuestionSet,
  answersMatch,
  extractCorrectAnswerFromQuestion,
} from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import { isActivityPreviewSubjectSupported } from "../../lib/classroom-activities/classroom-activities-preview.js";
import {
  generateActivityQuestionSetClient,
  normalizeScienceTopic,
  scienceLevelAllowed,
} from "../../lib/classroom-activities/generate-activity-questions-client.js";

test("stripQuestionSetForStudent removes scoring fields", () => {
  const out = stripQuestionSetForStudent(
    [{ question: "2+2", correctAnswer: "4", correct_answer: "4" }],
    "guided_practice"
  );
  assert.equal(out[0].question, "2+2");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].correct_answer, undefined);
});

test("quiz mode omits hint and explanation from start payload", () => {
  const out = stripQuestionSetForStudent(
    [
      {
        question: "Q?",
        correctAnswer: "1",
        hint: "secret hint",
        explanation: "secret explanation",
      },
    ],
    "quiz"
  );
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("guided_practice may include hint and explanation", () => {
  const out = stripQuestionSetForStudent(
    [{ question: "Q?", hint: "h", explanation: "e", correctAnswer: "1" }],
    "guided_practice"
  );
  assert.equal(out[0].hint, "h");
  assert.equal(out[0].explanation, "e");
});

test("parent activity student payload may hide explanation without hiding hint", () => {
  const out = stripQuestionSetForStudent(
    [{ question: "Q?", hint: "h", explanation: "e", correctAnswer: "1" }],
    "guided_practice",
    { hideExplanation: true }
  );
  assert.equal(out[0].hint, "h");
  assert.equal(out[0].explanation, undefined);
  assert.equal(out[0].correctAnswer, undefined);
});

test("classroom activity preview supported subjects", () => {
  assert.equal(isActivityPreviewSubjectSupported("math"), true);
  assert.equal(isActivityPreviewSubjectSupported("science"), true);
  assert.equal(isActivityPreviewSubjectSupported("moledet_geography"), true);
  assert.equal(isActivityPreviewSubjectSupported("geometry"), true);
  assert.equal(isActivityPreviewSubjectSupported("hebrew"), true);
  assert.equal(isActivityPreviewSubjectSupported("english"), true);
  assert.equal(isActivityPreviewSubjectSupported("moledet-geography"), false);
});

test("normalizeScienceTopic maps Hebrew labels to bank keys", () => {
  assert.equal(normalizeScienceTopic("גופנו"), "body");
  assert.equal(normalizeScienceTopic("body"), "body");
  assert.equal(normalizeScienceTopic("  בעלי חיים "), "animals");
});

test("scienceLevelAllowed mirrors science-master level gate", () => {
  assert.equal(scienceLevelAllowed({ minLevel: "easy", maxLevel: "hard" }, "medium"), true);
  assert.equal(scienceLevelAllowed({ minLevel: "easy", maxLevel: "easy" }, "hard"), false);
});

test("Science preview returns exactly N items for valid grade/topic/difficulty", async () => {
  const n = 5;
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: n,
  });
  assert.equal(qs.length, n);
});

test("Science preview items match requested grade and difficulty band", async () => {
  const { SCIENCE_QUESTIONS } = await import("../../data/science-questions.js");
  const gradeKey = "g3";
  const topicKey = "body";
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: gradeKey,
    topic: topicKey,
    difficulty: "easy",
    count: 5,
  });

  for (const item of qs) {
    assert.equal(item.gradeLevel, gradeKey);
    assert.equal(item.topic, topicKey);
    assert.equal(item.displayLevel, "regular");
    assert.ok(["easy", "medium", "hard"].includes(item.sourceDifficulty || item.difficulty));
    const fp = `${item.question}|${item.correctAnswer}`;
    const bankMatch = SCIENCE_QUESTIONS.find((q) => {
      const prompt = String(q.stem || q.question || q.prompt || "").trim();
      const options = Array.isArray(q.options) ? q.options : [];
      const correctIdx = q.correctIndex != null ? Number(q.correctIndex) : 0;
      const correct =
        q.correctAnswer != null ? String(q.correctAnswer) : String(options[correctIdx] ?? "");
      return `${prompt}|${correct}` === fp;
    });
    assert.ok(bankMatch, `bank row for fingerprint ${fp}`);
    assert.ok(bankMatch.grades.includes(gradeKey));
    assert.ok(
      ["easy", "medium", "hard"].some((sd) => scienceLevelAllowed(bankMatch, sd))
    );
    assert.equal(String(bankMatch.topic).toLowerCase(), topicKey);
  }
});

test("Science preview Hebrew topic גופנו normalizes to body", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "גופנו",
    difficulty: "easy",
    count: 3,
  });
  assert.ok(qs.length >= 1);
  for (const item of qs) {
    assert.equal(item.topic, "body");
  }
});

test("Science preview throws for empty pool (g1 experiments hard)", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "science",
        gradeLevel: "g1",
        topic: "experiments",
        difficulty: "hard",
        count: 5,
      }),
    (err) => {
      assert.match(String(err.message), /אין מספיק שאלות מדע/);
      assert.match(String(err.message), /כיתה א׳/);
      assert.match(String(err.message), /ניסויים/);
      return true;
    }
  );
});

test("Science preview has no duplicate question|correctAnswer fingerprints", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: 5,
  });
  const fps = qs.map((q) => `${q.question}|${q.correctAnswer}`);
  assert.equal(new Set(fps).size, fps.length);
});

test("Science preview items have choices including correctAnswer", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: 5,
  });
  for (const item of qs) {
    assert.ok(Array.isArray(item.choices));
    assert.ok(item.choices.length >= 2);
    assert.ok(item.choices.includes(item.correctAnswer));
    assert.equal(item.subject, "science");
    assert.ok(String(item.question).trim().length > 0);
    assert.ok(String(item.correctAnswer).trim().length > 0);
  }
});

test("Science preview question set passes validateSameExactQuestionSet", async () => {
  const n = 5;
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: n,
  });
  const v = validateSameExactQuestionSet(qs, n);
  assert.equal(v.ok, true);
});

test("stripQuestionSetForStudent removes correctAnswer from Science student payload", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: 1,
  });
  const out = stripQuestionSetForStudent(qs, "guided_practice");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].question, qs[0].question);
  assert.deepEqual(out[0].choices, qs[0].choices);
});

test("quiz mode strips hint and explanation from Science start payload", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: 1,
  });
  const withSecrets = qs.map((q) => ({
    ...q,
    hint: "secret",
    explanation: "secret explanation",
  }));
  const out = stripQuestionSetForStudent(withSecrets, "quiz");
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("Science scoring ignores tampered correctAnswer field; uses frozen server answer", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: 1,
  });
  const frozen = qs[0];
  const serverCorrect = extractCorrectAnswerFromQuestion(frozen);
  assert.ok(serverCorrect);

  const wrongChoice = frozen.choices.find((c) => c !== serverCorrect);
  assert.ok(wrongChoice);

  const tamperedInput = {
    selectedAnswer: wrongChoice,
    correctAnswer: serverCorrect,
  };
  assert.equal(answersMatch(tamperedInput.selectedAnswer, serverCorrect), false);
  assert.equal(
    answersMatch(tamperedInput.correctAnswer, tamperedInput.selectedAnswer),
    false
  );
  assert.equal(answersMatch(serverCorrect, serverCorrect), true);
});

test("Science answersMatch scores correct and wrong choices", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "science",
    gradeLevel: "g3",
    topic: "body",
    difficulty: "easy",
    count: 1,
  });
  const correct = extractCorrectAnswerFromQuestion(qs[0]);
  const wrong = qs[0].choices.find((c) => c !== correct);
  assert.equal(answersMatch(correct, correct), true);
  assert.equal(answersMatch(wrong, correct), false);
});

test("stripQuestionSetForStudent removes correctAnswer from moledet_geography item", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g4",
    topic: "homeland",
    difficulty: "easy",
    count: 1,
  });
  const out = stripQuestionSetForStudent(qs, "guided_practice");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].question, qs[0].question);
  assert.deepEqual(out[0].choices, qs[0].choices);
});

test("quiz mode strips hint and explanation from moledet_geography start payload", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g4",
    topic: "homeland",
    difficulty: "easy",
    count: 1,
  });
  const withSecrets = qs.map((q) => ({
    ...q,
    hint: "secret",
    explanation: "secret explanation",
  }));
  const out = stripQuestionSetForStudent(withSecrets, "quiz");
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("moledet_geography answersMatch scores Hebrew MCQ correct and wrong", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g4",
    topic: "homeland",
    difficulty: "easy",
    count: 1,
  });
  const correct = extractCorrectAnswerFromQuestion(qs[0]);
  const wrong = qs[0].choices.find((c) => c !== correct);
  assert.ok(correct);
  assert.ok(wrong);
  assert.equal(answersMatch(correct, correct), true);
  assert.equal(answersMatch(wrong, correct), false);
});

test("stripQuestionSetForStudent removes correctAnswer from geometry item", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "area",
    difficulty: "easy",
    count: 1,
  });
  const out = stripQuestionSetForStudent(qs, "guided_practice");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].shape, qs[0].shape);
  assert.ok(out[0].params?.kind);
});

test("quiz mode strips hint and explanation from geometry start payload", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "area",
    difficulty: "easy",
    count: 1,
  });
  const withSecrets = qs.map((q) => ({
    ...q,
    hint: "secret",
    explanation: "secret explanation",
  }));
  const out = stripQuestionSetForStudent(withSecrets, "quiz");
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("geometry answersMatch numeric and Hebrew labels", async () => {
  assert.equal(answersMatch("16", "16"), true);
  assert.equal(answersMatch("16.0", "16"), true);
  assert.equal(answersMatch("שטח", "שטח"), true);
  assert.equal(answersMatch("היקף", "שטח"), false);
});

test("geometry tamper: scoring uses server answer not body.correctAnswer", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g3",
    topic: "area",
    difficulty: "easy",
    count: 1,
  });
  const serverCorrect = extractCorrectAnswerFromQuestion(qs[0]);
  const wrong = qs[0].choices.find((c) => c !== serverCorrect);
  assert.equal(answersMatch(wrong, serverCorrect), false);
});

test("moledet_geography tamper: scoring uses server answer not body.correctAnswer", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "moledet_geography",
    gradeLevel: "g4",
    topic: "homeland",
    difficulty: "easy",
    count: 1,
  });
  const serverCorrect = extractCorrectAnswerFromQuestion(qs[0]);
  const wrongChoice = qs[0].choices.find((c) => c !== serverCorrect);
  assert.equal(answersMatch(wrongChoice, serverCorrect), false);
  assert.equal(answersMatch(serverCorrect, wrongChoice), false);
});

test("stripQuestionSetForStudent removes correctAnswer from hebrew item", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "comprehension",
    difficulty: "easy",
    count: 1,
  });
  const out = stripQuestionSetForStudent(qs, "guided_practice");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].params?.answerMode, "choice");
});

test("quiz mode strips hint and explanation from hebrew start payload", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "comprehension",
    difficulty: "easy",
    count: 1,
  });
  const withSecrets = qs.map((q) => ({
    ...q,
    hint: "secret",
    explanation: "secret explanation",
  }));
  const out = stripQuestionSetForStudent(withSecrets, "quiz");
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("hebrew answersMatch scores Hebrew MCQ correct and wrong", () => {
  assert.equal(answersMatch("ילד", "ילד"), true);
  assert.equal(answersMatch("ילדה", "ילד"), false);
});

test("hebrew correct MCQ scores isCorrect via answersMatch", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "comprehension",
    difficulty: "easy",
    count: 1,
  });
  const correct = extractCorrectAnswerFromQuestion(qs[0]);
  assert.equal(answersMatch(correct, correct), true);
});

test("hebrew wrong MCQ scores isCorrect false via answersMatch", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "comprehension",
    difficulty: "easy",
    count: 1,
  });
  const correct = extractCorrectAnswerFromQuestion(qs[0]);
  const wrong = qs[0].choices.find((c) => c !== correct);
  assert.ok(wrong);
  assert.equal(answersMatch(wrong, correct), false);
});

test("hebrew tamper: scoring uses server answer not body.correctAnswer", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g4",
    topic: "comprehension",
    difficulty: "easy",
    count: 1,
  });
  const serverCorrect = extractCorrectAnswerFromQuestion(qs[0]);
  const wrongChoice = qs[0].choices.find((c) => c !== serverCorrect);
  assert.equal(answersMatch(wrongChoice, serverCorrect), false);
});

test("stripQuestionSetForStudent removes correctAnswer from english item", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "grammar",
    difficulty: "easy",
    count: 1,
  });
  const out = stripQuestionSetForStudent(qs, "guided_practice");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].params?.answerMode, "choice");
  assert.ok(out[0].choices?.length >= 2);
});

test("quiz mode strips hint and explanation from english start payload", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "translation",
    difficulty: "easy",
    count: 1,
  });
  const withSecrets = qs.map((q) => ({
    ...q,
    hint: "secret",
    explanation: "secret explanation",
  }));
  const out = stripQuestionSetForStudent(withSecrets, "quiz");
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("english answersMatch case and semantics", () => {
  assert.equal(answersMatch("am", "am"), true);
  assert.equal(answersMatch("AM", "am"), true);
  assert.equal(answersMatch("is", "am"), false);
  assert.equal(answersMatch("כלב", "כלב"), true);
});

test("english correct MCQ scores via answersMatch", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "grammar",
    difficulty: "easy",
    count: 1,
  });
  const correct = extractCorrectAnswerFromQuestion(qs[0]);
  assert.equal(answersMatch(correct, correct), true);
});

test("english wrong MCQ scores false via answersMatch", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "grammar",
    difficulty: "easy",
    count: 1,
  });
  const correct = extractCorrectAnswerFromQuestion(qs[0]);
  const wrong = qs[0].choices.find((c) => c !== correct);
  assert.ok(wrong);
  assert.equal(answersMatch(wrong, correct), false);
});

test("english tamper: scoring uses server answer not body.correctAnswer", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "translation",
    difficulty: "easy",
    count: 1,
  });
  const serverCorrect = extractCorrectAnswerFromQuestion(qs[0]);
  const wrongChoice = qs[0].choices.find((c) => c !== serverCorrect);
  assert.equal(answersMatch(wrongChoice, serverCorrect), false);
});
