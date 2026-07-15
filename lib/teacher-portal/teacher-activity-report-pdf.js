/**
 * Teacher activity report PDF export (v1) — browser-only, enriched payload only.
 * Uses frozen data from buildEnrichedActivityReportPayload; no question-bank re-query.
 *
 * Hebrew rendering: jsPDF requires setR2L(true) + embedded Noto Sans Hebrew on all text,
 * including autotable head/body (fontStyle must be "normal" - no bold font file).
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  buildEnrichedActivityReportDownloadStem,
  buildEnrichedQuestionAnalyticsRows,
  buildEnrichedRecommendationsKV,
  buildEnrichedSkillAnalyticsRows,
  buildEnrichedStudentSummaryRows,
  ENRICHED_QUESTION_ANALYTICS_HEADERS_HE,
  ENRICHED_SKILL_ANALYTICS_HEADERS_HE,
  ENRICHED_STUDENT_SUMMARY_HEADERS_HE,
} from "./teacher-activity-report-export.js";
import {
  activityExportDifficultyLabelHe,
  activityExportGradeLevelHe,
  activityExportModeLabelHe,
  activityExportSubjectLabelHe,
  activityExportTitleHe,
  activityExportTopicLabelHe,
  formatActivityExportDateTimeHe,
  looksLikeRawExportKey,
} from "./teacher-activity-report-export-labels.js";
import {
  applyHebrewPdfDocumentSetup,
  applyPdfHebrewContext,
  formatPdfCellHe,
  formatPdfKvHe,
  formatPdfRowsHe,
  formatPdfTextHe,
  PDF_AUTOTABLE_BODY_STYLES_HE,
  PDF_AUTOTABLE_HEAD_STYLES_HE,
  PDF_AUTOTABLE_STYLES_HE,
  pdfAutotableDidDrawPageHe,
  TEACHER_ACTIVITY_PDF_EXPORT_ENABLED,
  writePdfTextHe,
} from "./teacher-activity-report-pdf-he.js";

export { TEACHER_ACTIVITY_PDF_EXPORT_ENABLED };

/** Phrases that must never appear in teacher PDF v1 (factual export only). */
export const TEACHER_PDF_AI_PHRASE_DENYLIST = [
  "מומלץ",
  "מוצע",
  "אנו ממליצים",
  "recommended",
  "AI",
  "ChatGPT",
  "המלצות AI",
];

/** Required section titles for visual/text verification. */
export const TEACHER_PDF_REQUIRED_SECTION_TITLES_HE = [
  "פרטי פעילות",
  "סיכום כיתה",
  "שאלות",
  "סיכום ילדים",
  "ניתוח שאלות",
  "ניתוח מיומנויות",
  "מעקב והמשך",
];

export const TEACHER_PDF_DOCUMENT_TITLE_HE = "דוח פעילות - מורה";

/**
 * @param {Record<string, unknown>} payload
 * @returns {Array<[string, string|number]>}
 */
export function buildTeacherActivityReportPdfCoverKv(payload) {
  const act = payload?.activity || {};
  const summary = payload?.summary || {};
  const classInfo = payload?.classInfo || null;
  const teacherInfo = payload?.teacherInfo || null;
  const subject = act.subject != null ? String(act.subject) : "";
  const subtopicRaw = act.subtopic != null ? String(act.subtopic) : "";
  const subtopicHe =
    subtopicRaw && /[\u0590-\u05FF]/.test(subtopicRaw)
      ? subtopicRaw
      : activityExportTopicLabelHe(subject, subtopicRaw) || "";

  return [
    ["שם פעילות", activityExportTitleHe(act.title, subject, { closedAt: act.closedAt })],
    ["שם כיתה", classInfo?.className != null ? String(classInfo.className) : ""],
    ["שם מורה", teacherInfo?.displayName != null ? String(teacherInfo.displayName) : ""],
    ["מקצוע", activityExportSubjectLabelHe(subject)],
    ["נושא", activityExportTopicLabelHe(subject, act.topic) || ""],
    ["תת-נושא", subtopicHe],
    ["רמה", activityExportDifficultyLabelHe(act.difficultyLevel, subject)],
    ["סוג פעילות", activityExportModeLabelHe(act.mode)],
    ["שכבת כיתה", activityExportGradeLevelHe(classInfo?.gradeLevel)],
    ["תאריך הפעלה", formatActivityExportDateTimeHe(act.activatedAt)],
    ["תאריך סגירה", formatActivityExportDateTimeHe(act.closedAt)],
    ["מספר שאלות", Number(act.questionCount) || 0],
    ["מספר ילדים", Number(summary.rosterCount) || 0],
  ];
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Array<[string, string|number]>}
 */
