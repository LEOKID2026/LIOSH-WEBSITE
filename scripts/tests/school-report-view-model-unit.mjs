import assert from "node:assert/strict";
import {
  formatTopicLineHe,
  formatTopicRecommendationLineHe,
  resolveTopicLabelHe,
} from "../../lib/teacher-portal/teacher-ui.he.js";
import { parseClassReportViewModel } from "../../lib/school-portal/school-report-view-model.js";

assert.equal(formatTopicLineHe("math", "math"), null);
assert.equal(formatTopicLineHe("math", "geometry"), null);
assert.equal(formatTopicLineHe("geometry", "geometry"), null);
assert.equal(resolveTopicLabelHe("math", "angles"), null);
assert.equal(resolveTopicLabelHe("geometry", "angles"), "זוויות");
assert.ok(formatTopicRecommendationLineHe("math", "fractions")?.includes("שברים"));

const classBody = {
  cohortSummary: { totalAnswers: 200, studentsWithActivity: 5, accuracy: 70, correctAnswers: 140, wrongAnswers: 60 },
  roster: { studentCount: 5, activeMemberCount: 5 },
  students: [
    {
      studentId: "s1",
      studentFullName: "יעל כהן",
      studentFullNameMasked: "י*** כ***",
      summary: { totalAnswers: 80, accuracy: 75, totalSessions: 8 },
    },
  ],
  weaknessTopics: [
    { subject: "math", topic: "math", wrong: 10, answers: 20, studentCount: 2, studentIds: ["s1"] },
    {
      subject: "math",
      topic: "fractions",
      wrong: 8,
      answers: 15,
      studentCount: 2,
      studentIds: ["s1"],
    },
  ],
  teacherGuidanceBlock: {
    suggestedGroups: {
      struggling: [{ studentId: "s1", studentFullNameMasked: "י*** כ***", totalAnswers: 80, accuracy: 40 }],
      on_track: [],
      advanced: [],
    },
    attentionStudents: [
      {
        studentId: "s1",
        studentFullNameMasked: "י*** כ***",
        totalAnswers: 80,
        accuracy: 40,
        reasons: ["low_accuracy"],
      },
    ],
    priorityTopics: [{ subject: "math", topic: "math", wrong: 10, answers: 20, studentCount: 2 }],
  },
};

const vm = parseClassReportViewModel(classBody, {
  name: "כיתה א׳ 2",
  subjectFocus: "geometry",
  memberCount: 5,
});
assert.ok(vm.sections.students.items[0].studentId === "s1");
assert.ok(vm.sections.attention.items[0].studentId === "s1");
assert.ok(!vm.sections.focus.items.some((f) => f.label.includes("math")));
assert.ok(vm.sections.focus.items.some((f) => f.label.includes("שברים")));
assert.ok(vm.drilldowns.distribution.struggling?.items?.length === 1);
assert.ok(vm.sections.attention.items[0].detail.includes("קשיים"));

console.log("school-report-view-model-unit: ok");
