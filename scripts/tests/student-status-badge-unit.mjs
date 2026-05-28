import { strict as assert } from "node:assert";
import { deriveStudentStatusBadgeFromSummary } from "../../lib/teacher-portal/student-learning-status.js";
import {
  parseClassReportViewModel,
  parseStudentReportViewModel,
} from "../../lib/school-portal/school-report-view-model.js";

async function run() {
  console.log("Testing Student Status Badges across Teacher and School views...");
  let errors = 0;

  const testCases = [
    { accuracy: 49, answers: 5, expected: "דורש התערבות" },
    { accuracy: 53, answers: 5, expected: "צריך חיזוק" },
    { accuracy: 57, answers: 5, expected: "צריך חיזוק" },
    { accuracy: 65, answers: 5, expected: "במעקב" },
    { accuracy: 74, answers: 5, expected: "במעקב" },
    { accuracy: 75, answers: 5, expected: "תקין" },
    { accuracy: 89, answers: 5, expected: "תקין" },
    { accuracy: 90, answers: 5, expected: "חזק" },
    { accuracy: 100, answers: 5, expected: "חזק" },
    { accuracy: 100, answers: 0, expected: "אין מספיק נתונים" }, // teacher specific low data
  ];

  for (const tc of testCases) {
    // 1. Teacher dashboard
    const teacherSummary = { totalAnswers: tc.answers, accuracy: tc.accuracy };
    const teacherRes = deriveStudentStatusBadgeFromSummary(teacherSummary);
    let teacherExpected = tc.expected;
    if (tc.answers === 0) teacherExpected = "פעילות נמוכה";
    
    try {
      assert.equal(
        teacherRes.badge,
        teacherExpected,
        `Teacher Dashboard: Expected ${tc.accuracy}% to be '${teacherExpected}', got '${teacherRes.badge}'`
      );
      console.log(`PASS Teacher: ${tc.accuracy}% -> ${teacherRes.badge}`);
    } catch (e) {
      console.error(e.message);
      errors++;
    }

    // 2. School manager student report summary card
    if (tc.answers > 0) {
      const schoolPayload = {
        summary: { totalAnswers: tc.answers, accuracy: tc.accuracy, totalSessions: 1 },
      };
      const schoolRes = parseStudentReportViewModel(schoolPayload, {});
      try {
        const statusItem = schoolRes.summaryCards.find((c) => c.label === "סטטוס למידה");
        assert.equal(
          statusItem.value,
          tc.expected,
          `School student report: Expected ${tc.accuracy}% to be '${tc.expected}', got '${statusItem.value}'`
        );
        console.log(`PASS School report: ${tc.accuracy}% -> ${statusItem.value}`);
      } catch (e) {
        console.error(e.message);
        errors++;
      }

      // 3. School manager class roster row badge (report hub student list)
      const classBody = {
        cohortSummary: { totalAnswers: 100, accuracy: 60, studentsWithActivity: 5 },
        roster: { activeMemberCount: 5 },
        teacherGuidanceBlock: { version: "v2", suggestedGroups: {} },
        students: [
          {
            studentId: "test-student-1",
            studentFullNameMasked: "תלמיד א",
            summary: { totalAnswers: tc.answers, accuracy: tc.accuracy, totalSessions: 1 },
          },
        ],
      };
      const classVm = parseClassReportViewModel(classBody, { name: "כיתה א", classId: "c1" });
      const rosterRow = classVm.sections.students.items[0];
      try {
        assert.equal(
          rosterRow.learningStatusBadge,
          tc.expected,
          `School class roster: Expected ${tc.accuracy}% badge '${tc.expected}', got '${rosterRow.learningStatusBadge}'`
        );
        assert.ok(
          rosterRow.actions?.some((a) => a.id === "student_report"),
          "School class roster: missing דוח תלמיד action"
        );
        console.log(`PASS Class roster: ${tc.accuracy}% -> ${rosterRow.learningStatusBadge}`);
      } catch (e) {
        console.error(e.message);
        errors++;
      }
    }
  }

  // Class modal chip (57% cohort → צריך חיזוק)
  const classVm57 = parseClassReportViewModel(
    {
      cohortSummary: { totalAnswers: 200, accuracy: 57, studentsWithActivity: 10 },
      roster: { activeMemberCount: 10 },
      teacherGuidanceBlock: {
        version: "v2",
        guidanceSeverityTier: "class_needs_reinforcement",
        suggestedGroups: {},
      },
      students: [],
    },
    { name: "כיתה ג׳", classId: "c1" }
  );
  const chip57 = classVm57.header.chips.find((c) => c.label === "מצב כיתה");
  assert.equal(chip57?.value, "צריך חיזוק", "Class chip at 57% tier should be צריך חיזוק");
  console.log("PASS Class modal chip: מצב כיתה -> צריך חיזוק");

  if (errors > 0) {
    console.error(`\nFAILED with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log("\nALL TESTS PASSED.");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
