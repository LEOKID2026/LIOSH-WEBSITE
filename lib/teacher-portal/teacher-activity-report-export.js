/**
 * Hebrew-friendly export helpers for teacher activity reports (browser-safe).
 */

import XLSX from "xlsx-js-style";
import { studentActivityStatusLabelHe } from "../platform-ui/hebrew-display-labels.js";

export const ACTIVITY_REPORT_SHEET_NAME_HE = "דוח פעילות";

export const ACTIVITY_REPORT_EXPORT_HEADERS_HE = [
  "תלמיד",
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
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
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
 * @param {import("xlsx-js-style").WorkSheet} sheet
 * @param {number} rowCount
 * @param {number} colCount
 */
export function applyActivityReportSheetFormatting(sheet, rowCount, colCount) {
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