export function buildTeacherActivityReportPdfClassSummaryKv(payload) {
  const summary = payload?.summary || {};
  return [
    ["הגישו", Number(summary.submittedCount) || 0],
    ["לא התחילו", Number(summary.notStartedCount) || 0],
    ["בתהליך", Number(summary.inProgressCount) || 0],
    ["אחוז השלמה (%)", summary.completionRate != null ? Number(summary.completionRate) : ""],
    ["דיוק כיתה (%)", summary.classAccuracy != null ? Number(summary.classAccuracy) : ""],
  ];
}

export const TEACHER_PDF_QUESTIONS_HEADERS_HE = [
  "מספר שאלה",
  "טקסט שאלה",
  "אפשרויות",
  "תשובה נכונה",
  "מיומנות",
];

/**
 * @param {Array<Record<string, unknown>>} questions
 */
export function buildTeacherActivityReportPdfQuestionsRows(questions) {
  return (questions || []).map((q, i) => {
    const choices = Array.isArray(q.choices) ? q.choices : [];
    const optionsDisplay = choices.length
      ? choices
          .map((text, idx) => {
            const letter = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"][idx] || String(idx + 1);
            return `${letter}: ${text}`;
          })
          .join(" · ")
      : "";
    const correctDisplay =
      q.correctAnswerDisplay != null && String(q.correctAnswerDisplay).trim()
        ? String(q.correctAnswerDisplay)
        : q.correctAnswer != null
          ? String(q.correctAnswer)
          : "";
    return [
      i + 1,
      q.questionText != null ? String(q.questionText) : "",
      optionsDisplay,
      correctDisplay,
      q.skillLabelHe != null ? String(q.skillLabelHe) : "",
    ];
  });
}

/**
 * @param {Array<Record<string, unknown>>} students
 * @param {number} questionCount
 */
