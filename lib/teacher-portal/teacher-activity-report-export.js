/**
 * Hebrew-friendly export helpers for teacher activity reports (browser-safe).
 */

import XLSX from "xlsx-js-style";
import { sanitizeSpreadsheetCellValue } from "../security/export-cell-sanitize.js";
import { studentActivityStatusLabelHe } from "../platform-ui/hebrew-display-labels.js";
import {
  activityExportDifficultyLabelHe,
  activityExportGradeLevelHe,
  activityExportModeLabelHe,
  activityExportSubjectLabelHe,
  activityExportTitleHe,
  activityExportTopicLabelHe,
  formatActivityExportDateTimeHe,
} from "./teacher-activity-report-export-labels.js";

export const ACTIVITY_REPORT_SHEET_NAME_HE = "דוח פעילות";

export const ACTIVITY_REPORT_EXPORT_HEADERS_HE = [
  "ילד/ה",
  "סטטוס",
  "תשובות",
  "נכונות",
  "ציון",
];

export const ACTIVITY_REPORT_XLSX_COL_WIDTHS = [22, 16, 14, 14, 12];

const ACTIVITY_REPORT_HEADER_CELL_STYLE = {
  alignment: { horizontal: "right", readingOrder: 2 },
  font: { bold: true },
};

const ACTIVITY_REPORT_DATA_CELL_STYLE = {
  alignment: { horizontal: "right", readingOrder: 2 },
};

/**
 * @param {unknown} value
 */
export function csvEscapeCell(value) {
  const s = sanitizeSpreadsheetCellValue(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * @param {unknown[]} row
 * @returns {unknown[]}
 */
function sanitizeSpreadsheetExportRow(row) {
  return row.map((cell) => sanitizeSpreadsheetCellValue(cell));
}

/**
 * @param {string|null|undefined} raw
 */
export function sanitizeActivityReportDownloadStem(raw) {
  const cleaned = String(raw || "פעילות")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "פעילות";
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null, questionCount?: number|null }, students?: Array<Record<string, unknown>> }|null|undefined} data
 */
export function buildActivityReportStudentRows(data) {
  const questionCount = Number(data?.activity?.questionCount) || 0;
  return [...(data?.students || [])]
    .sort((a, b) => (Number(b.scorePct) || 0) - (Number(a.scorePct) || 0))
    .map((s) => {
      const correctCount = Number(s.correctCount) || 0;
      const answersCount = Number(s.answersCount) || 0;
      const scorePct = s.scorePct;
      return [
        String(s.studentFullNameMasked || s.studentFullName || "").trim(),
        studentActivityStatusLabelHe(s.status),
        answersCount,
        questionCount > 0 ? `${correctCount}/${questionCount}` : correctCount,
        scorePct == null || scorePct === "" ? "" : Number(scorePct),
      ];
    });
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null }, students?: Array<Record<string, unknown>> }|null|undefined} data
 */
export function buildActivityReportCsvContent(data) {
  const rows = buildActivityReportStudentRows(data);
  const lines = [ACTIVITY_REPORT_EXPORT_HEADERS_HE.map(csvEscapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscapeCell).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null } }|null|undefined} data
 */
export function buildActivityReportDownloadStem(data) {
  const titleStem = sanitizeActivityReportDownloadStem(data?.activity?.title);
  const dateStem = new Date().toISOString().slice(0, 10);
  return `דוח-פעילות-${titleStem || dateStem}`;
}

/**
 * Filename stem for enriched Excel export (Hebrew-sanitized title, no raw English keys).
 * @param {{ activity?: { title?: string|null, subject?: string|null, closedAt?: string|null } }|null|undefined} payload
 */
export function buildEnrichedActivityReportDownloadStem(payload) {
  const act = payload?.activity || {};
  const subject = act.subject != null ? String(act.subject) : "";
  const displayTitle = activityExportTitleHe(act.title, subject, {
    closedAt: act.closedAt != null ? String(act.closedAt) : null,
  });
  const titleStem = sanitizeActivityReportDownloadStem(displayTitle);
  const dateStem = new Date().toISOString().slice(0, 10);
  return `דוח-פעילות-${titleStem || dateStem}`;
}

