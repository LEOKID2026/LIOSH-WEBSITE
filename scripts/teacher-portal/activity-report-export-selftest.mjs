/**
 * Self-test: enriched activity report export — workbook shape, X/N correctness,
 * skipped-question rows, RTL flags, and backward compatibility of legacy functions.
 *
 * Run: node scripts/teacher-portal/activity-report-export-selftest.mjs
 *
 * Uses no browser APIs (no DOM). Only tests pure data-building functions
 * and XLSX workbook construction. Exit 0 = all pass, exit 1 = failure.
 */

import {
  // Legacy (unchanged)
  buildActivityReportStudentRows,
  buildActivityReportCsvContent,
  buildActivityReportWorkbook,
  csvEscapeCell,
  // Enriched row builders (pure, testable without DOM)
  buildEnrichedSummaryKV,
  buildEnrichedQuestionsTable,
  buildEnrichedStudentSummaryRows,
  buildEnrichedStudentAnswersRows,
  buildEnrichedQuestionAnalyticsRows,
  buildEnrichedSkillAnalyticsRows,
  buildEnrichedRecommendationsKV,
  buildEnrichedActivityReportWorkbook,
  buildEnrichedActivityReportDownloadStem,
  buildActivityReportDownloadStem,
  ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE,
  // Header constants (for column count verification)
  ENRICHED_STUDENT_SUMMARY_HEADERS_HE,
  ENRICHED_STUDENT_ANSWERS_HEADERS_HE,
  ENRICHED_QUESTION_ANALYTICS_HEADERS_HE,
  ENRICHED_SKILL_ANALYTICS_HEADERS_HE,
} from "../../lib/teacher-portal/teacher-activity-report-export.js";
import {
  extractFrozenQuestionChoices,
  extractFrozenQuestionText,
  formatFrozenCorrectAnswerForExport,
  mapFrozenQuestionDetail,
} from "../../lib/classroom-activities/frozen-activity-question.server.js";
import {
  activityExportModeLabelHe,
  activityExportSkillLabelHe,
  activityExportSubjectLabelHe,
  activityExportTitleHe,
  activityExportTopicLabelHe,
  formatActivityExportDateTimeHe,
  looksLikeRawExportKey,
} from "../../lib/teacher-portal/teacher-activity-report-export-labels.js";
import {
  buildTeacherActivityReportPdfSections,
  collectTeacherActivityReportPdfVisibleText,
  teacherActivityReportPdfContainsAiPhrase,
  teacherActivityReportPdfContainsRawExportKey,
  teacherActivityReportPdfContainsReversedHebrewMarkers,
  TEACHER_PDF_DOCUMENT_TITLE_HE,
  TEACHER_PDF_REQUIRED_SECTION_TITLES_HE,
} from "../../lib/teacher-portal/teacher-activity-report-pdf.js";

// ─── Test infrastructure ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  PASS: ${name}`);
  passed += 1;
}

