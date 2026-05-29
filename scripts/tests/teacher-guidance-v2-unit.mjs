/**
 * Unit tests for Teacher Guidance V2 builders.
 * Run: node scripts/tests/teacher-guidance-v2-unit.mjs
 */

import assert from "node:assert/strict";
import {
  buildStudentTeacherGuidanceV2,
  buildClassTeacherGuidanceV2,
  classifyDroppedTopicReason,
  detectFallbackDominance,
  resolveTopicLabelHe,
  isTeacherRecommendableTopicKey,
} from "../../lib/teacher-server/teacher-guidance-v2.server.js";
import {
  resolveMathSessionTopic,
  resolveGeometrySessionTopic,
} from "../../lib/learning/session-topic-helpers.js";
import { GRADES as MATH_GRADES } from "../../utils/math-constants.js";
import { getMathReportBucketDisplayName } from "../../utils/math-report-generator.js";
import {
  formatTeacherAttentionStudentLineHe,
  formatTeacherClassSuffixHe,
  topicLabelHe,
} from "../../lib/teacher-portal/teacher-ui.he.js";
import { aggregateClassReportFromStudentPayloads } from "../../lib/teacher-server/teacher-class-report.server.js";
import {
  deriveClassGuidanceSeverityTier,
  mapClassHealthSignalFromTier,
} from "../../lib/teacher-server/teacher-recommendations.server.js";

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
  assert.equal(topicLabelHe("math", "angles"), null);
  assert.equal(topicLabelHe("geometry", "angles::grade:g3"), "זוויות");
  assert.equal(formatTeacherClassSuffixHe("כיתה ג׳ 2"), "כיתה ג׳ 2");
  assert.equal(formatTeacherClassSuffixHe("ג׳ 2"), "כיתה ג׳ 2");
  assert.equal(
    formatTeacherAttentionStudentLineHe("שחר", "כיתה ג׳ 2"),
    "שחר · כיתה ג׳ 2"
  );
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

// 3b — thin total answers with multiple sessions must not produce recommendationUnits
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 2,
      totalAnswers: 4,
      correctAnswers: 2,
      wrongAnswers: 2,
      accuracy: 50,
    },
    subjects: {
      math: {
        sessions: 2,
        answers: 3,
        correct: 1,
        wrong: 2,
        accuracy: 33.3,
        topics: {
          fractions: { answers: 3, correct: 1, wrong: 2, accuracy: 33.3 },
        },
      },
    },
    recentMistakes: [],
    dailyActivity: [{ date: "2026-05-20", sessions: 1, answers: 2 }],
  });
  assert.equal(block.insufficientData, true);
  assert.deepEqual(block.recommendationUnits, []);
  assert.deepEqual(block.strengthUnits, []);
}