/**
 * @param {import("xlsx-js-style").WorkSheet} sheet
 * @param {number} rowCount
 * @param {number} colCount
 */
export function applyActivityReportSheetFormatting(sheet, rowCount, colCount) {
  sheet["!views"] = [{ rightToLeft: true }];
  for (let c = 0; c < colCount; c += 1) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (sheet[ref]) {
      sheet[ref].s = ACTIVITY_REPORT_HEADER_CELL_STYLE;
    }
  }
  for (let r = 1; r < rowCount; r += 1) {
    for (let c = 0; c < colCount; c += 1) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (sheet[ref]) {
        sheet[ref].s = ACTIVITY_REPORT_DATA_CELL_STYLE;
      }
    }
  }
  sheet["!cols"] = ACTIVITY_REPORT_XLSX_COL_WIDTHS.map((wch) => ({ wch }));
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null, questionCount?: number|null }, students?: Array<Record<string, unknown>> }|null|undefined} data
 */
export function buildActivityReportWorkbook(data) {
  const rows = buildActivityReportStudentRows(data);
  const colCount = ACTIVITY_REPORT_EXPORT_HEADERS_HE.length;
  const sheet = XLSX.utils.aoa_to_sheet([ACTIVITY_REPORT_EXPORT_HEADERS_HE, ...rows]);
  applyActivityReportSheetFormatting(sheet, rows.length + 1, colCount);

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(workbook, sheet, ACTIVITY_REPORT_SHEET_NAME_HE);
  return workbook;
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null, questionCount?: number|null }, students?: Array<Record<string, unknown>> }|null|undefined} data
 */
export function buildActivityReportXlsxArrayBuffer(data) {
  const workbook = buildActivityReportWorkbook(data);
  return XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null, questionCount?: number|null }, students?: Array<Record<string, unknown>> }|null|undefined} data
 */
export function downloadActivityReportXlsx(data) {
  const buffer = buildActivityReportXlsxArrayBuffer(data);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBrowserDownload(blob, `${buildActivityReportDownloadStem(data)}.xlsx`);
}

/**
 * @param {{ activity?: { title?: string|null, activityId?: string|null, questionCount?: number|null }, students?: Array<Record<string, unknown>> }|null|undefined} data
 */
export function downloadActivityReportCsv(data) {
  const blob = new Blob([buildActivityReportCsvContent(data)], {
    type: "text/csv;charset=utf-8",
  });
  triggerBrowserDownload(blob, `${buildActivityReportDownloadStem(data)}.csv`);
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ===========================================================================
// Enriched multi-sheet Excel export
// ===========================================================================

/** Fully Hebrew column header for X/N correctness ratio (replaces legacy "דיוק X/N"). */
export const ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE = "נכונות מתוך כלל התשובות";

const ENRICHED_HEADER_STYLE = {
  alignment: { horizontal: "right", readingOrder: 2, wrapText: true },
  font: { bold: true },
};
const ENRICHED_DATA_STYLE = {
  alignment: { horizontal: "right", readingOrder: 2 },
};
const ENRICHED_SECTION_LABEL_STYLE = {
  alignment: { horizontal: "right", readingOrder: 2 },
  font: { bold: true },
};

/**
 * Apply RTL view + per-cell styles to a sheet.
 * @param {import("xlsx-js-style").WorkSheet} sheet
 * @param {number} headerRow  – 0-based row index of the header (usually 0)
 * @param {number} colCount
 * @param {number} totalRows  – including header
 */
function applyEnrichedSheetStyles(sheet, headerRow, colCount, totalRows) {
  sheet["!views"] = [{ rightToLeft: true }];
  for (let c = 0; c < colCount; c += 1) {
    const ref = XLSX.utils.encode_cell({ r: headerRow, c });
    if (sheet[ref]) sheet[ref].s = ENRICHED_HEADER_STYLE;
  }
  for (let r = headerRow + 1; r < totalRows; r += 1) {
    for (let c = 0; c < colCount; c += 1) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (sheet[ref]) sheet[ref].s = ENRICHED_DATA_STYLE;
    }
  }
}

/**
 * Apply RTL + bold-label style to a key-value sheet (col A bold, col B data).
 * @param {import("xlsx-js-style").WorkSheet} sheet
 * @param {number} rowCount
 */
