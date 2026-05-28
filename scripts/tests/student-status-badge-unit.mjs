import { strict as assert } from "node:assert";
import { deriveStudentStatusBadgeFromSummary } from "../../lib/teacher-server/teacher-dashboard.server.js";
import { parseStudentReportViewModel } from "../../lib/school-portal/school-report-view-model.js";

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

    // 2. School manager model
    if (tc.answers > 0) { // test valid data rows for school
      const schoolPayload = {
        summary: { totalAnswers: tc.answers, accuracy: tc.accuracy, totalSessions: 1 }
      };
      const schoolRes = parseStudentReportViewModel(schoolPayload, {});
      try {
        const statusItem = schoolRes.summaryCards.find(c => c.label === "סטטוס למידה");
        assert.equal(
          statusItem.value,
          tc.expected,
          `School Manager: Expected ${tc.accuracy}% to be '${tc.expected}', got '${statusItem.value}'`
        );
        console.log(`PASS School : ${tc.accuracy}% -> ${statusItem.value}`);
      } catch (e) {
        console.error(e.message);
        errors++;
      }
    }
  }

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