// 3c — enough total answers with one session still produces recommendationUnits
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 1,
      totalAnswers: 6,
      correctAnswers: 2,
      wrongAnswers: 4,
      accuracy: 33.3,
    },
    subjects: {
      math: {
        sessions: 1,
        answers: 6,
        correct: 2,
        wrong: 4,
        accuracy: 33.3,
        topics: {
          fractions: { answers: 6, correct: 2, wrong: 4, accuracy: 33.3 },
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
    dailyActivity: [{ date: "2026-05-20", sessions: 1, answers: 6 }],
  });
  assert.equal(block.insufficientData, false);
  assert.ok(
    block.recommendationUnits.length > 0,
    "6 answers with weak topic should still produce recommendationUnits"
  );
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

// 7 — new label-map expansion: all approved topic keys resolve to owner-approved Hebrew
{
  // Hebrew
  assert.equal(resolveTopicLabelHe("hebrew", "vowels_reading"),    "קריאה בניקוד",    "vowels_reading label");
  assert.equal(resolveTopicLabelHe("hebrew", "plurals"),           "יחיד ורבים",      "plurals label");
  assert.equal(resolveTopicLabelHe("hebrew", "verb_forms"),        "צורות הפועל",     "verb_forms label");
  assert.equal(resolveTopicLabelHe("hebrew", "sentence_structure"),"מבנה המשפט",      "sentence_structure label");

  // English
  assert.equal(resolveTopicLabelHe("english", "simple_sentences"), "משפטים פשוטים",   "simple_sentences label");

  // Science
  assert.equal(resolveTopicLabelHe("science", "living_things"),    "יצורים חיים",     "living_things label");
  assert.equal(resolveTopicLabelHe("science", "matter"),           "חומרים",          "matter label");
  assert.equal(resolveTopicLabelHe("science", "forces"),           "כוחות",           "forces label");

  // Moledet / Geography
  assert.equal(resolveTopicLabelHe("moledet_geography", "maps_basic"), "מפות בסיסיות", "maps_basic label");
  assert.equal(resolveTopicLabelHe("moledet_geography", "regions"),    "אזורים",        "regions label");
  assert.equal(resolveTopicLabelHe("moledet_geography", "history"),    "היסטוריה",      "history label");

  // Math
  assert.equal(resolveTopicLabelHe("math", "multiplication_advanced"), "כפל מתקדם",    "multiplication_advanced label");
}

// 8 — non-recommendable keys: general, empty, subject-name-as-topic, mixed
{
  assert.equal(resolveTopicLabelHe("hebrew", "general"),           null, "general → null");
  assert.equal(resolveTopicLabelHe("math",   "general"),           null, "general math → null");
  assert.equal(resolveTopicLabelHe("hebrew", ""),                  null, "empty → null");
  assert.equal(resolveTopicLabelHe("hebrew", null),                null, "null → null");
  assert.equal(resolveTopicLabelHe("hebrew", "hebrew"),            null, "subject-name-as-topic → null");
  assert.equal(resolveTopicLabelHe("science", "science"),          null, "subject-name-as-topic science → null");
  assert.equal(isTeacherRecommendableTopicKey("mixed"),            false,"mixed must not be recommendable");
  assert.equal(resolveTopicLabelHe("hebrew", "mixed"),             null, "mixed → null (not a recommendation topic)");
  assert.equal(resolveTopicLabelHe("math",   "mixed"),             null, "mixed math → null");

  // Verify mixed excluded from V2 units even with enough data
  const mixedBlock = buildStudentTeacherGuidanceV2({
    summary: { totalSessions: 10, totalAnswers: 30, correctAnswers: 9, wrongAnswers: 21, accuracy: 30 },
    subjects: {
      hebrew: {
        sessions: 10,
        answers: 30,
        correct: 9,
        wrong: 21,
        accuracy: 30,
        topics: {
          mixed:          { answers: 20, correct: 4,  wrong: 16, accuracy: 20 },
          vowels_reading: { answers: 10, correct: 5,  wrong: 5,  accuracy: 50 },
        },
      },
    },
    recentMistakes: [],
  });
  assert.ok(
    mixedBlock.recommendationUnits.every((u) => u.topic !== "mixed"),
    "mixed must not appear in recommendation units"
  );
  assert.ok(
    mixedBlock.recommendationUnits.every((u) => u.topicLabelHe !== "ערבוב"),
    "ערבוב must not appear as recommendation label"
  );
}

// S1 — 31% Hebrew, topics only general → subject fallback
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 5,
      totalAnswers: 20,
      correctAnswers: 6,
      wrongAnswers: 14,
      accuracy: 31,
    },
    subjects: {
      hebrew: {
        sessions: 5,
        answers: 20,
        correct: 6,
        wrong: 14,
        accuracy: 31,
        topics: {
          general: { answers: 20, correct: 6, wrong: 14, accuracy: 31 },
        },
      },
    },
    recentMistakes: [],
  });
  const subjUnit = block.recommendationUnits.find(
    (u) => u.level === "subject" && u.subject === "hebrew"
  );
  assert.ok(subjUnit, "S1: subject fallback required");
  assert.equal(subjUnit.topic, null);
  assert.equal(subjUnit.classificationGap, true);
  assert.equal(subjUnit.guidanceSeverityTier, "critical");
}