function applyKvSheetStyles(sheet, rowCount) {
  sheet["!views"] = [{ rightToLeft: true }];
  for (let r = 0; r < rowCount; r += 1) {
    const labelRef = XLSX.utils.encode_cell({ r, c: 0 });
    const valueRef = XLSX.utils.encode_cell({ r, c: 1 });
    if (sheet[labelRef]) sheet[labelRef].s = ENRICHED_SECTION_LABEL_STYLE;
    if (sheet[valueRef]) sheet[valueRef].s = ENRICHED_DATA_STYLE;
  }
}

// ---------------------------------------------------------------------------
// Sheet 1 — סיכום פעילות (Activity Summary) — key-value layout
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, unknown>} payload
 * @returns {Array<[string, string|number]>}
 */
export function buildEnrichedSummaryKV(payload) {
  const act = payload?.activity || {};
  const summary = payload?.summary || {};
  const classInfo = payload?.classInfo || null;
  const teacherInfo = payload?.teacherInfo || null;
  const meta = payload?.exportMeta || {};
  const subject = act.subject != null ? String(act.subject) : "";

  const subtopicRaw = act.subtopic != null ? String(act.subtopic) : "";
  const subtopicHe =
    subtopicRaw && /[\u0590-\u05FF]/.test(subtopicRaw)
      ? subtopicRaw
      : activityExportTopicLabelHe(subject, subtopicRaw) || "";

  /** @type {Array<[string, string|number]>} */
  const rows = [
    ["שם פעילות", activityExportTitleHe(act.title, subject, { closedAt: act.closedAt })],
    ["מקצוע", activityExportSubjectLabelHe(subject)],
    ["נושא", activityExportTopicLabelHe(subject, act.topic) || ""],
    ["תת-נושא", subtopicHe],
    ["רמה", activityExportDifficultyLabelHe(act.difficultyLevel, subject)],
    ["סוג פעילות", activityExportModeLabelHe(act.mode)],
    ["מספר שאלות", Number(act.questionCount) || 0],
    ["הגבלת זמן (שניות)", act.timeLimitSeconds != null ? Number(act.timeLimitSeconds) : ""],
    ["תאריך הפעלה", formatActivityExportDateTimeHe(act.activatedAt)],
    ["תאריך סגירה", formatActivityExportDateTimeHe(act.closedAt)],
    ["", ""],
    ["שם כיתה", classInfo?.className != null ? String(classInfo.className) : ""],
    ["שכבת כיתה", activityExportGradeLevelHe(classInfo?.gradeLevel)],
    ["", ""],
    ["שם מורה", teacherInfo?.displayName != null ? String(teacherInfo.displayName) : ""],
    ["", ""],
    ["מספר ילדים ברשימה", Number(summary.rosterCount) || 0],
    ["הגישו", Number(summary.submittedCount) || 0],
    ["לא התחילו", Number(summary.notStartedCount) || 0],
    ["בתהליך", Number(summary.inProgressCount) || 0],
    ["אחוז השלמה (%)", summary.completionRate != null ? Number(summary.completionRate) : ""],
    ["דיוק כיתה (%)", summary.classAccuracy != null ? Number(summary.classAccuracy) : ""],
    ["", ""],
    ["דוח נוצר ב", formatActivityExportDateTimeHe(meta.generatedAt)],
  ];

  return rows;
}

// ---------------------------------------------------------------------------
// Sheet 2 — פרטי שאלות (Question Details)
// ---------------------------------------------------------------------------

/**
 * Returns [headers, ...rows] for the question-details sheet.
 * Dynamically adds choice columns based on max choices found.
 *
 * @param {Array<Record<string, unknown>>} questions
 * @returns {{ headers: string[], rows: Array<Array<string|number>> }}
 */
