import assert from "node:assert/strict";
import { aggregateClassReportFromStudentPayloads } from "../../lib/teacher-server/teacher-class-report.server.js";
import { parsePhysicalClassReportViewModel } from "../../lib/school-portal/school-report-view-model.js";

function makeStudentPayload(studentId, answers, correct, subject = "math") {
  return {
    studentId,
    studentFullName: `Student ${studentId}`,
    studentFullNameMasked: "S***",
    payload: {
      summary: {
        totalSessions: answers > 0 ? 1 : 0,
        totalAnswers: answers,
        correctAnswers: correct,
        wrongAnswers: answers - correct,
        accuracy: answers > 0 ? (correct / answers) * 100 : 0,
      },
      subjects: {
        [subject]: {
          sessions: 1,
          answers,
          correct,
          wrong: answers - correct,
          accuracy: answers > 0 ? (correct / answers) * 100 : 0,
          topics: {
            fractions: { topic: "fractions", answers, correct, wrong: answers - correct },
          },
        },
      },
      recentMistakes: answers - correct >= 5 ? [{}, {}, {}, {}, {}] : [],
    },
  };
}

const dedupedPayloads = [
  makeStudentPayload("s1", 10, 8, "math"),
  makeStudentPayload("s2", 0, 0, "math"),
  makeStudentPayload("s3", 20, 5, "hebrew"),
];

const aggregated = aggregateClassReportFromStudentPayloads(dedupedPayloads);
assert.equal(aggregated.cohortSummary.totalAnswers, 30);
assert.equal(aggregated.cohortSummary.studentsWithActivity, 2);
assert.ok(aggregated.weaknessTopics.length >= 1);
assert.ok(aggregated.attentionList.length >= 1);

const dupAcrossSubjects = [
  makeStudentPayload("s1", 10, 2, "math"),
  makeStudentPayload("s1", 10, 2, "math"),
];
const dupAgg = aggregateClassReportFromStudentPayloads(dupAcrossSubjects);
assert.equal(dupAgg.cohortSummary.totalAnswers, 20, "duplicate student entries double-count if passed twice");

const physicalBody = {
  physicalClass: { name: "כיתה א׳ 1", gradeLevel: "1" },
  rosterSummary: { studentCount: 24 },
  cohortSummary: {
    totalAnswers: 3840,
    studentsWithActivity: 20,
    accuracy: 72,
  },
  subjectBreakdown: [
    {
      classId: "class-math",
      subjectFocus: "math",
      subjectLabelHe: "מתמטיקה",
      teacherId: "teacher-1",
      teacherName: "דן כהן",
      memberCount: 24,
      activityCount: 8,
      totalAnswers: 640,
      accuracy: 70,
    },
    {
      classId: "class-hebrew",
      subjectFocus: "hebrew",
      subjectLabelHe: "עברית",
      teacherId: "teacher-2",
      teacherName: "מירי לevi",
      memberCount: 24,
      activityCount: 6,
      totalAnswers: 640,
      accuracy: 75,
    },
  ],
  recentActivities: [
    {
      activityId: "act-1",
      classId: "class-math",
      title: "תרגול שברים",
      subjectFocus: "math",
      subjectLabelHe: "מתמטיקה",
      teacherId: "teacher-1",
      teacherName: "דן כהן",
      submittedCount: 18,
      accuracy: 68,
      createdAt: "2026-05-01T10:00:00Z",
    },
  ],
  students: [
    {
      studentId: "stu-1",
      studentFullNameMasked: "י*** כ***",
      summary: { totalAnswers: 50, accuracy: 80 },
    },
  ],
  weaknessTopics: [
    {
      subject: "math",
      topic: "fractions",
      wrong: 12,
      answers: 30,
      studentCount: 5,
      studentIds: ["stu-1"],
    },
  ],
  attentionList: [
    {
      studentId: "stu-2",
      studentFullNameMasked: "א*** ל***",
      reasons: ["low_accuracy"],
      totalAnswers: 20,
      accuracy: 40,
    },
  ],
  recentActivity: { daily: [{ date: "2026-05-20", answers: 100 }] },
};

const vm = parsePhysicalClassReportViewModel(physicalBody, {
  schoolName: "בית ספר לeo",
  gradeLevel: "1",
  physicalClassName: "כיתה א׳ 1",
});

assert.equal(vm.kind, "physical_class");
assert.equal(vm.navigation.length, 5);
assert.equal(vm.sections.subjects.items.length, 2);
assert.equal(vm.sections.activities.items.length, 1);
assert.ok(vm.sections.subjects.items[0].actions.some((a) => a.id === "subject_report"));
assert.ok(vm.sections.subjects.items[0].actions.some((a) => a.id === "teacher_card"));
assert.ok(vm.sections.students.items[0].actions.some((a) => a.id === "student_report"));
assert.ok(vm.sections.activities.items[0].actions.some((a) => a.id === "subject_report"));
assert.ok(vm.drilldowns.focus["math::fractions"]?.items?.[0]?.actions?.length >= 1);

for (const sectionKey of ["subjects", "activities", "students", "attention"]) {
  for (const item of vm.sections[sectionKey].items) {
    assert.ok(item.actions?.length >= 1, `${sectionKey} item must have actions`);
  }
}

assert.ok(!vm.sections.subjects.items[0].label.includes("math"));
assert.equal(vm.sections.subjects.items[0].label, "מתמטיקה");

console.log("school-physical-class-report-unit: ok");