// S2 — 33% Moledet with unmapped topic keys
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 6,
      totalAnswers: 18,
      correctAnswers: 6,
      wrongAnswers: 12,
      accuracy: 33.3,
    },
    subjects: {
      moledet_geography: {
        sessions: 6,
        answers: 18,
        correct: 6,
        wrong: 12,
        accuracy: 33.3,
        topics: {
          unknown_topic_xyz: { answers: 18, correct: 6, wrong: 12, accuracy: 33.3 },
        },
      },
    },
    recentMistakes: [],
  });
  const subjUnit = block.recommendationUnits.find(
    (u) => u.level === "subject" && u.subject === "moledet_geography"
  );
  assert.ok(subjUnit, "S2: moledet subject fallback");
  assert.equal(subjUnit.topicLabelHe, null);
}

// S3 — 58% subject, no mapped topics
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 8,
      totalAnswers: 24,
      correctAnswers: 14,
      wrongAnswers: 10,
      accuracy: 58.3,
    },
    subjects: {
      english: {
        sessions: 8,
        answers: 24,
        correct: 14,
        wrong: 10,
        accuracy: 58.3,
        topics: {
          general: { answers: 24, correct: 14, wrong: 10, accuracy: 58.3 },
        },
      },
    },
    recentMistakes: [],
  });
  const subjUnit = block.recommendationUnits.find((u) => u.level === "subject");
  assert.ok(subjUnit, "S3: subject fallback at 58%");
  assert.equal(subjUnit.guidanceSeverityTier, "needs_reinforcement");
}

// S4 — 80%+ no weak units
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 10,
      totalAnswers: 50,
      correctAnswers: 42,
      wrongAnswers: 8,
      accuracy: 84,
    },
    subjects: {
      math: {
        sessions: 10,
        answers: 50,
        correct: 42,
        wrong: 8,
        accuracy: 84,
        topics: {
          general: { answers: 50, correct: 42, wrong: 8, accuracy: 84 },
        },
      },
    },
    recentMistakes: [],
  });
  assert.equal(
    block.recommendationUnits.filter((u) => u.level === "subject" || u.level === "topic").length,
    0,
    "S4: no weak recommendation units at 84%"
  );
}

// S5 — mapped topic + hebrew general weak
{
  const block = buildStudentTeacherGuidanceV2({
    ...mockStudentPayload(),
    subjects: {
      ...mockStudentPayload().subjects,
      hebrew: {
        sessions: 5,
        answers: 20,
        correct: 6,
        wrong: 14,
        accuracy: 30,
        topics: {
          general: { answers: 20, correct: 6, wrong: 14, accuracy: 30 },
        },
      },
    },
  });
  assert.ok(
    block.recommendationUnits.some((u) => u.topic === "fractions"),
    "S5: math topic unit"
  );
  assert.ok(
    block.recommendationUnits.some((u) => u.level === "subject" && u.subject === "hebrew"),
    "S5: hebrew subject fallback"
  );
}

// S6 — mapped topic only, no subject fallback for that subject
{
  const block = buildStudentTeacherGuidanceV2(mockStudentPayload());
  assert.ok(block.recommendationUnits.some((u) => u.topic === "fractions"));
  assert.ok(
    !block.recommendationUnits.some(
      (u) => u.level === "subject" && u.subject === "math"
    ),
    "S6: no subject fallback when topic unit exists"
  );
}