export function buildEnrichedQuestionsTable(questions) {
  const maxChoices = (questions || []).reduce((max, q) => {
    const len = Array.isArray(q.choices) ? q.choices.length : 0;
    return Math.max(max, len);
  }, 0);

  const CHOICE_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];
  const choiceHeaders = Array.from({ length: maxChoices }, (_, i) =>
    `אפשרות ${CHOICE_LETTERS[i] || String(i + 1)}`
  );

  const headers = [
    "מספר שאלה",
    "טקסט שאלה",
    "תשובה נכונה",
    ...choiceHeaders,
    "מיומנות",
    "הסבר",
  ];

  const rows = (questions || []).map((q) => {
    const choices = Array.isArray(q.choices) ? q.choices : [];
    const choiceCells = Array.from(
      { length: maxChoices },
      (_, i) => (choices[i] != null ? String(choices[i]) : "")
    );
    const correctDisplay =
      q.correctAnswerDisplay != null && String(q.correctAnswerDisplay).trim()
        ? String(q.correctAnswerDisplay)
        : String(q.correctAnswer || "");
    return [
      Number(q.questionIndex) + 1,
      String(q.questionText || ""),
      correctDisplay,
      ...choiceCells,
      q.skillLabelHe != null ? String(q.skillLabelHe) : "",
      q.explanation != null ? String(q.explanation) : "",
    ];
  });

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Sheet 3 — סיכום ילדים (Student Summary)
// ---------------------------------------------------------------------------

export const ENRICHED_STUDENT_SUMMARY_HEADERS_HE = [
  "ילד/ה",
  "סטטוס",
  "תשובות",
  "נכונות",
  "שאלות שגויות",
  "ציון (%)",
  "התחיל ב",
  "הגיש ב",
];

/**
 * @param {Array<Record<string, unknown>>} students
 * @param {number} questionCount
 * @returns {Array<Array<string|number>>}
 */
export function buildEnrichedStudentSummaryRows(students, questionCount) {
  return [...(students || [])]
    .sort((a, b) => (Number(b.scorePct) || 0) - (Number(a.scorePct) || 0))
    .map((s) => {
      const correctCount = Number(s.correctCount) || 0;
      const answersCount = Number(s.answersCount) || 0;
      const qCount = Number(questionCount) || 0;
      const wrongCount = qCount > 0 ? qCount - correctCount : "";
      const correctDisplay = qCount > 0 ? `${correctCount}/${qCount}` : correctCount;
      return [
        String(s.studentFullNameMasked || "").trim(),
        studentActivityStatusLabelHe(s.status),
        answersCount,
        correctDisplay,
        wrongCount,
        s.scorePct != null ? Number(s.scorePct) : "",
        formatActivityExportDateTimeHe(s.startedAt),
        formatActivityExportDateTimeHe(s.submittedAt),
      ];
    });
}

// ---------------------------------------------------------------------------
// Sheet 4 — תשובות ילדים (Student Answers — Long Format)
// ---------------------------------------------------------------------------

export const ENRICHED_STUDENT_ANSWERS_HEADERS_HE = [
  "ילד/ה",
  "מספר שאלה",
  "טקסט שאלה",
  "תשובת ילד/ה",
  "תשובה נכונה",
  "נכון?",
  "זמן (שניות)",
  "נעזר ברמז",
  "צפה בהסבר",
  "ענה ב",
];

/**
 * Build long-format rows — one row per (student × question).
 * Rows for questions the student did not answer appear with empty answer cells.
 * Students are sorted alphabetically by masked name; questions by index ascending.
 *
 * @param {Array<Record<string, unknown>>} students
 * @param {Array<Record<string, unknown>>} questions
 * @param {Array<Record<string, unknown>>} responses
 * @param {number} questionCount
 * @returns {Array<Array<string|number>>}
 */
