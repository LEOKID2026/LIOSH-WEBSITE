/**
 * Unit tests for Teacher Guidance V2 builders.
 * Run: node scripts/tests/teacher-guidance-v2-unit.mjs
 */

import assert from "node:assert/strict";
import {
  buildStudentTeacherGuidanceV2,
  buildClassTeacherGuidanceV2,
  resolveTopicLabelHe,
  isTeacherRecommendableTopicKey,
} from "../../lib/teacher-server/teacher-guidance-v2.server.js";
import { aggregateClassReportFromStudentPayloads } from "../../lib/teacher-server/teacher-class-report.server.js";

function mockStudentPayload() {
  return {
    summary: {
      totalSessions: 8,
      totalAnswers: 24,
      correctAnswers: 8,
      wrongAnswers: 16,
      accuracy: 33.3,
    },
    subjects: {
      math: {
        sessions: 5,
        answers: 12,
        correct: 4,
        wrong: 8,
        accuracy: 33.3,
        topics: {
          fractions: { answers: 12, correct: 4, wrong: 8, accuracy: 33.3 },
          multiplication: { answers: 6, correct: 5, wrong: 1, accuracy: 83.3 },
        },
      },
    },
    recentMistakes: [
      {
        subject: "math",
        topic: "fractions",
        prompt: "1/2 + 1/3",
        userAnswer: "2/5",
        expectedAnswer: "5/6",
        answeredAt: "2026-05-20T10:00:00.000Z",
      },
      {
        subject: "math",
        topic: "fractions",
        prompt: "2/3 + 1/4",
        userAnswer: "3/7",
        expectedAnswer: "11/12",
        answeredAt: "2026-05-19T10:00:00.000Z",
      },
      {
        subject: "math",
        topic: "fractions",
        prompt: "1/4 + 1/4",
        userAnswer: "1/8",
        expectedAnswer: "1/2",
        answeredAt: "2026-05-18T10:00:00.000Z",
      },
    ],
    dailyActivity: [{ date: "2026-05-20", sessions: 1, answers: 3 }],
  };
}

// 1 — topic label never raw key
{
  const label = resolveTopicLabelHe("math", "fractions");
  assert.notEqual(label, "fractions", "raw topic key must not appear as label");
  assert.ok(label && label.length > 0, "label must be non-empty Hebrew");
  assert.equal(resolveTopicLabelHe("math", "general"), null);
  assert.equal(resolveTopicLabelHe("hebrew", "fact_vs_opinion"), "עובדה מול דעה");
  assert.equal(isTeacherRecommendableTopicKey("general"), false);
}

// 2 — student V2 shape
{
  const block = buildStudentTeacherGuidanceV2(mockStudentPayload());
  assert.equal(block.version, "v2");
  assert.ok(Array.isArray(block.recommendationUnits));
  assert.ok(block.recommendationUnits.length > 0, "should have weak topic units");
  const unit = block.recommendationUnits[0];
  assert.notEqual(unit.topicLabelHe, "fractions");
  assert.ok(unit.evidenceSummary.wrongCount >= 3);
  assert.ok(
    ["class_reteach", "small_group", "individual_practice", "collect_more_data"].includes(
      unit.recommendedActionType
    )
  );
  for (const code of block.supportSuggestions || []) {
    assert.ok(
      code === "review_fundamentals" ||
        code === "encourage_session_start" ||
        code.startsWith("targeted_review:") ||
        code.startsWith("focus_practice:"),
      `V1 supportSuggestions must not contain V2 codes: ${code}`
    );
  }
  for (const s of block.supportSuggestionsV2 || []) {
    assert.ok(s.topicLabelHe !== "fractions");
    assert.notEqual(s.topicLabelHe, "נושא לא מסווג");
  }
}

// 2b — general bucket excluded from recommendations
{
  const block = buildStudentTeacherGuidanceV2({
    ...mockStudentPayload(),
    subjects: {
      math: {
        sessions: 5,
        answers: 12,
        correct: 4,
        wrong: 8,
        accuracy: 33.3,
        topics: {
          general: { answers: 20, correct: 2, wrong: 18, accuracy: 10 },
          fractions: { answers: 12, correct: 4, wrong: 8, accuracy: 33.3 },
        },
      },
    },
  });
  assert.ok(
    block.recommendationUnits.every((u) => u.topic !== "general"),
    "general must not appear in recommendation units"
  );
  assert.ok(
    block.recommendationUnits.some((u) => u.topic === "fractions"),
    "labeled weak topic should still appear"
  );
}

// 3 — insufficient data
{
  const block = buildStudentTeacherGuidanceV2({
    summary: { totalSessions: 0, totalAnswers: 2 },
    subjects: {},
  });
  assert.equal(block.insufficientData, true);
  assert.deepEqual(block.recommendationUnits, []);
}

// 4 — subject filter
{
  const permitted = new Set(["math"]);
  const block = buildStudentTeacherGuidanceV2(
    {
      ...mockStudentPayload(),
      subjects: {
        math: mockStudentPayload().subjects.math,
        english: {
          sessions: 5,
          answers: 10,
          correct: 2,
          wrong: 8,
          accuracy: 20,
          topics: { vocabulary: { answers: 10, correct: 2, wrong: 8, accuracy: 20 } },
        },
      },
    },
    { permittedSubjects: permitted }
  );
  assert.ok(
    block.recommendationUnits.every((u) => u.subject === "math"),
    "only permitted subjects in units"
  );
}

// 5 — class subject scoping in aggregation
{
  const payloads = [
    {
      studentId: "s1",
      studentFullNameMasked: "א׳",
      payload: mockStudentPayload(),
    },
    {
      studentId: "s2",
      studentFullNameMasked: "ב׳",
      payload: {
        ...mockStudentPayload(),
        subjects: {
          english: {
            sessions: 3,
            answers: 9,
            correct: 3,
            wrong: 6,
            accuracy: 33.3,
            topics: {
              vocabulary: { answers: 9, correct: 3, wrong: 6, accuracy: 33.3 },
            },
          },
        },
      },
    },
  ];
  const all = aggregateClassReportFromStudentPayloads(payloads);
  const mathOnly = aggregateClassReportFromStudentPayloads(payloads, {
    scopeSubjects: new Set(["math"]),
  });
  assert.ok((all.weaknessTopics || []).some((w) => w.subject === "english"));
  assert.ok(
    !(mathOnly.weaknessTopics || []).some((w) => w.subject === "english"),
    "english weakness excluded when scope is math"
  );
}

// 6 — class guidance V2
{
  const payloads = [
    { studentId: "s1", studentFullNameMasked: "א׳", payload: mockStudentPayload() },
    { studentId: "s2", studentFullNameMasked: "ב׳", payload: mockStudentPayload() },
  ];
  const agg = aggregateClassReportFromStudentPayloads(payloads, {
    scopeSubjects: new Set(["math"]),
  });
  const classPayload = {
    ...agg,
    students: payloads.map((p) => ({
      studentId: p.studentId,
      studentFullNameMasked: p.studentFullNameMasked,
      summary: p.payload.summary,
    })),
    roster: { activeMemberCount: 2, studentCount: 2 },
  };
  const block = buildClassTeacherGuidanceV2(classPayload, {
    subjectScope: "math",
    studentPayloads: payloads,
  });
  assert.equal(block.version, "v2");
  assert.ok((block.classRecommendationUnits || []).length > 0);
  const unit = block.classRecommendationUnits[0];
  assert.notEqual(unit.topicLabelHe, "fractions");
}

console.log("teacher-guidance-v2-unit: all assertions passed");
