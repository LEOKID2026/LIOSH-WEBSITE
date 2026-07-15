/**
 * Phase 8 — MCQ / question-to-engine compatibility test gate
 * Run: node --test tests/learning/phase8-mcq-engine-contract.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  QUESTION_ENGINE_VERSION,
  MAX_MCQ_CHOICES,
  VALUE_MAX_LEN,
  DISTRACTOR_UNKNOWN,
  buildQuestionEngineMetadataFromQuestion,
  normalizeQuestionEnginePayload,
  buildAssignedQuestionSnapshotWithEngine,
  extractRecentMistakeEngineFields,
  auditQuestionEngineMetadata,
  detectStemLeak,
} from "../../lib/learning/question-engine-metadata.js";

import { buildMathMcqAnswerList } from "../../utils/math-question-generator.js";

import {
  aggregateReportPayloadFromActivityRows,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

const FROM_DATE = new Date("2026-01-01T00:00:00.000Z");
const TO_DATE = new Date("2026-01-31T00:00:00.000Z");
const FETCH_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function makeStudent(id = "stu-p8") {
  return { id, full_name: "Phase 8 Student", grade_level: "g3", is_active: true };
}

function makeSession(id, subject, topic = "algebra") {
  return {
    id,
    student_id: "stu-p8",
    subject,
    topic,
    started_at: "2026-01-10T10:00:00Z",
    ended_at: "2026-01-10T10:30:00Z",
    duration_seconds: 300,
    status: "completed",
    metadata: { mode: "practice" },
  };
}

function makeWrongMcqAnswer(sessionId, subject, topic, questionEngine) {
  return {
    id: `ans-p8-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-p8",
    learning_session_id: sessionId,
    question_id: "q-mcq-wrong",
    is_correct: false,
    answered_at: "2026-01-10T10:05:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: "practice",
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_independent",
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
      prompt: "3 + 5 = ?",
      expectedAnswer: "8",
      userAnswer: "15",
      questionEngine,
    },
  };
}

describe("Phase 8 - question engine contract", () => {
  test("MCQ allAnswerChoices persisted with max 8 and truncation", () => {
    const long = "x".repeat(VALUE_MAX_LEN + 50);
    const choices = Array.from({ length: 10 }, (_, i) => ({
      value: i === 0 ? long : `opt-${i}`,
      distractorFamily: i === 1 ? "mul_instead_of_add" : undefined,
    }));
    const engine = buildQuestionEngineMetadataFromQuestion(
      { type: "mcq", answers: choices, correctAnswer: long },
      { selectedValue: long, generatorSource: "test" }
    );
    const normalized = normalizeQuestionEnginePayload(engine);

    assert.ok(normalized);
    assert.equal(normalized.version, QUESTION_ENGINE_VERSION);
    assert.equal(normalized.allAnswerChoices.length, MAX_MCQ_CHOICES);
    assert.equal(normalized.allAnswerChoices[0].value.length, VALUE_MAX_LEN);
    assert.equal(normalized.allAnswerChoices[1].distractorFamily, "mul_instead_of_add");
  });

  test("selected and correct answer refs preserved", () => {
    const question = {
      type: "mcq",
      answers: [
        { value: "8", distractorFamily: "unknown" },
        { value: "15", distractorFamily: "mul_instead_of_add" },
      ],
      correctAnswer: "8",
    };
    const engine = normalizeQuestionEnginePayload(
      buildQuestionEngineMetadataFromQuestion(question, {
        selectedValue: "15",
        generatorSource: "math-master",
      })
    );

    assert.equal(engine.selectedAnswer.value, "15");
    assert.equal(engine.correctAnswer.value, "8");
    assert.equal(engine.distractorFamily, "mul_instead_of_add");
  });

  test("stem leak audit flags stem containing correct answer", () => {
    assert.equal(detectStemLeak("The answer is 42", 42), true);
    const engine = buildQuestionEngineMetadataFromQuestion(
      { question: "Pick 42 today", answers: ["41", "42", "43"], correctAnswer: "42" },
      { selectedValue: "41" }
    );
    const audit = auditQuestionEngineMetadata(engine);
    assert.equal(engine.answerLeakageRisk, "stem_leak");
    assert.ok(audit.issues.includes("stem_leak_detected"));
  });

  test("plain-string MCQ options use unknown distractor sentinel", () => {
    const engine = normalizeQuestionEnginePayload(
      buildQuestionEngineMetadataFromQuestion(
        { answers: ["a", "b", "c"], correctAnswer: "b" },
        { selectedValue: "a" }
      )
    );
    assert.equal(engine.distractorFamily, DISTRACTOR_UNKNOWN);
    assert.equal(engine.metadataConfidence, "partial");
  });

  test("math buildMathMcqAnswerList pilot tags mul_instead_of_add", () => {
    const answers = buildMathMcqAnswerList(
      8,
      "addition",
      { kind: "add_two", a: 3, b: 5 },
      (min) => min,
      (x) => x
    );
    assert.ok(Array.isArray(answers));
    const mulCell = answers.find((c) => (typeof c === "object" ? c.value : c) === 15);
    assert.ok(mulCell, "expected 3*5 distractor");
    assert.equal(
      typeof mulCell === "object" ? mulCell.distractorFamily : null,
      "mul_instead_of_add"
    );
  });

  test("normalizeQuestionEnginePayload keeps nested block only", () => {
    const raw = {
      questionType: "mcq",
      allAnswerChoices: [{ index: 0, value: "1" }, { index: 1, value: "2" }],
      selectedAnswer: { value: "2", index: 1 },
      correctAnswer: { value: "1", index: 0 },
      distractorFamily: "unknown",
      answerLeakageRisk: "none",
      userAnswer: "should-not-flat-persist",
      expectedAnswer: "also-flat",
    };
    const normalized = normalizeQuestionEnginePayload(raw);
    assert.equal(normalized.userAnswer, undefined);
    assert.equal(normalized.expectedAnswer, undefined);
    assert.equal(normalized.questionType, "mcq");
  });

  test("buildAssignedQuestionSnapshotWithEngine nests questionEngine at answer time", () => {
    const snapshot = buildAssignedQuestionSnapshotWithEngine(
      { question: "2+2?", choices: ["3", "4"], correct_answer: "4" },
      "3",
      { generatorSource: "parent-assigned-activity" }
    );
    assert.equal(snapshot.question, "2+2?");
    assert.ok(snapshot.questionEngine);
    assert.equal(snapshot.questionEngine.questionType, "mcq");
    assert.equal(snapshot.questionEngine.selectedAnswer.value, "3");
    assert.equal(snapshot.questionEngine.generatorSource, "parent-assigned-activity");
  });

  test("extractRecentMistakeEngineFields is storage-only pass-through", () => {
    const fields = extractRecentMistakeEngineFields({
      distractorFamily: "mul_instead_of_add",
      questionType: "mcq",
      skillId: "math.add_two",
      metadataConfidence: "full",
      allAnswerChoices: [{ value: "1" }],
      answerLeakageRisk: "stem_leak",
    });
    assert.deepEqual(fields, {
      distractorFamily: "mul_instead_of_add",
      questionType: "mcq",
      skillId: "math.add_two",
      metadataConfidence: "full",
    });
    assert.equal(fields.allAnswerChoices, undefined);
    assert.equal(fields.answerLeakageRisk, undefined);
  });
});

describe("Phase 8 - aggregator integration", () => {
  test("recentMistakes enriched from answer_payload.questionEngine", () => {
    const session = makeSession("sess-p8", "math");
    const engine = normalizeQuestionEnginePayload(
      buildQuestionEngineMetadataFromQuestion(
        {
          type: "mcq",
          answers: [
            { value: "8" },
            { value: "15", distractorFamily: "mul_instead_of_add" },
          ],
          correctAnswer: "8",
          params: { diagnosticSkillId: "math.add_two" },
        },
        { selectedValue: "15", generatorSource: "math-master" }
      )
    );

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [makeWrongMcqAnswer(session.id, "math", "addition", engine)],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    assert.equal(result.recentMistakes.length, 1);
    const mistake = result.recentMistakes[0];
    assert.equal(mistake.distractorFamily, "mul_instead_of_add");
    assert.equal(mistake.questionType, "mcq");
    assert.equal(mistake.skillId, "math.add_two");
    assert.ok(mistake.metadataConfidence);
  });

  test("recentMistakes enriched from parent attempt question_snapshot.questionEngine", () => {
    const parentAttempt = {
      id: "par-att-p8",
      student_id: "stu-p8",
      activity_id: "par-act-p8",
      question_index: 0,
      skill_key: "addition",
      is_correct: false,
      selected_answer: "15",
      correct_answer: "8",
      time_spent_ms: 5000,
      hints_used: 0,
      answered_at: "2026-01-10T11:00:00Z",
      question_snapshot: {
        question: "3 + 5 = ?",
        choices: ["8", "15"],
        correct_answer: "8",
        isDiagnosticEligible: true,
        evidenceCategory: "diagnostic_independent",
        contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
        questionEngine: {
          version: QUESTION_ENGINE_VERSION,
          questionType: "mcq",
          distractorFamily: "mul_instead_of_add",
          skillId: "math.add_two",
          metadataConfidence: "full",
          answerLeakageRisk: "none",
        },
      },
      parent_assigned_activities: {
        subject: "math",
        topic: "addition",
        mode: "quiz",
        difficulty_level: "medium",
      },
    };

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [],
      [],
      FROM_DATE,
      TO_DATE,
      FETCH_META,
      [parentAttempt]
    );

    assert.equal(result.recentMistakes.length, 1);
    assert.equal(result.recentMistakes[0].distractorFamily, "mul_instead_of_add");
    assert.equal(result.recentMistakes[0].skillId, "math.add_two");
  });

  test("questionEngine does not change diagnosticAccuracy or positiveEvidence", () => {
    const session = makeSession("sess-baseline", "math");
    const baseAnswers = [
      makeWrongMcqAnswer(session.id, "math", "addition", null),
      {
        ...makeWrongMcqAnswer(session.id, "math", "addition", null),
        id: "ans-correct",
        is_correct: true,
        answer_payload: {
          ...makeWrongMcqAnswer(session.id, "math", "addition", null).answer_payload,
          userAnswer: "8",
        },
      },
    ];

    const enrichedAnswers = baseAnswers.map((row, i) => {
      if (!row.is_correct) {
        const engine = normalizeQuestionEnginePayload(
          buildQuestionEngineMetadataFromQuestion(
            {
              type: "mcq",
              answers: [{ value: "8" }, { value: "15", distractorFamily: "mul_instead_of_add" }],
              correctAnswer: "8",
            },
            { selectedValue: "15" }
          )
        );
        return {
          ...row,
          answer_payload: { ...row.answer_payload, questionEngine: engine },
        };
      }
      return row;
    });

    const withoutEngine = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      baseAnswers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const withEngine = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      enrichedAnswers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    assert.equal(withoutEngine.summary.diagnosticAccuracy, withEngine.summary.diagnosticAccuracy);
    assert.equal(
      withoutEngine.subjects.math.diagnosticAccuracy,
      withEngine.subjects.math.diagnosticAccuracy
    );
    assert.deepEqual(
      withoutEngine.positiveEvidence?.signals?.map((s) => s.id).sort(),
      withEngine.positiveEvidence?.signals?.map((s) => s.id).sort()
    );
  });

  test("stripInternalReportPayloadFields preserves recentMistakes engine fields", () => {
    const session = makeSession("sess-strip", "math");
    const engine = normalizeQuestionEnginePayload(
      buildQuestionEngineMetadataFromQuestion(
        {
          type: "mcq",
          answers: [{ value: "8" }, { value: "15", distractorFamily: "mul_instead_of_add" }],
          correctAnswer: "8",
        },
        { selectedValue: "15" }
      )
    );
    const raw = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [makeWrongMcqAnswer(session.id, "math", "addition", engine)],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const stripped = stripInternalReportPayloadFields(raw);
    assert.equal(stripped.recentMistakes[0].distractorFamily, "mul_instead_of_add");
    assert.equal(stripped.recentMistakes[0].questionType, "mcq");
    assert.equal(stripped.meta.version, "phase-8-mcq-engine-contract");
  });

  test("legacy rows without questionEngine still aggregate", () => {
    const session = makeSession("sess-legacy", "math");
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [makeWrongMcqAnswer(session.id, "math", "addition", null)],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.equal(result.recentMistakes.length, 1);
    assert.equal(result.recentMistakes[0].distractorFamily, undefined);
    assert.equal(result.summary.diagnosticAccuracy, 0);
  });
});