export function buildEnrichedStudentAnswersRows(students, questions, responses, questionCount) {
  const qCount = Number(questionCount) || 0;

  // Build lookup: "studentId:questionIndex" → response
  /** @type {Map<string, Record<string, unknown>>} */
  const responseMap = new Map();
  for (const r of responses || []) {
    responseMap.set(`${r.studentId}:${Number(r.questionIndex)}`, r);
  }

  // Sort students alphabetically by masked name for readability
  const sortedStudents = [...(students || [])].sort((a, b) =>
    String(a.studentFullNameMasked || "").localeCompare(
      String(b.studentFullNameMasked || ""),
      "he"
    )
  );

  /** @type {Array<Array<string|number>>} */
  const rows = [];

  for (const student of sortedStudents) {
    for (let qi = 0; qi < qCount; qi += 1) {
      const key = `${student.studentId}:${qi}`;
      const r = responseMap.get(key);
      const q = questions[qi];
      const questionText = q?.questionText != null ? String(q.questionText) : "";
      const selectedDisplay =
        r?.selectedAnswerDisplay != null && String(r.selectedAnswerDisplay).trim()
          ? String(r.selectedAnswerDisplay)
          : r?.selectedAnswer != null
            ? String(r.selectedAnswer)
            : "";
      const correctDisplay =
        r?.correctAnswerDisplay != null && String(r.correctAnswerDisplay).trim()
          ? String(r.correctAnswerDisplay)
          : q?.correctAnswerDisplay != null && String(q.correctAnswerDisplay).trim()
            ? String(q.correctAnswerDisplay)
            : r?.correctAnswer != null
              ? String(r.correctAnswer)
              : q?.correctAnswer != null
                ? String(q.correctAnswer)
                : "";

      let correctMark = "";
      if (r != null) {
        correctMark = r.isCorrect === true ? "✓" : r.isCorrect === false ? "✗" : "";
      }

      const timeDisplay =
        r?.timeSpentMs != null
          ? Number((Number(r.timeSpentMs) / 1000).toFixed(1))
          : "";

      const hintsDisplay =
        r != null && Number(r.hintsUsed) > 0 ? Number(r.hintsUsed) : "";

      const explanationDisplay =
        r?.explanationViewed === true ? "כן" : "";

      rows.push([
        String(student.studentFullNameMasked || "").trim(),
        qi + 1,
        questionText,
        selectedDisplay,
        correctDisplay,
        correctMark,
        timeDisplay,
        hintsDisplay,
        explanationDisplay,
        formatActivityExportDateTimeHe(r?.answeredAt),
      ]);
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Sheet 5 — ניתוח שאלות (Question Analytics)
// ---------------------------------------------------------------------------

export const ENRICHED_QUESTION_ANALYTICS_HEADERS_HE = [
  "מספר שאלה",
  "טקסט שאלה",
  "תשובות",
  "נכונות",
  "שגויות",
  ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE,
  "דיוק (%)",
  "מיומנות",
  "ילדים שטעו",
];

/**
 * @param {Array<Record<string, unknown>>} perQuestion
 * @param {Array<Record<string, unknown>>} questions
 * @returns {Array<Array<string|number>>}
 */
export function buildEnrichedQuestionAnalyticsRows(perQuestion, questions) {
  return [...(perQuestion || [])]
    .sort((a, b) => Number(a.questionIndex) - Number(b.questionIndex))
    .map((pq) => {
      const qi = Number(pq.questionIndex);
      const q = questions[qi];
      const skillLabel = q?.skillLabelHe != null ? String(q.skillLabelHe) : "";
      const total = Number(pq.totalAnswers) || 0;
      const correct = Number(pq.correctCount) || 0;
      const wrongStudentCount = Array.isArray(pq.wrongStudentIds)
        ? pq.wrongStudentIds.length
        : Number(pq.wrongCount) || 0;
      return [
        qi + 1,
        q?.questionText != null ? String(q.questionText) : String(pq.prompt || ""),
        total,
        correct,
        Number(pq.wrongCount) || 0,
        total > 0 ? `${correct}/${total}` : "",
        pq.accuracyPct != null ? Number(pq.accuracyPct) : "",
        skillLabel,
        wrongStudentCount,
      ];
    });
}

// ---------------------------------------------------------------------------
// Sheet 6 — ניתוח מיומנויות (Skill Analytics)
// ---------------------------------------------------------------------------

export const ENRICHED_SKILL_ANALYTICS_HEADERS_HE = [
  "מיומנות",
  "ניסיונות",
  "נכונות",
  ACTIVITY_EXPORT_CORRECTNESS_RATIO_HEADER_HE,
  "דיוק (%)",
  "חלשה?",
];

/**
 * @param {Array<Record<string, unknown>>} allSkills
 * @returns {Array<Array<string|number>>}
 */
export function buildEnrichedSkillAnalyticsRows(allSkills) {
  return (allSkills || []).map((sk) => {
    const answers = Number(sk.answers) || 0;
    const correct = Number(sk.correct) || 0;
    return [
      sk.skillLabelHe != null ? String(sk.skillLabelHe) : "",
      answers,
      correct,
      answers > 0 ? `${correct}/${answers}` : "",
      sk.accuracyPct != null ? Number(sk.accuracyPct) : "",
      sk.isWeak === true ? "כן" : "",
    ];
  });
}

// ---------------------------------------------------------------------------
// Sheet 7 — המלצות ומעקב (Recommendations & Follow-up)
// ---------------------------------------------------------------------------

/**
 * Build the recommendations key-value layout.
 * Only factual data — no AI/generated content.
 * The "הצעות לפעולה" row is left blank for the teacher to fill.
 *
 * @param {Record<string, unknown>} payload
 * @returns {Array<[string, string|number]>}
 */
export function buildEnrichedRecommendationsKV(payload) {
  const summary = payload?.summary || {};
  const allSkills = Array.isArray(payload?.allSkills) ? payload.allSkills : [];
  const weakSkills = allSkills.filter((sk) => sk.isWeak === true);
  const notFinished =
    (Number(summary.notStartedCount) || 0) +
    (Number(summary.inProgressCount) || 0);

  /** @type {Array<[string, string|number]>} */
  const rows = [
    ["אחוז השלמה (%)", summary.completionRate != null ? Number(summary.completionRate) : ""],
    ["ילדים שהגישו", Number(summary.submittedCount) || 0],
    ["ילדים שלא סיימו", notFinished],
    ["", ""],
  ];

  if (weakSkills.length > 0) {
    rows.push(["מיומנויות לחיזוק", ""]);
    for (const sk of weakSkills) {
      const label = sk.skillLabelHe != null ? String(sk.skillLabelHe) : "";
      if (!label) continue;
      const ratio = `${Number(sk.correct) || 0}/${Number(sk.answers) || 0}`;
      rows.push([`  ${label}`, `${ratio} (${Number(sk.accuracyPct) || 0}%)`]);
    }
  } else {
    rows.push(["מיומנויות לחיזוק", "אין מיומנויות חלשות שזוהו"]);
  }

  rows.push(["", ""]);
  rows.push(["הצעות לפעולה", ""]);

  return rows;
}

// ---------------------------------------------------------------------------
// Workbook assembly
// ---------------------------------------------------------------------------

/**
 * Build the enriched 7-sheet workbook from the enriched payload.
 * All existing single-sheet functions remain unchanged.
 *
 * @param {Record<string, unknown>} payload  – result of buildEnrichedActivityReportPayload
 * @returns {import("xlsx-js-style").WorkBook}
 */
export function buildEnrichedActivityReportWorkbook(payload) {
  const activity = payload?.activity || {};
  const students = Array.isArray(payload?.students) ? payload.students : [];
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const responses = Array.isArray(payload?.responses) ? payload.responses : [];
  const perQuestion = Array.isArray(payload?.perQuestion) ? payload.perQuestion : [];
  const allSkills = Array.isArray(payload?.allSkills) ? payload.allSkills : [];
  const questionCount = Number(activity.questionCount) || 0;

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };

  // ── Sheet 1: סיכום פעילות ──────────────────────────────────────────────────
  const summaryKV = buildEnrichedSummaryKV(payload).map((row) => sanitizeSpreadsheetExportRow(row));
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryKV);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 40 }];
  applyKvSheetStyles(summarySheet, summaryKV.length);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "סיכום פעילות");

  // ── Sheet 2: פרטי שאלות ───────────────────────────────────────────────────
  const { headers: qHeaders, rows: qRows } = buildEnrichedQuestionsTable(questions);
  const questionsSheet = XLSX.utils.aoa_to_sheet([qHeaders, ...qRows.map(sanitizeSpreadsheetExportRow)]);
  const qColWidths = [10, 46, 24, ...Array(Math.max(0, qHeaders.length - 4)).fill(18), 22, 32];
  questionsSheet["!cols"] = qColWidths.map((wch) => ({ wch }));
  applyEnrichedSheetStyles(questionsSheet, 0, qHeaders.length, qRows.length + 1);
  XLSX.utils.book_append_sheet(workbook, questionsSheet, "פרטי שאלות");

  // ── Sheet 3: סיכום ילדים ────────────────────────────────────────────────
  const studentRows = buildEnrichedStudentSummaryRows(students, questionCount).map(sanitizeSpreadsheetExportRow);
  const studentSheet = XLSX.utils.aoa_to_sheet([ENRICHED_STUDENT_SUMMARY_HEADERS_HE, ...studentRows]);
  studentSheet["!cols"] = [28, 16, 10, 12, 14, 12, 22, 22].map((wch) => ({ wch }));
  applyEnrichedSheetStyles(studentSheet, 0, ENRICHED_STUDENT_SUMMARY_HEADERS_HE.length, studentRows.length + 1);
  XLSX.utils.book_append_sheet(workbook, studentSheet, "סיכום ילדים");

  // ── Sheet 4: תשובות ילדים ───────────────────────────────────────────────
  const answerRows = buildEnrichedStudentAnswersRows(students, questions, responses, questionCount).map(
    sanitizeSpreadsheetExportRow
  );
  const answerSheet = XLSX.utils.aoa_to_sheet([ENRICHED_STUDENT_ANSWERS_HEADERS_HE, ...answerRows]);
  answerSheet["!cols"] = [28, 12, 40, 24, 24, 8, 12, 10, 12, 22].map((wch) => ({ wch }));
  applyEnrichedSheetStyles(answerSheet, 0, ENRICHED_STUDENT_ANSWERS_HEADERS_HE.length, answerRows.length + 1);
  XLSX.utils.book_append_sheet(workbook, answerSheet, "תשובות ילדים");

  // ── Sheet 5: ניתוח שאלות ──────────────────────────────────────────────────
  const qAnalyticsRows = buildEnrichedQuestionAnalyticsRows(perQuestion, questions).map(
    sanitizeSpreadsheetExportRow
  );
  const qAnalyticsSheet = XLSX.utils.aoa_to_sheet([ENRICHED_QUESTION_ANALYTICS_HEADERS_HE, ...qAnalyticsRows]);
  qAnalyticsSheet["!cols"] = [12, 40, 10, 10, 10, 12, 10, 22, 14].map((wch) => ({ wch }));
  applyEnrichedSheetStyles(qAnalyticsSheet, 0, ENRICHED_QUESTION_ANALYTICS_HEADERS_HE.length, qAnalyticsRows.length + 1);
  XLSX.utils.book_append_sheet(workbook, qAnalyticsSheet, "ניתוח שאלות");

  // ── Sheet 6: ניתוח מיומנויות ──────────────────────────────────────────────
  const skillRows = buildEnrichedSkillAnalyticsRows(allSkills).map(sanitizeSpreadsheetExportRow);
  const skillSheet = XLSX.utils.aoa_to_sheet([ENRICHED_SKILL_ANALYTICS_HEADERS_HE, ...skillRows]);
  skillSheet["!cols"] = [28, 10, 10, 12, 10, 8].map((wch) => ({ wch }));
  applyEnrichedSheetStyles(skillSheet, 0, ENRICHED_SKILL_ANALYTICS_HEADERS_HE.length, skillRows.length + 1);
  XLSX.utils.book_append_sheet(workbook, skillSheet, "ניתוח מיומנויות");

  // ── Sheet 7: המלצות ומעקב ─────────────────────────────────────────────────
  const recKV = buildEnrichedRecommendationsKV(payload).map((row) => sanitizeSpreadsheetExportRow(row));
  const recSheet = XLSX.utils.aoa_to_sheet(recKV);
  recSheet["!cols"] = [{ wch: 30 }, { wch: 40 }];
  applyKvSheetStyles(recSheet, recKV.length);
  XLSX.utils.book_append_sheet(workbook, recSheet, "המלצות ומעקב");

  return workbook;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {ArrayBuffer}
 */
export function buildEnrichedActivityReportXlsxArrayBuffer(payload) {
  const workbook = buildEnrichedActivityReportWorkbook(payload);
  return XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
}

/**
 * Trigger enriched multi-sheet Excel download in the browser.
 * @param {Record<string, unknown>} payload
 */
export function downloadEnrichedActivityReportXlsx(payload) {
  const buffer = buildEnrichedActivityReportXlsxArrayBuffer(payload);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBrowserDownload(blob, `${buildEnrichedActivityReportDownloadStem(payload)}.xlsx`);
}