export function buildTeacherActivityReportPdfStudentRows(students, questionCount) {
  return buildEnrichedStudentSummaryRows(students, questionCount);
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function buildTeacherActivityReportPdfSections(payload) {
  const safe = payload || {};
  const activity = safe.activity || {};
  const questions = Array.isArray(safe.questions) ? safe.questions : [];
  const students = Array.isArray(safe.students) ? safe.students : [];
  const perQuestion = Array.isArray(safe.perQuestion) ? safe.perQuestion : [];
  const allSkills = Array.isArray(safe.allSkills) ? safe.allSkills : [];
  const questionCount = Number(activity.questionCount) || 0;
  const subject = activity.subject != null ? String(activity.subject) : "";

  const coverKv = buildTeacherActivityReportPdfCoverKv(safe);
  const classSummaryKv = buildTeacherActivityReportPdfClassSummaryKv(safe);
  const questionRows = buildTeacherActivityReportPdfQuestionsRows(questions);
  const studentRows = buildTeacherActivityReportPdfStudentRows(students, questionCount);
  const questionAnalyticsRows = buildEnrichedQuestionAnalyticsRows(perQuestion, questions);
  const skillRows = buildEnrichedSkillAnalyticsRows(allSkills);
  const followUpKv = buildEnrichedRecommendationsKV(safe);

  const documentTitle = activityExportTitleHe(activity.title, subject, {
    closedAt: activity.closedAt,
  });
  const filenameStem = buildEnrichedActivityReportDownloadStem(safe);

  const sections = [
    { id: "cover", title: "פרטי פעילות", kv: coverKv },
    { id: "classSummary", title: "סיכום כיתה", kv: classSummaryKv },
    {
      id: "questions",
      title: "שאלות",
      headers: TEACHER_PDF_QUESTIONS_HEADERS_HE,
      rows: questionRows,
    },
    {
      id: "students",
      title: "סיכום ילדים",
      headers: ENRICHED_STUDENT_SUMMARY_HEADERS_HE,
      rows: studentRows,
    },
    {
      id: "questionAnalytics",
      title: "ניתוח שאלות",
      headers: ENRICHED_QUESTION_ANALYTICS_HEADERS_HE,
      rows: questionAnalyticsRows,
    },
    {
      id: "skills",
      title: "ניתוח מיומנויות",
      headers: ENRICHED_SKILL_ANALYTICS_HEADERS_HE,
      rows: skillRows,
    },
    { id: "followUp", title: "מעקב והמשך", kv: followUpKv },
  ];

  const allText = [
    TEACHER_PDF_DOCUMENT_TITLE_HE,
    documentTitle,
    filenameStem,
    ...sections.flatMap((s) => {
      const parts = [s.title];
      if (s.kv) parts.push(...s.kv.flatMap((r) => [formatPdfCellHe(r[0]), formatPdfCellHe(r[1])]));
      if (s.headers) parts.push(...s.headers, ...s.rows.flatMap((r) => r.map(formatPdfCellHe)));
      return parts;
    }),
  ].join(" ");

  return {
    documentTitle,
    filenameStem,
    sections,
    allText,
  };
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {string} title
 * @param {number} y
 */
function addPdfSectionTitle(doc, title, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(13);
  writePdfTextHe(doc, title, pageWidth - 14, y, { align: "right" });
  return y + 7;
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {Array<[string, string|number]>} kv
 * @param {number} startY
 */
function addPdfKvTable(doc, kv, startY) {
  autoTable(doc, {
    startY,
    body: formatPdfKvHe(kv),
    theme: "plain",
    styles: { ...PDF_AUTOTABLE_STYLES_HE },
    headStyles: { ...PDF_AUTOTABLE_HEAD_STYLES_HE },
    bodyStyles: { ...PDF_AUTOTABLE_BODY_STYLES_HE },
    columnStyles: {
      0: { cellWidth: 42 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => pdfAutotableDidDrawPageHe(doc),
  });
  return doc.lastAutoTable.finalY + 8;
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {string[]} headers
 * @param {Array<Array<unknown>>} rows
 * @param {number} startY
 */
function addPdfDataTable(doc, headers, rows, startY) {
  autoTable(doc, {
    startY,
    head: [headers.map(formatPdfTextHe)],
    body: formatPdfRowsHe(rows),
    styles: { ...PDF_AUTOTABLE_STYLES_HE, fontSize: 8 },
    headStyles: { ...PDF_AUTOTABLE_HEAD_STYLES_HE },
    bodyStyles: { ...PDF_AUTOTABLE_BODY_STYLES_HE },
    margin: { left: 10, right: 14 },
    tableWidth: "auto",
    didDrawPage: () => pdfAutotableDidDrawPageHe(doc),
  });
  return doc.lastAutoTable.finalY + 8;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ readFontBase64?: () => Promise<string>|string }|null|undefined} [options]
 */
export async function buildTeacherActivityReportPdf(payload, options = {}) {
  const sectionsData = buildTeacherActivityReportPdfSections(payload);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  await applyHebrewPdfDocumentSetup(doc, options);

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  writePdfTextHe(doc, TEACHER_PDF_DOCUMENT_TITLE_HE, pageWidth - 14, 16, { align: "right" });
  doc.setFontSize(11);
  writePdfTextHe(doc, sectionsData.documentTitle, pageWidth - 14, 24, {
    align: "right",
    maxWidth: pageWidth - 28,
  });

  let y = 32;

  for (const section of sectionsData.sections) {
    if (y > 250) {
      doc.addPage();
      applyPdfHebrewContext(doc);
      y = 16;
    }
    y = addPdfSectionTitle(doc, section.title, y);
    if (section.kv) {
      y = addPdfKvTable(doc, section.kv, y);
    } else if (section.headers) {
      y = addPdfDataTable(doc, section.headers, section.rows || [], y);
    }
  }

  const meta = payload?.exportMeta || {};
  const generatedAt = formatActivityExportDateTimeHe(meta.generatedAt) || "";
  if (generatedAt) {
    if (y > 280) {
      doc.addPage();
      applyPdfHebrewContext(doc);
      y = 16;
    }
    doc.setFontSize(8);
    writePdfTextHe(doc, `דוח נוצר ב: ${generatedAt}`, pageWidth - 14, y, { align: "right" });
  }

  return doc;
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

/**
 * @param {Record<string, unknown>} payload
 */
export async function downloadTeacherActivityReportPdf(payload) {
  if (!TEACHER_ACTIVITY_PDF_EXPORT_ENABLED) {
    throw new Error("teacher_pdf_export_disabled");
  }
  const doc = await buildTeacherActivityReportPdf(payload);
  const blob = doc.output("blob");
  const stem = buildEnrichedActivityReportDownloadStem(payload);
  triggerBrowserDownload(blob, `${stem}.pdf`);
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function collectTeacherActivityReportPdfVisibleText(payload) {
  return buildTeacherActivityReportPdfSections(payload).allText;
}

/**
 * @param {string} text
 */
export function teacherActivityReportPdfContainsRawExportKey(text) {
  const tokens = String(text || "").split(/\s+/);
  return tokens.some((t) => looksLikeRawExportKey(t));
}

/**
 * @param {string} text
 */
export function teacherActivityReportPdfContainsAiPhrase(text) {
  const hay = String(text || "");
  return TEACHER_PDF_AI_PHRASE_DENYLIST.some((p) => hay.includes(p));
}

/**
 * Detect visually broken Hebrew (character-reversed words from missing setR2L).
 * @param {string} text
 */
export function teacherActivityReportPdfContainsReversedHebrewMarkers(text) {
  const hay = String(text || "");
  return hay.includes("הרומ תוליעפ") || hay.includes("תוליעפ יטרפ") || hay.includes("התיכס");
}
