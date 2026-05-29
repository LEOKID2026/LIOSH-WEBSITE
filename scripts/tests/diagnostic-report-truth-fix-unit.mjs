/**
 * Targeted unit tests for diagnostic report truth fixes (HIGH #2b, optional LOW #3).
 * Run: node scripts/tests/diagnostic-report-truth-fix-unit.mjs
 */

import assert from "node:assert/strict";
import {
  aggregateClassReportFromStudentPayloads,
} from "../../lib/teacher-server/teacher-class-report.server.js";
import {
  buildClassroomActivityRollupsByStudentId,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { buildClassTeacherGuidanceV2 } from "../../lib/teacher-server/teacher-guidance-v2.server.js";
import {
  applyServerParentFacingAuthorityToClientReport,
  isServerThinDataReportPayload,
} from "../../lib/parent-server/parent-facing-report-authority.js";
import { stripInternalReportPayloadFields } from "../../lib/parent-server/report-data-aggregate.server.js";

function mockMathPayload(answers = 20, correct = 14) {
  return {
    summary: {
      totalSessions: 4,
      totalAnswers: answers,
      correctAnswers: correct,
      wrongAnswers: answers - correct,
      accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
    },
    subjects: {
      math: {
        sessions: 4,
        answers,
        correct,
        wrong: answers - correct,
        accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
        topics: {
          fractions: {
            answers,
            correct,
            wrong: answers - correct,
            accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
          },
        },
      },
    },
    dailyActivity: [],
    recentMistakes: [],
  };
}

function mockEnglishPayload(answers = 15, correct = 9) {
  return {
    summary: {
      totalSessions: 3,
      totalAnswers: answers,
      correctAnswers: correct,
      wrongAnswers: answers - correct,
      accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
    },
    subjects: {
      english: {
        sessions: 3,
        answers,
        correct,
        wrong: answers - correct,
        accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
        topics: {
          vocabulary: {
            answers,
            correct,
            wrong: answers - correct,
            accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
          },
        },
      },
    },
    dailyActivity: [],
    recentMistakes: [],
  };
}

function mockSciencePayload(answers = 10, correct = 5) {
  return {
    summary: {
      totalSessions: 2,
      totalAnswers: answers,
      correctAnswers: correct,
      wrongAnswers: answers - correct,
      accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
    },
    subjects: {
      science: {
        sessions: 2,
        answers,
        correct,
        wrong: answers - correct,
        accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
        topics: {
          plants: {
            answers,
            correct,
            wrong: answers - correct,
            accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0,
          },
        },
      },
    },
    dailyActivity: [],
    recentMistakes: [],
  };
}

// A — parent preview must not merge classroom activity (pure payload parity)
{
  const basePayload = {
    range: { from: "2026-05-01", to: "2026-05-18" },
    ...mockMathPayload(25, 18),
  };
  const studentId = "11111111-1111-4111-8111-111111111111";
  const activityId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const rollups = buildClassroomActivityRollupsByStudentId({
    activities: [
      {
        id: activityId,
        subject: "math",
        topic: "multiplication",
        closed_at: "2026-05-15T12:00:00.000Z",
      },
    ],
    statuses: [
      {
        activity_id: activityId,
        student_id: studentId,
        status: "submitted",
        submitted_at: "2026-05-15T12:00:00.000Z",
        answers_count: 15,
        correct_count: 12,
      },
    ],
    studentIds: [studentId],
  });

  const parentEquivalent = structuredClone(basePayload);
  const inflatedPreview = mergeClassroomActivityRollupIntoReportPayload(
    structuredClone(basePayload),
    rollups.get(studentId)
  );

  assert.equal(parentEquivalent.summary.totalAnswers, 25, "parent baseline answers");
  assert.equal(inflatedPreview.summary.totalAnswers, 40, "merged preview would inflate totals");
  assert.notEqual(
    parentEquivalent.summary.totalAnswers,
    inflatedPreview.summary.totalAnswers,
    "classroom merge changes totals — parent preview must skip this merge"
  );
}

// C — subject scope regression: math-only scope excludes english/science from cohort totals
{
  const studentPayloads = [
    {
      studentId: "student-a",
      studentFullNameMasked: "א׳",
      payload: mockMathPayload(20, 14),
    },
    {
      studentId: "student-b",
      studentFullNameMasked: "ב׳",
      payload: {
        ...mockMathPayload(25, 20),
        subjects: {
          ...mockMathPayload(25, 20).subjects,
          ...mockSciencePayload(10, 5).subjects,
        },
        summary: {
          totalSessions: 6,
          totalAnswers: 35,
          correctAnswers: 25,
          wrongAnswers: 10,
          accuracy: 71.4,
        },
      },
    },
    {
      studentId: "student-c",
      studentFullNameMasked: "ג׳",
      payload: mockEnglishPayload(15, 9),
    },
  ];

  const mathOnly = aggregateClassReportFromStudentPayloads(studentPayloads, {
    scopeSubjects: new Set(["math"]),
  });
  const classGuidance = buildClassTeacherGuidanceV2(
    { ...mathOnly, students: studentPayloads },
    { subjectScope: "math", studentPayloads }
  );

  assert.equal(mathOnly.subjects.math.answers, 45, "math subject rollup (20+25)");
  assert.ok(
    mathOnly.subjects.math.accuracy >= 75 && mathOnly.subjects.math.accuracy <= 76,
    "math subject accuracy must exclude english/science"
  );
  assert.ok(
    !(mathOnly.weaknessTopics || []).some((w) => w.subject === "english"),
    "english weakness excluded when scope is math"
  );
  assert.ok(
    !(mathOnly.weaknessTopics || []).some((w) => w.subject === "science"),
    "science weakness excluded when scope is math"
  );
  assert.equal(
    mathOnly.subjects.english?.answers || 0,
    0,
    "english subject rollup must stay empty under math scope"
  );
  assert.equal(
    mathOnly.subjects.science?.answers || 0,
    0,
    "science subject rollup must stay empty under math scope"
  );
  assert.ok(
    (classGuidance.recommendationUnits || []).every((u) => u.subject === "math"),
    "class guidance units must respect math-only scope"
  );
}

assert.equal(isServerThinDataReportPayload({ summary: { totalAnswers: 3, totalSessions: 1 } }), true);
assert.equal(isServerThinDataReportPayload({ summary: { totalAnswers: 20, totalSessions: 4 } }), false);

const clientBase = {
  analysis: { recommendations: [{ text: "client rec" }] },
  patternDiagnostics: {
    subjects: {
      math: {
        parentRecommendationsImprove: ["do more"],
        studentRecommendationsImprove: ["practice"],
      },
    },
  },
};
const apiThin = {
  summary: { totalAnswers: 2, totalSessions: 1 },
  parentFacing: {
    insights: ["יש עדיין מעט נתוני תרגול"],
    homeRecommendations: ["תרגול קצר"],
  },
};
applyServerParentFacingAuthorityToClientReport(clientBase, apiThin);
assert.equal(clientBase._parentFacingAuthority, "server");
assert.equal(clientBase.parentFacing.insights[0], apiThin.parentFacing.insights[0]);
assert.equal(clientBase.analysis.recommendations.length, 0);
assert.equal(Object.keys(clientBase.patternDiagnostics?.subjects || {}).length, 0);

const stripped = stripInternalReportPayloadFields({ summary: {}, _dailyBySubject: { "2026-01-01": {} } });
assert.equal(Object.prototype.hasOwnProperty.call(stripped, "_dailyBySubject"), false);

console.log("diagnostic-report-truth-fix-unit: ok");