// C1 — 61% class, no mapped topic units
{
  const classPayload = {
    cohortSummary: {
      totalAnswers: 100,
      studentsWithActivity: 10,
      accuracy: 61,
      correctAnswers: 61,
      wrongAnswers: 39,
    },
    subjects: {
      hebrew: {
        answers: 100,
        correct: 61,
        wrong: 39,
        accuracy: 61,
        topics: {
          general: { answers: 100, correct: 61, wrong: 39, accuracy: 61 },
        },
      },
    },
    weaknessTopics: [],
    students: Array.from({ length: 10 }, (_, i) => ({
      studentId: `s${i}`,
      studentFullNameMasked: `תלמיד ${i}`,
      summary: { totalAnswers: 10, accuracy: 61 },
    })),
    roster: { activeMemberCount: 10, studentCount: 10 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload, { studentPayloads: [] });
  assert.equal(block.guidanceSeverityTier, "class_needs_reinforcement");
  assert.equal(block.teacherSummary.classHealthSignal, "needs_reinforcement");
  assert.ok(
    block.classRecommendationUnits.some((u) => u.level === "subject"),
    "C1: class subject fallback"
  );
  assert.notEqual(block.guidanceSeverityTier, "class_on_track");
}

// C2 — 64% class tier
{
  const classPayload = {
    cohortSummary: {
      totalAnswers: 80,
      studentsWithActivity: 8,
      accuracy: 64,
    },
    subjects: {},
    weaknessTopics: [],
    students: [],
    roster: { activeMemberCount: 8, studentCount: 8 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload);
  assert.equal(block.guidanceSeverityTier, "class_needs_reinforcement");
}

// C3 — 75%+ class on track
{
  const classPayload = {
    cohortSummary: {
      totalAnswers: 120,
      studentsWithActivity: 12,
      accuracy: 78,
    },
    subjects: {},
    weaknessTopics: [],
    students: [],
    roster: { activeMemberCount: 12, studentCount: 12 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload);
  assert.equal(block.guidanceSeverityTier, "class_on_track");
  assert.equal(block.teacherSummary.classHealthSignal, "strong");
}

// T1 — general/mixed never as topicLabelHe
{
  const block = buildStudentTeacherGuidanceV2({
    summary: {
      totalSessions: 5,
      totalAnswers: 30,
      correctAnswers: 9,
      wrongAnswers: 21,
      accuracy: 30,
    },
    subjects: {
      hebrew: {
        sessions: 5,
        answers: 30,
        correct: 9,
        wrong: 21,
        accuracy: 30,
        topics: {
          general: { answers: 15, correct: 3, wrong: 12, accuracy: 20 },
          mixed: { answers: 15, correct: 6, wrong: 9, accuracy: 40 },
        },
      },
    },
    recentMistakes: [],
  });
  for (const u of block.recommendationUnits) {
    assert.notEqual(u.topicLabelHe, "general");
    assert.notEqual(u.topicLabelHe, "mixed");
    assert.notEqual(u.topic, "general");
    assert.notEqual(u.topic, "mixed");
  }
}

// TC-1 — math multiplication topic unit
{
  const classPayload = {
    cohortSummary: {
      totalAnswers: 50,
      studentsWithActivity: 5,
      accuracy: 55,
      correctAnswers: 28,
      wrongAnswers: 22,
    },
    subjects: {
      math: {
        answers: 50,
        correct: 28,
        wrong: 22,
        accuracy: 56,
        topics: {
          multiplication: { answers: 50, correct: 28, wrong: 22, accuracy: 56 },
        },
      },
    },
    weaknessTopics: [
      {
        subject: "math",
        topic: "multiplication",
        wrong: 22,
        answers: 50,
        studentCount: 5,
        studentIds: ["s1", "s2", "s3", "s4", "s5"],
      },
    ],
    students: [],
    roster: { activeMemberCount: 5, studentCount: 5 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload, { subjectScope: "math" });
  const topicUnit = block.classRecommendationUnits.find(
    (u) => u.level === "topic" && u.topic === "multiplication"
  );
  assert.ok(topicUnit, "TC-1: multiplication topic unit");
  assert.ok(topicUnit.topicLabelHe, "TC-1: topicLabelHe present");
  assert.ok(
    !block.classRecommendationUnits.some(
      (u) => u.level === "subject" && u.subject === "math"
    ),
    "TC-1: no subject fallback when topic unit exists"
  );
}

// TC-2 — geometry area topic unit
{
  const classPayload = {
    cohortSummary: {
      totalAnswers: 40,
      studentsWithActivity: 4,
      accuracy: 50,
    },
    subjects: {
      geometry: {
        answers: 40,
        correct: 20,
        wrong: 20,
        accuracy: 50,
        topics: {
          area: { answers: 40, correct: 20, wrong: 20, accuracy: 50 },
        },
      },
    },
    weaknessTopics: [
      {
        subject: "geometry",
        topic: "area",
        wrong: 20,
        answers: 40,
        studentCount: 4,
        studentIds: ["s1", "s2"],
      },
    ],
    students: [],
    roster: { activeMemberCount: 4, studentCount: 4 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload, { subjectScope: "geometry" });
  const topicUnit = block.classRecommendationUnits.find((u) => u.topic === "area");
  assert.ok(topicUnit, "TC-2: area topic unit");
  assert.ok(
    !block.classRecommendationUnits.some((u) => u.level === "subject" && u.subject === "geometry"),
    "TC-2: no geometry subject fallback"
  );
}

// TC-3 — animals under math is cross_subject_topic
{
  assert.equal(classifyDroppedTopicReason("math", "animals"), "cross_subject_topic");
}

// TC-4 — subject_name_topic + detectFallbackDominance finding
{
  assert.equal(classifyDroppedTopicReason("math", "math"), "subject_name_topic");
  const finding = detectFallbackDominance({ droppedAnswerCount: 85 }, 100);
  assert.equal(finding.dominant, true);
  assert.equal(finding.reason, "high_fallback_ratio");
  assert.ok(finding.ratio > 0.8);
}

// TC-5 — post-fix math synthetic payload
{
  const classPayload = {
    cohortSummary: { totalAnswers: 30, studentsWithActivity: 3, accuracy: 45 },
    subjects: {
      math: {
        answers: 30,
        correct: 14,
        wrong: 16,
        accuracy: 46.7,
        topics: {
          multiplication: { answers: 15, correct: 5, wrong: 10, accuracy: 33.3 },
          fractions: { answers: 15, correct: 9, wrong: 6, accuracy: 60 },
        },
      },
    },
    weaknessTopics: [
      {
        subject: "math",
        topic: "multiplication",
        wrong: 10,
        answers: 15,
        studentCount: 3,
        studentIds: ["a", "b", "c"],
      },
      {
        subject: "math",
        topic: "fractions",
        wrong: 6,
        answers: 15,
        studentCount: 2,
        studentIds: ["a", "b"],
      },
    ],
    students: [],
    roster: { activeMemberCount: 3, studentCount: 3 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload, { subjectScope: "math" });
  assert.ok(
    block.classRecommendationUnits.some((u) => u.level === "topic"),
    "TC-5: topic-level units"
  );
  assert.ok(
    !block.classRecommendationUnits.some((u) => u.level === "subject"),
    "TC-5: no subject fallback"
  );
}

// TC-6 — post-fix geometry synthetic payload
{
  const classPayload = {
    cohortSummary: { totalAnswers: 24, studentsWithActivity: 3, accuracy: 50 },
    subjects: {
      geometry: {
        answers: 24,
        correct: 12,
        wrong: 12,
        accuracy: 50,
        topics: {
          area: { answers: 12, correct: 4, wrong: 8, accuracy: 33.3 },
          angles: { answers: 12, correct: 8, wrong: 4, accuracy: 66.7 },
        },
      },
    },
    weaknessTopics: [
      {
        subject: "geometry",
        topic: "area",
        wrong: 8,
        answers: 12,
        studentCount: 3,
        studentIds: ["a"],
      },
      {
        subject: "geometry",
        topic: "angles",
        wrong: 4,
        answers: 12,
        studentCount: 2,
        studentIds: ["b"],
      },
    ],
    students: [],
    roster: { activeMemberCount: 3, studentCount: 3 },
    attentionList: [],
  };
  const block = buildClassTeacherGuidanceV2(classPayload, { subjectScope: "geometry" });
  assert.ok(block.classRecommendationUnits.some((u) => u.topic === "area"), "TC-6: area unit");
  assert.ok(
    !block.classRecommendationUnits.some((u) => u.level === "subject"),
    "TC-6: no subject fallback"
  );
}

// TC-7 — resolveMathSessionTopic
{
  assert.equal(resolveMathSessionTopic("multiplication"), "multiplication");
  assert.equal(resolveMathSessionTopic("fractions"), "fractions");
  assert.equal(resolveMathSessionTopic("addition"), "addition");
  assert.equal(resolveMathSessionTopic(undefined), "");
  assert.equal(resolveMathSessionTopic(""), "");
  assert.equal(resolveMathSessionTopic("math"), "");
  assert.equal(resolveMathSessionTopic("general"), "");
  assert.equal(resolveMathSessionTopic("mixed"), "");
  assert.equal(resolveMathSessionTopic("חיבור"), "");
}

// TC-8 — resolveGeometrySessionTopic
{
  assert.equal(resolveGeometrySessionTopic({ topic: "area" }), "area");
  assert.equal(resolveGeometrySessionTopic({ topic: "angles" }), "angles");
  assert.equal(resolveGeometrySessionTopic({ topic: "perimeter" }), "perimeter");
  assert.equal(resolveGeometrySessionTopic({ topic: undefined }), "");
  assert.equal(resolveGeometrySessionTopic({ topic: "" }), "");
  assert.equal(resolveGeometrySessionTopic({ topic: "geometry" }), "");
  assert.equal(resolveGeometrySessionTopic({ topic: "general" }), "");
  assert.equal(resolveGeometrySessionTopic({ topic: "mixed" }), "");
  assert.equal(resolveGeometrySessionTopic({ topic: "animals" }), "");
}

// TC-9 — math activity canonical topic options
{
  function mathTopicOptionsForGrade(gradeKey) {
    const operations = MATH_GRADES[gradeKey]?.operations || [];
    return operations
      .filter((op) => op !== "mixed")
      .map((key) => ({ key, label: getMathReportBucketDisplayName(key) || key }));
  }
  const opts = mathTopicOptionsForGrade("g3");
  const g3Ops = (MATH_GRADES.g3?.operations || []).filter((op) => op !== "mixed");
  assert.ok(opts.length > 0, "TC-9: options exist");
  for (const { key, label } of opts) {
    assert.ok(g3Ops.includes(key), `TC-9: key ${key} in g3 operations`);
    const display = getMathReportBucketDisplayName(key);
    assert.ok(display && display !== key, `TC-9: Hebrew label for ${key}`);
    assert.equal(label, display);
  }
  assert.ok(resolveTopicLabelHe("math", "multiplication"));
  assert.equal(resolveTopicLabelHe("math", "חיבור"), null);
}

// Class tier no-data guard (MEDIUM #4)
{
  assert.equal(deriveClassGuidanceSeverityTier(null, { hasData: false }), null);
  assert.equal(deriveClassGuidanceSeverityTier(NaN, { hasData: false }), null);
  assert.notEqual(
    deriveClassGuidanceSeverityTier(null, { hasData: false }),
    "class_monitor",
    "no-data cohort must not default to class_monitor"
  );
  assert.equal(deriveClassGuidanceSeverityTier(70, { hasData: true }), "class_monitor");
  assert.equal(mapClassHealthSignalFromTier(null), "no_data");

  const emptyClass = buildClassTeacherGuidanceV2(
    {
      cohortSummary: { totalAnswers: 0, studentsWithActivity: 1, accuracy: 0 },
      roster: { activeMemberCount: 5, studentCount: 5 },
      subjects: {},
      weaknessTopics: [],
      attentionList: [],
      students: [],
    },
    { studentPayloads: [] }
  );
  assert.notEqual(
    emptyClass.guidanceSeverityTier,
    "class_monitor",
    "empty cohort guidance must not be class_monitor"
  );
  assert.equal(emptyClass.cohortStats?.classHealthSignal, "no_data");
}

console.log("teacher-guidance-v2-unit: all assertions passed");