function fail(name, detail) {
  console.error(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

function assert(condition, name, detail) {
  if (condition) {
    pass(name);
  } else {
    fail(name, detail);
  }
}

// ─── Mock payload ────────────────────────────────────────────────────────────

const MOCK_STUDENTS = [
  {
    studentId: "stu-1",
    studentFullNameMasked: "א.כ.",
    status: "submitted",
    startedAt: "2026-01-01T10:00:00Z",
    submittedAt: "2026-01-01T10:15:00Z",
    lastSeenAt: "2026-01-01T10:15:00Z",
    answersCount: 3,
    correctCount: 2,
    scorePct: 66.67,
    stuck: false,
  },
  {
    studentId: "stu-2",
    studentFullNameMasked: "ב.ל.",
    status: "submitted",
    startedAt: "2026-01-01T10:01:00Z",
    submittedAt: "2026-01-01T10:20:00Z",
    lastSeenAt: "2026-01-01T10:20:00Z",
    answersCount: 3,
    correctCount: 1,
    scorePct: 33.33,
    stuck: false,
  },
  {
    studentId: "stu-3",
    studentFullNameMasked: "ג.מ.",
    status: "not_started",
    startedAt: null,
    submittedAt: null,
    lastSeenAt: null,
    answersCount: 0,
    correctCount: 0,
    scorePct: null,
    stuck: false,
  },
];

const MOCK_QUESTIONS = [
  {
    questionIndex: 0,
    questionText: "כמה הם 2 + 2?",
    choices: ["3", "4", "5", "6"],
    correctAnswer: "4",
    correctAnswerDisplay: "4",
    skillKey: "math_addition",
    skillLabelHe: "חיבור",
    subject: "math",
    topic: "אריתמטיקה",
    difficultyLevel: "easy",
    hint: null,
    explanation: "2 ועוד 2 שווה 4",
    params: null,
    shape: null,
  },
  {
    questionIndex: 1,
    questionText: "כמה הם 5 × 3?",
    choices: ["10", "12", "15", "18"],
    correctAnswer: "15",
    correctAnswerDisplay: "15",
    skillKey: "math_multiplication",
    skillLabelHe: "כפל",
    subject: "math",
    topic: "אריתמטיקה",
    difficultyLevel: "easy",
    hint: null,
    explanation: null,
    params: null,
    shape: null,
  },
  {
    questionIndex: 2,
    questionText: "מהו שורש ריבועי של 16?",
    choices: ["2", "4", "6", "8"],
    correctAnswer: "4",
    correctAnswerDisplay: "4",
    skillKey: "math_roots",
    skillLabelHe: "שורשים",
    subject: "math",
    topic: "אריתמטיקה",
    difficultyLevel: "medium",
    hint: null,
    explanation: null,
    params: null,
    shape: null,
  },
];

// stu-1 answered all 3 questions (2 correct, 1 wrong)
// stu-2 answered all 3 questions (1 correct, 2 wrong)
// stu-3 answered 0 questions (not_started)
const MOCK_RESPONSES = [
  {
    studentId: "stu-1",
    studentFullNameMasked: "א.כ.",
    questionIndex: 0,
    selectedAnswer: "4",
    correctAnswer: "4",
    correctAnswerDisplay: "4",
    isCorrect: true,
    answeredAt: "2026-01-01T10:05:00Z",
    timeSpentMs: 12000,
    hintsUsed: 0,
    explanationViewed: false,
  },
  {
    studentId: "stu-1",
    studentFullNameMasked: "א.כ.",
    questionIndex: 1,
    selectedAnswer: "15",
    correctAnswer: "15",
    isCorrect: true,
    answeredAt: "2026-01-01T10:08:00Z",
    timeSpentMs: 8000,
    hintsUsed: 0,
    explanationViewed: false,
  },
  {
    studentId: "stu-1",
    studentFullNameMasked: "א.כ.",
    questionIndex: 2,
    selectedAnswer: "2",
    correctAnswer: "4",
    correctAnswerDisplay: "4",
    isCorrect: false,
    answeredAt: "2026-01-01T10:12:00Z",
    timeSpentMs: 20000,
    hintsUsed: 1,
    explanationViewed: true,
  },
  {
    studentId: "stu-2",
    studentFullNameMasked: "ב.ל.",
    questionIndex: 0,
    selectedAnswer: "3",
    correctAnswer: "4",
    correctAnswerDisplay: "4",
    isCorrect: false,
    answeredAt: "2026-01-01T10:06:00Z",
    timeSpentMs: 15000,
    hintsUsed: 0,
    explanationViewed: false,
  },
  {
    studentId: "stu-2",
    studentFullNameMasked: "ב.ל.",
    questionIndex: 1,
    selectedAnswer: "15",
    correctAnswer: "15",
    isCorrect: true,
    answeredAt: "2026-01-01T10:10:00Z",
    timeSpentMs: 9000,
    hintsUsed: 0,
    explanationViewed: false,
  },
  {
    studentId: "stu-2",
    studentFullNameMasked: "ב.ל.",
    questionIndex: 2,
    selectedAnswer: "6",
    correctAnswer: "4",
    correctAnswerDisplay: "4",
    isCorrect: false,
    answeredAt: "2026-01-01T10:18:00Z",
    timeSpentMs: 18000,
    hintsUsed: 0,
    explanationViewed: false,
  },
  // stu-3 has no responses at all
];

const MOCK_PER_QUESTION = [
  { questionIndex: 0, totalAnswers: 2, correctCount: 1, wrongCount: 1, accuracyPct: 50, wrongStudentIds: ["stu-2"], prompt: "כמה הם 2 + 2?" },
  { questionIndex: 1, totalAnswers: 2, correctCount: 2, wrongCount: 0, accuracyPct: 100, wrongStudentIds: [], prompt: "כמה הם 5 × 3?" },
  { questionIndex: 2, totalAnswers: 2, correctCount: 0, wrongCount: 2, accuracyPct: 0, wrongStudentIds: ["stu-1", "stu-2"], prompt: "מהו שורש ריבועי של 16?" },
];

const MOCK_ALL_SKILLS = [
  { skillKey: "math_roots", skillLabelHe: "שורשים", accuracyPct: 0, answers: 2, correct: 0, isWeak: false },
  { skillKey: "math_addition", skillLabelHe: "חיבור", accuracyPct: 50, answers: 2, correct: 1, isWeak: false },
  { skillKey: "math_multiplication", skillLabelHe: "כפל", accuracyPct: 100, answers: 2, correct: 2, isWeak: false },
];

const MOCK_PAYLOAD = {
  ok: true,
  activity: {
    activityId: "act-uuid-1",
    classId: "cls-uuid-1",
    teacherId: "tch-uuid-1",
    title: "תרגול אריתמטיקה",
    subject: "math",
    topic: "אריתמטיקה",
    subtopic: null,
    skillKey: null,
    difficultyLevel: "easy",
    questionCount: 3,
    mode: "guided_practice",
    questionSelection: "same_exact",
    timeLimitSeconds: null,
    dueAt: null,
    status: "closed",
    activatedAt: "2026-01-01T09:00:00Z",
    closedAt: "2026-01-01T11:00:00Z",
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T11:00:00Z",
  },
  summary: {
    rosterCount: 3,
    notStartedCount: 1,
    inProgressCount: 0,
    submittedCount: 2,
    completionRate: 66.67,
    classAccuracy: 50,
  },
  students: MOCK_STUDENTS,
  questions: MOCK_QUESTIONS,
  responses: MOCK_RESPONSES,
  perQuestion: MOCK_PER_QUESTION,
  weakSkills: [
    { skillKey: "math_roots", skillLabelHe: "שורשים", accuracyPct: 0, answers: 2, correct: 0 },
  ],
  allSkills: MOCK_ALL_SKILLS,
  classInfo: { classId: "cls-uuid-1", className: "כיתה ד1", gradeLevel: "grade_4", subjectFocus: "math" },
  teacherInfo: { teacherId: "tch-uuid-1", displayName: "שרה לוי" },
  exportMeta: { generatedAt: "2026-01-01T12:00:00Z", exportVersion: "1" },
};

// ─── Section 1: Legacy backward compat ──────────────────────────────────────

console.log("\n── Legacy backward compatibility ──");

assert(csvEscapeCell("=1+1").startsWith("'"), "CSV: formula prefix neutralized with apostrophe");
assert(csvEscapeCell("+cmd").startsWith("'"), "CSV: plus prefix neutralized");
assert(csvEscapeCell("-10").startsWith("'"), "CSV: minus prefix neutralized");
assert(csvEscapeCell("@SUM(A1)").startsWith("'"), "CSV: at prefix neutralized");
assert(csvEscapeCell("תשובה רגילה") === "תשובה רגילה", "CSV: Hebrew text unchanged");
const csvMalicious = buildActivityReportCsvContent({
  activity: { title: "t", questionCount: 1 },
  students: [
    {
      studentFullNameMasked: "=1+1",
      status: "submitted",
      answersCount: 1,
      correctCount: 1,
      scorePct: 100,
    },
  ],
});
assert(csvMalicious.includes("'=1+1"), "CSV export neutralizes formula in student name cell");

{
  const rows = buildActivityReportStudentRows(MOCK_PAYLOAD);
  assert(Array.isArray(rows), "buildActivityReportStudentRows returns array");
  assert(rows.length === 3, "buildActivityReportStudentRows: correct row count", `got ${rows.length}`);
  // Sorted by scorePct descending: stu-1(66.67), stu-2(33.33), stu-3(null→0)
  assert(rows[0][0] === "א.כ.", "legacy rows: sorted by scorePct desc (first row is stu-1)");
  const correctnessCell = rows[0][3];
  assert(
    typeof correctnessCell === "string" && correctnessCell === "2/3",
    "legacy rows: נכונות is X/N format",
    `got "${correctnessCell}"`
  );
  const correctnessCellNullScore = rows[2][3];
  assert(
    correctnessCellNullScore === "0/3",
    "legacy rows: student with no answers shows 0/N",
    `got "${correctnessCellNullScore}"`
  );
}

{
  const csv = buildActivityReportCsvContent(MOCK_PAYLOAD);
  assert(typeof csv === "string", "buildActivityReportCsvContent returns string");
  assert(csv.startsWith("\uFEFF"), "CSV has BOM");
  assert(csv.includes("תלמיד"), "CSV has Hebrew headers");
  assert(csv.includes("א.כ."), "CSV contains student name");
}

{
  const wb = buildActivityReportWorkbook(MOCK_PAYLOAD);
  assert(wb.SheetNames.length === 1, "legacy workbook has exactly 1 sheet", `got ${wb.SheetNames.length}`);
  assert(wb.SheetNames[0] === "דוח פעילות", `legacy sheet name is "דוח פעילות"`, `got "${wb.SheetNames[0]}"`);
  const sheet = wb.Sheets["דוח פעילות"];
  assert(
    Array.isArray(sheet["!views"]) && sheet["!views"][0]?.rightToLeft === true,
    "legacy sheet has rightToLeft view"
  );
}

// ─── Section 2: Sheet 1 — סיכום פעילות ────────────────────────────────────

console.log("\n── Sheet 1: סיכום פעילות ──");

{
  const kv = buildEnrichedSummaryKV(MOCK_PAYLOAD);
  assert(Array.isArray(kv), "buildEnrichedSummaryKV returns array");
  assert(kv.length > 10, "summary KV has multiple rows", `got ${kv.length}`);

  const hasTitle = kv.some((row) => row[0] === "שם פעילות" && String(row[1]).includes("תרגול"));
  assert(hasTitle, "summary KV: שם פעילות row present with sanitized title");

  const hasSubjectHe = kv.some((row) => row[0] === "מקצוע" && row[1] === "מתמטיקה");
  assert(hasSubjectHe, "summary KV: מקצוע shows Hebrew label (מתמטיקה)");

  const hasModeHe = kv.some((row) => row[0] === "סוג פעילות" && row[1] === "תרגול מודרך");
  assert(hasModeHe, "summary KV: סוג פעילות shows Hebrew mode label");

  const activatedRow = kv.find((row) => row[0] === "תאריך הפעלה");
  assert(
    activatedRow && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(String(activatedRow[1])),
    "summary KV: תאריך הפעלה uses DD/MM/YYYY HH:mm format",
    `got "${activatedRow?.[1]}"`
  );

  const hasClassName = kv.some((row) => row[0] === "שם כיתה" && row[1] === "כיתה ד1");
  assert(hasClassName, "summary KV: שם כיתה row uses classInfo.className");

  const hasTeacherName = kv.some((row) => row[0] === "שם מורה" && row[1] === "שרה לוי");
  assert(hasTeacherName, "summary KV: שם מורה row uses teacherInfo.displayName");

  const hasCompletionRate = kv.some((row) => row[0] === "אחוז השלמה (%)" && row[1] === 66.67);
  assert(hasCompletionRate, "summary KV: אחוז השלמה has correct value");
}

// null classInfo / teacherInfo safety
{
  const payloadNoMeta = { ...MOCK_PAYLOAD, classInfo: null, teacherInfo: null };
  const kv = buildEnrichedSummaryKV(payloadNoMeta);
  const classRow = kv.find((row) => row[0] === "שם כיתה");
  assert(classRow !== undefined, "summary KV: שם כיתה row exists even when classInfo null");
  assert(classRow[1] === "", "summary KV: שם כיתה is empty string when classInfo null", `got "${classRow[1]}"`);
}

// ─── Section 3: Sheet 2 — פרטי שאלות ──────────────────────────────────────

console.log("\n── Sheet 2: פרטי שאלות ──");

{
  const { headers, rows } = buildEnrichedQuestionsTable(MOCK_QUESTIONS);
  assert(Array.isArray(headers) && headers.length > 0, "question table has headers");
  assert(!headers.includes("מיומנות (מפתח)"), "question table: no internal skill key column");
  assert(!headers.includes("נושא (שאלה)"), "question table: no internal topic key column");
  assert(rows.length === 3, "question table: 3 rows for 3 questions", `got ${rows.length}`);

  // Check X/N not percent in this sheet (no score columns here)
  const firstRow = rows[0];
  assert(firstRow[0] === 1, "question table: first question number is 1 (1-based)");
  assert(firstRow[1] === "כמה הם 2 + 2?", "question table: question text matches frozen set");
  assert(firstRow[2] === "4", "question table: correct answer from frozen set");

  // Choice columns: max 4 choices across questions → 4 choice columns
  const choiceColCount = headers.filter((h) => h.startsWith("אפשרות")).length;
  assert(choiceColCount === 4, "question table: 4 choice columns for 4-choice questions", `got ${choiceColCount}`);

  // Choices populated
  assert(firstRow[3] === "3", "question table: choice א is first choice option");
  assert(firstRow[4] === "4", "question table: choice ב is second choice option");

  // Question with no choices — max choices is 0, so no choice columns are added
  const { headers: noChoiceHeaders, rows: noChoiceRows } = buildEnrichedQuestionsTable([
    { ...MOCK_QUESTIONS[0], choices: null },
  ]);
  const noChoiceColCount = noChoiceHeaders.filter((h) => h.startsWith("אפשרות")).length;
  assert(noChoiceColCount === 0, "question table: no choice columns when all questions have null choices", `got ${noChoiceColCount}`);
  assert(noChoiceRows.length === 1, "question table: 1 data row for 1 question with null choices");
  // Verify the row still has question text and correct answer
  assert(noChoiceRows[0][1] === "כמה הם 2 + 2?", "question table: question text present with null choices");
  assert(noChoiceRows[0][2] === "4", "question table: correct answer present with null choices");
}

// ─── Section 4: Sheet 3 — סיכום תלמידים ───────────────────────────────────

console.log("\n── Sheet 3: סיכום תלמידים ──");

{
  const rows = buildEnrichedStudentSummaryRows(MOCK_STUDENTS, 3);
  assert(rows.length === 3, "student summary: 3 rows", `got ${rows.length}`);

  // Sorted desc by scorePct: stu-1 (66.67), stu-2 (33.33), stu-3 (null → last)
  assert(rows[0][0] === "א.כ.", "student summary: sorted desc by scorePct (stu-1 first)");
  assert(rows[1][0] === "ב.ל.", "student summary: stu-2 second");
  assert(rows[2][0] === "ג.מ.", "student summary: stu-3 last (null score)");

  // X/N format for נכונות column (index 3)
  assert(rows[0][3] === "2/3", "student summary: נכונות is X/N format (stu-1)", `got "${rows[0][3]}"`);
  assert(rows[1][3] === "1/3", "student summary: נכונות is X/N format (stu-2)", `got "${rows[1][3]}"`);
  assert(rows[2][3] === "0/3", "student summary: נכונות is X/N format (stu-3, not_started)", `got "${rows[2][3]}"`);

  // Percent column exists but is clearly separate (index 5)
  const colHeaders = ENRICHED_STUDENT_SUMMARY_HEADERS_HE;
  const percentColIdx = colHeaders.indexOf("ציון (%)");
  assert(percentColIdx >= 0, "student summary: percent column exists with label ציון (%)");
  assert(rows[0][percentColIdx] === 66.67, "student summary: percent value matches scorePct");

  // No column called ציון סופי
  const hasFinalGradeCol = colHeaders.some((h) => h.includes("סופי"));
  assert(!hasFinalGradeCol, "student summary: no column named with 'סופי' (final grade)");

  // Column count matches header count
  assert(
    rows[0].length === colHeaders.length,
    "student summary: row length matches header count",
    `row has ${rows[0].length}, headers has ${colHeaders.length}`
  );
}

// ─── Section 5: Sheet 4 — תשובות תלמידים ─────────────────────────────────

console.log("\n── Sheet 4: תשובות תלמידים ──");

{
  const rows = buildEnrichedStudentAnswersRows(MOCK_STUDENTS, MOCK_QUESTIONS, MOCK_RESPONSES, 3);
  const totalExpected = MOCK_STUDENTS.length * 3; // 3 students × 3 questions = 9
  assert(rows.length === totalExpected, `student answers: all ${totalExpected} (student×question) rows present`, `got ${rows.length}`);

  // Column count matches header count
  const colHeaders = ENRICHED_STUDENT_ANSWERS_HEADERS_HE;
  assert(
    rows[0].length === colHeaders.length,
    "student answers: row length matches header count",
    `row ${rows[0].length}, headers ${colHeaders.length}`
  );

  // stu-3 (not_started) has 3 empty-answer rows
  const stu3Rows = rows.filter((r) => r[0] === "ג.מ.");
  assert(stu3Rows.length === 3, "student answers: stu-3 (not_started) has 3 rows", `got ${stu3Rows.length}`);
  assert(
    stu3Rows.every((r) => r[3] === ""),
    "student answers: stu-3 rows have empty selectedAnswer (not omitted)"
  );
  assert(
    stu3Rows.every((r) => r[5] === ""),
    "student answers: stu-3 rows have empty נכון? (not answered)"
  );

  // Correctness display
  const stu1Rows = rows.filter((r) => r[0] === "א.כ.");
  const stu1Q0 = stu1Rows.find((r) => r[1] === 1); // question index 1-based
  assert(stu1Q0 !== undefined, "student answers: stu-1 Q1 row found");
  assert(stu1Q0[5] === "✓", `student answers: correct answer shows "✓"`, `got "${stu1Q0[5]}"`);

  const stu1Q2 = stu1Rows.find((r) => r[1] === 3); // question 3 (index 2)
  assert(stu1Q2 !== undefined, "student answers: stu-1 Q3 row found");
  assert(stu1Q2[5] === "✗", `student answers: wrong answer shows "✗"`, `got "${stu1Q2[5]}"`);

  // Question text from questions array (frozen set), not from response
  assert(stu1Q0[2] === "כמה הם 2 + 2?", "student answers: question text from frozen questions array");

  // Time display in seconds
  const timeColIdx = colHeaders.indexOf("זמן (שניות)");
  assert(timeColIdx >= 0, "student answers: זמן (שניות) column exists");
  assert(stu1Q0[timeColIdx] === 12, "student answers: time in seconds (12000ms → 12.0)", `got ${stu1Q0[timeColIdx]}`);

  // Hints display
  const hintsColIdx = colHeaders.indexOf("נעזר ברמז");
  const stu1Q2_hintsVal = stu1Q2[hintsColIdx];
  assert(stu1Q2_hintsVal === 1, "student answers: hints_used shows count when > 0", `got ${stu1Q2_hintsVal}`);

  // Explanation viewed
  const expColIdx = colHeaders.indexOf("צפה בהסבר");
  const stu1Q2_expVal = stu1Q2[expColIdx];
  assert(stu1Q2_expVal === "כן", `student answers: explanation_viewed shows "כן"`, `got "${stu1Q2_expVal}"`);
}

// ─── Section 6: Sheet 5 — ניתוח שאלות ────────────────────────────────────

console.log("\n── Sheet 5: ניתוח שאלות ──");

{
  const rows = buildEnrichedQuestionAnalyticsRows(MOCK_PER_QUESTION, MOCK_QUESTIONS);
  assert(rows.length === 3, "question analytics: 3 rows for 3 questions", `got ${rows.length}`);

  // Sorted by questionIndex ascending
  assert(rows[0][0] === 1, "question analytics: first row is Q1 (1-based)");
  assert(rows[1][0] === 2, "question analytics: second row is Q2");
  assert(rows[2][0] === 3, "question analytics: third row is Q3");

  const colHeaders = ENRICHED_QUESTION_ANALYTICS_HEADERS_HE;
  const xnColIdx = colHeaders.indexOf(ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE);
  const pctColIdx = colHeaders.indexOf("דיוק (%)");
  assert(xnColIdx >= 0, "question analytics: נכונות מתוך כלל התשובות column present");
  assert(!colHeaders.includes("דיוק X/N"), "question analytics: no legacy דיוק X/N header");
  assert(pctColIdx >= 0, "question analytics: דיוק (%) column present");

  // Q1: 1 correct of 2 total → "1/2"
  assert(rows[0][xnColIdx] === "1/2", `question analytics: Q1 accuracy X/N is "1/2"`, `got "${rows[0][xnColIdx]}"`);
  assert(rows[0][pctColIdx] === 50, "question analytics: Q1 accuracy pct is 50");

  // Q2: 2 correct of 2 total → "2/2"
  assert(rows[1][xnColIdx] === "2/2", `question analytics: Q2 accuracy X/N is "2/2"`, `got "${rows[1][xnColIdx]}"`);

  // Question text comes from questions array (frozen)
  const textColIdx = colHeaders.indexOf("טקסט שאלה");
  assert(rows[0][textColIdx] === "כמה הם 2 + 2?", "question analytics: text from frozen questions array");
}

// ─── Section 7: Sheet 6 — ניתוח מיומנויות ─────────────────────────────────

console.log("\n── Sheet 6: ניתוח מיומנויות ──");

{
  const rows = buildEnrichedSkillAnalyticsRows(MOCK_ALL_SKILLS);
  assert(rows.length === 3, "skill analytics: 3 rows for 3 skills", `got ${rows.length}`);

  const colHeaders = ENRICHED_SKILL_ANALYTICS_HEADERS_HE;
  assert(!colHeaders.includes("מיומנות (מפתח)"), "skill analytics: no internal skill key column");
  assert(colHeaders.length === 6, "skill analytics: 6 columns after removing internal key", `got ${colHeaders.length}`);
  const xnColIdx = colHeaders.indexOf(ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE);
  const weakColIdx = colHeaders.indexOf("חלשה?");
  assert(xnColIdx >= 0, "skill analytics: נכונות מתוך כלל התשובות column present");
  assert(!colHeaders.includes("דיוק X/N"), "skill analytics: no legacy דיוק X/N header");
  assert(weakColIdx >= 0, "skill analytics: חלשה? column present");

  const addRow = rows.find((r) => r[0] === "חיבור");
  assert(addRow !== undefined, "skill analytics: חיבור row present");
  assert(addRow[xnColIdx] === "1/2", `skill analytics: חיבור X/N is "1/2"`, `got "${addRow?.[xnColIdx]}"`);

  const rootsRow = rows.find((r) => r[0] === "שורשים");
  assert(rootsRow !== undefined, "skill analytics: שורשים row present");

  const multRow = rows.find((r) => r[0] === "כפל");
  assert(multRow !== undefined, "skill analytics: כפל row present");
  assert(multRow[xnColIdx] === "2/2", `skill analytics: כפל X/N is "2/2"`);

  // All skills present (not only weak)
  assert(rows.length === 3, "skill analytics: all skills included, not only weak ones");
}

// ─── Section 8: Sheet 7 — המלצות ומעקב ───────────────────────────────────

console.log("\n── Sheet 7: המלצות ומעקב ──");

{
  const kv = buildEnrichedRecommendationsKV(MOCK_PAYLOAD);
  assert(Array.isArray(kv), "recommendations KV returns array");

  const hasCompletion = kv.some((r) => r[0] === "אחוז השלמה (%)" && r[1] === 66.67);
  assert(hasCompletion, "recommendations: completion rate row present with value");

  const hasSubmitted = kv.some((r) => r[0] === "תלמידים שהגישו" && r[1] === 2);
  assert(hasSubmitted, "recommendations: submitted count present");

  const hasNotFinished = kv.some((r) => r[0] === "תלמידים שלא סיימו" && r[1] === 1);
  assert(hasNotFinished, "recommendations: not-finished count (notStarted + inProgress) = 1");

  // Action notes row should be blank (teacher fills it)
  const actionRow = kv.find((r) => r[0] === "הצעות לפעולה");
  assert(actionRow !== undefined, "recommendations: הצעות לפעולה row present");
  assert(actionRow[1] === "", "recommendations: הצעות לפעולה value is blank (for teacher to fill)");

  // No AI/generated text
  const aiPhrases = ["מומלץ", "מוצע", "אנו ממליצים", "recommended", "AI"];
  const kvFlat = kv.map((r) => String(r[1] || "")).join(" ");
  const hasAI = aiPhrases.some((p) => kvFlat.includes(p));
  assert(!hasAI, "recommendations: no AI-generated phrases in output");
}

// ─── Section 9: Full workbook structure ────────────────────────────────────

console.log("\n── Full workbook structure ──");

{
  const wb = buildEnrichedActivityReportWorkbook(MOCK_PAYLOAD);

  const EXPECTED_SHEETS = [
    "סיכום פעילות",
    "פרטי שאלות",
    "סיכום תלמידים",
    "תשובות תלמידים",
    "ניתוח שאלות",
    "ניתוח מיומנויות",
    "המלצות ומעקב",
  ];

  assert(
    wb.SheetNames.length === 7,
    `workbook has exactly 7 sheets`,
    `got ${wb.SheetNames.length}: ${JSON.stringify(wb.SheetNames)}`
  );

  for (const name of EXPECTED_SHEETS) {
    assert(wb.SheetNames.includes(name), `workbook contains sheet "${name}"`);
  }

  // All sheets have rightToLeft view
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const hasRTL =
      Array.isArray(sheet["!views"]) && sheet["!views"].some((v) => v.rightToLeft === true);
    assert(hasRTL, `sheet "${name}" has rightToLeft view`);
  }

  // Workbook-level RTL
  assert(
    wb.Workbook?.Views?.[0]?.RTL === true,
    "workbook has workbook-level RTL view"
  );

  // Student answers sheet has all 9 rows (3 students × 3 questions)
  const ansSheet = wb.Sheets["תשובות תלמידים"];
  const range = ansSheet["!ref"];
  // Range like A1:J10 → 10 rows (1 header + 9 data)
  if (range) {
    const [, end] = range.split(":");
    const endRow = parseInt(end.replace(/[A-Z]/g, ""), 10);
    assert(endRow === 10, `student answers sheet has 10 rows (1 header + 9 data)`, `range end row: ${endRow}`);
  }
}

// ─── Section 10: Edge cases ────────────────────────────────────────────────

console.log("\n── Edge cases ──");

{
  // Empty payload (no students, no questions)
  const emptyPayload = {
    ...MOCK_PAYLOAD,
    students: [],
    questions: [],
    responses: [],
    perQuestion: [],
    allSkills: [],
    classInfo: null,
    teacherInfo: null,
  };
  let threw = false;
  try {
    buildEnrichedActivityReportWorkbook(emptyPayload);
  } catch (e) {
    threw = true;
  }
  assert(!threw, "workbook builds without error when students/questions/responses are empty");
}

{
  // Student answers with zero questionCount
  const rows = buildEnrichedStudentAnswersRows(MOCK_STUDENTS, [], [], 0);
  assert(rows.length === 0, "student answers: 0 rows when questionCount is 0");
}

{
  // Skill rows with empty allSkills
  const rows = buildEnrichedSkillAnalyticsRows([]);
  assert(rows.length === 0, "skill analytics: 0 rows for empty allSkills");
}

// ─── Section 11: Frozen question extractor (SIM / stub shapes) ─────────────

console.log("\n── Frozen question extractor (SIM shapes) ──");

{
  const simRaw = {
    questionId: "angles-q01",
    topic: "angles",
    difficulty: "easy",
    questionText: "שאלה 1",
    options: ["45°", "90°", "180°", "270°"],
    correctAnswer: "ב",
    skillKey: "angles_skill",
  };

  assert(extractFrozenQuestionText(simRaw) === "שאלה 1", "frozen extractor: reads questionText field");
  const choices = extractFrozenQuestionChoices(simRaw);
  assert(Array.isArray(choices) && choices.length === 4, "frozen extractor: reads options field");
  assert(choices[1] === "90°", "frozen extractor: option ב is 90°");

  const correctDisplay = formatFrozenCorrectAnswerForExport(choices, "ב");
  assert(correctDisplay === "ב — 90°", "frozen extractor: resolves letter to option text", `got "${correctDisplay}"`);

  const mapped = mapFrozenQuestionDetail(simRaw, 0, {
    subject: "geometry",
    topic: "angles",
    resolveSkillLabelHe: (key, ctx) => activityExportSkillLabelHe(key, ctx),
  });
  assert(mapped.questionText === "שאלה 1", "mapFrozenQuestionDetail: questionText populated");
  assert(mapped.choices?.length === 4, "mapFrozenQuestionDetail: choices populated");
  assert(mapped.correctAnswerDisplay === "ב — 90°", "mapFrozenQuestionDetail: correctAnswerDisplay resolved");
  assert(mapped.skillLabelHe === "זוויות", "mapFrozenQuestionDetail: angles_skill → זוויות", `got "${mapped.skillLabelHe}"`);
}

{
  const simLetterOptions = {
    questionText: "שאלה 2",
    options: ["א", "ב", "ג", "ד"],
    correctAnswer: "ב",
    skillKey: "shapes_skill",
  };
  const mapped = mapFrozenQuestionDetail(simLetterOptions, 1, {
    subject: "geometry",
    topic: "shapes",
    resolveSkillLabelHe: (key, ctx) => activityExportSkillLabelHe(key, ctx),
  });
  assert(mapped.correctAnswerDisplay === "ב", "letter-only options: correct answer stays ב");
  assert(mapped.skillLabelHe === "צורות", "shapes_skill → צורות");
}

// ─── Section 12: Export label helpers ──────────────────────────────────────

console.log("\n── Export label helpers ──");

{
  assert(activityExportSubjectLabelHe("geometry") === "גאומטריה", "labels: geometry → גאומטריה");
  assert(activityExportModeLabelHe("guided_practice") === "תרגול מודרך", "labels: guided_practice → תרגול מודרך");
  assert(activityExportModeLabelHe("quiz") === "בוחן", "labels: quiz → בוחן");
  assert(activityExportTopicLabelHe("geometry", "angles") !== "", "labels: angles topic has Hebrew label");
  assert(!looksLikeRawExportKey("זוויות"), "labels: Hebrew text is not raw key");
  assert(looksLikeRawExportKey("angles_skill"), "labels: detects raw internal key");

  const formatted = formatActivityExportDateTimeHe("2026-04-05T08:37:00.000Z");
  assert(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(formatted), "labels: ISO → DD/MM/YYYY HH:mm", `got "${formatted}"`);
}

// ─── Section 13: SIM-shaped workbook integration ───────────────────────────

console.log("\n── SIM-shaped workbook integration ──");

{
  const simQuestions = [0, 1, 2].map((i) =>
    mapFrozenQuestionDetail(
      {
        questionText: `שאלה ${i + 1}`,
        options: ["45°", "90°", "180°", "270°"],
        correctAnswer: "ב",
        skillKey: i === 0 ? "angles_skill" : "shapes_skill",
        topic: i === 0 ? "angles" : "shapes",
      },
      i,
      {
        subject: "geometry",
        topic: i === 0 ? "angles" : "shapes",
        resolveSkillLabelHe: (key, ctx) => activityExportSkillLabelHe(key, ctx),
      }
    )
  );

  const simPayload = {
    ...MOCK_PAYLOAD,
    activity: {
      ...MOCK_PAYLOAD.activity,
      title: "יום 159 שעה 6 — geometry SIM:2026-04-09 ש׳6",
      subject: "geometry",
      topic: "angles",
      mode: "guided_practice",
      closedAt: "2026-04-09T14:49:00+00:00",
    },
    questions: simQuestions,
    questionCount: 3,
  };

  const { rows: qRows } = buildEnrichedQuestionsTable(simQuestions);
  assert(qRows.every((r) => String(r[1]).length > 0), "SIM workbook: all question text cells populated");
  assert(qRows.every((r) => String(r[2]).includes("90°") || String(r[2]) === "ב"), "SIM workbook: correct answer is meaningful");

  const kv = buildEnrichedSummaryKV(simPayload);
  const subjectRow = kv.find((r) => r[0] === "מקצוע");
  assert(subjectRow?.[1] === "גאומטריה", "SIM summary: geometry → גאומטריה", `got "${subjectRow?.[1]}"`);
  const topicRow = kv.find((r) => r[0] === "נושא");
  assert(topicRow && !looksLikeRawExportKey(topicRow[1]), "SIM summary: topic is Hebrew not raw key");
  const titleRow = kv.find((r) => r[0] === "שם פעילות");
  assert(titleRow && !String(titleRow[1]).includes("geometry"), "SIM summary: title sanitized from geometry key");
  assert(titleRow && !String(titleRow[1]).includes("SIM"), "SIM summary: title has no SIM marker");
  assert(titleRow && String(titleRow[1]).includes("גאומטריה"), "SIM summary: title uses export geometry spelling");
  assert(titleRow && String(titleRow[1]).includes("09/04/2026"), "SIM summary: title includes formatted date");

  const enrichedStem = buildEnrichedActivityReportDownloadStem(simPayload);
  assert(!enrichedStem.includes("geometry"), "enriched filename: no geometry key", `got "${enrichedStem}"`);
  assert(!enrichedStem.includes("SIM"), "enriched filename: no SIM marker", `got "${enrichedStem}"`);
  assert(enrichedStem.includes("גאומטריה"), "enriched filename: Hebrew subject", `got "${enrichedStem}"`);

  const csvStem = buildActivityReportDownloadStem(simPayload);
  assert(csvStem.includes("geometry"), "CSV filename: still uses raw DB title (unchanged)");
  assert(csvStem.includes("SIM"), "CSV filename: still uses raw DB title SIM marker (unchanged)");
}

// ─── Section 14: SIM stub question_set shape (DB parity) ─────────────────────

console.log("\n── SIM stub question_set (DB parity) ──");

{
  const stubQ = {
    questionText: "שאלה 1",
    options: ["א", "ב", "ג", "ד"],
    correctAnswer: "ב",
    skillKey: "angles_skill",
    topic: "angles",
  };
  const mapped = mapFrozenQuestionDetail(stubQ, 0, {
    subject: "geometry",
    topic: "angles",
    resolveSkillLabelHe: (key, ctx) => activityExportSkillLabelHe(key, ctx),
  });
  assert(mapped.questionText === "שאלה 1", "DB stub: question text passes through as stored");
  assert(
    JSON.stringify(mapped.choices) === JSON.stringify(["א", "ב", "ג", "ד"]),
    "DB stub: options pass through as stored"
  );
  assert(mapped.correctAnswerDisplay === "ב", "DB stub: correct answer is letter-only when options are placeholders");

  const exportTitle = activityExportTitleHe(
    "יום 157 שעה 2 — geometry SIM:2026-04-07 ש׳2",
    "geometry",
    { closedAt: "2026-04-07T10:51:00+00:00" }
  );
  assert(exportTitle === "יום 157 שעה 2 — גאומטריה — 07/04/2026", "export title: full SIM title sanitized", `got "${exportTitle}"`);
}

// ─── Section 15: Teacher PDF v1 content builders ─────────────────────────────

console.log("\n── Teacher PDF v1 content ──");

{
  const pdfSections = buildTeacherActivityReportPdfSections(MOCK_PAYLOAD);
  assert(Array.isArray(pdfSections.sections), "PDF: sections array returned");
  assert(pdfSections.sections.length === 7, "PDF: 7 sections", `got ${pdfSections.sections.length}`);
  assert(
    pdfSections.sections.some((s) => s.id === "students" && s.title === "סיכום תלמידים"),
    "PDF: student summary section present"
  );
  assert(
    !pdfSections.sections.some((s) => s.id === "studentAnswers"),
    "PDF: no per-student-per-question audit trail section"
  );

  const visible = collectTeacherActivityReportPdfVisibleText(MOCK_PAYLOAD);
  assert(visible.includes("מתמטיקה"), "PDF: Hebrew subject label used");
  assert(!visible.includes("geometry"), "PDF: no raw geometry key");
  assert(!visible.includes("guided_practice"), "PDF: no raw mode key");
  assert(!visible.includes("SIM"), "PDF: no SIM marker");
  assert(!teacherActivityReportPdfContainsRawExportKey(visible), "PDF: no raw export keys in visible text");
  assert(!teacherActivityReportPdfContainsAiPhrase(visible), "PDF: no AI recommendation phrases");

  assert(!teacherActivityReportPdfContainsReversedHebrewMarkers(visible), "PDF: no character-reversed Hebrew markers in logical text");

  for (const title of TEACHER_PDF_REQUIRED_SECTION_TITLES_HE) {
    assert(visible.includes(title), `PDF section title present: ${title}`);
  }
  assert(visible.includes(TEACHER_PDF_DOCUMENT_TITLE_HE), "PDF document title in visible text");

  const studentSection = pdfSections.sections.find((s) => s.id === "students");
  const correctnessCol = ENRICHED_STUDENT_SUMMARY_HEADERS_HE.indexOf("נכונות");
  assert(correctnessCol >= 0, "PDF student table: נכונות column exists");
  assert(studentSection?.rows?.[0]?.[correctnessCol] === "2/3", "PDF student table: X/N correctness primary");

  const followUp = pdfSections.sections.find((s) => s.id === "followUp");
  const actionRow = followUp?.kv?.find((r) => r[0] === "הצעות לפעולה");
  assert(actionRow && actionRow[1] === "", "PDF follow-up: blank teacher action field");

  const qaHeaders = pdfSections.sections.find((s) => s.id === "questionAnalytics")?.headers || [];
  assert(
    qaHeaders.includes(ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE),
    "PDF question analytics: fully Hebrew X/N header"
  );
  assert(!qaHeaders.includes("דיוק X/N"), "PDF question analytics: no legacy דיוק X/N");

  let emptyOk = true;
  try {
    buildTeacherActivityReportPdfSections({
      activity: {},
      summary: {},
      students: [],
      questions: [],
      responses: [],
      perQuestion: [],
      allSkills: [],
    });
  } catch {
    emptyOk = false;
  }
  assert(emptyOk, "PDF: empty/minimal payload does not crash section builder");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}

console.log("All tests passed.");
process.exit(0);
