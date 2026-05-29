import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import XLSX from "xlsx-js-style";
import {
  ACTIVITY_REPORT_EXPORT_HEADERS_HE,
  ACTIVITY_REPORT_SHEET_NAME_HE,
  ACTIVITY_REPORT_XLSX_COL_WIDTHS,
  applyActivityReportSheetFormatting,
  buildActivityReportCsvContent,
  buildActivityReportDownloadStem,
  buildActivityReportStudentRows,
  buildActivityReportWorkbook,
  buildActivityReportXlsxArrayBuffer,
} from "../../lib/teacher-portal/teacher-activity-report-export.js";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const reportPageSrc = readFileSync(
  join(repoRoot, "../../pages/teacher/class/[classId]/activities/[activityId]/report.js"),
  "utf8"
);

const SAMPLE = {
  activity: { title: "זויות תרגול", questionCount: 5, activityId: "abc" },
  students: [
    {
      studentFullNameMasked: "איתי ביטון",
      status: "submitted",
      answersCount: 5,
      correctCount: 4,
      scorePct: 80,
    },
    {
      studentFullNameMasked: "גל פלג",
      status: "not_started",
      answersCount: 0,
      correctCount: 0,
      scorePct: 0,
    },
  ],
};

test("activity report CSV uses UTF-8 BOM and Hebrew headers", () => {
  const csv = buildActivityReportCsvContent(SAMPLE);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("תלמיד,סטטוס,תשובות,נכונות,ציון"));
  assert.ok(!csv.includes("student,status"));
});

test("activity report CSV uses Hebrew status labels", () => {
  const csv = buildActivityReportCsvContent(SAMPLE);
  assert.ok(csv.includes("הוגש"));
  assert.ok(csv.includes("טרם התחיל"));
  assert.ok(!csv.includes("not_started"));
  assert.ok(!csv.includes("submitted"));
});

test("activity report student rows sort by score descending", () => {
  const rows = buildActivityReportStudentRows(SAMPLE);
  assert.equal(rows[0][0], "איתי ביטון");
  assert.equal(rows[0][1], "הוגש");
  assert.equal(rows[0][3], "4/5");
  assert.equal(rows[0][4], 80);
  assert.equal(rows[1][0], "גל פלג");
  assert.equal(rows[1][1], "טרם התחיל");
});

test("activity report xlsx workbook uses Hebrew sheet, headers, RTL, and column widths", () => {
  const wb = buildActivityReportWorkbook(SAMPLE);
  assert.equal(wb.SheetNames[0], ACTIVITY_REPORT_SHEET_NAME_HE);
  assert.equal(wb.Workbook?.Views?.[0]?.RTL, true);

  const ws = wb.Sheets[ACTIVITY_REPORT_SHEET_NAME_HE];
  assert.deepEqual(
    ACTIVITY_REPORT_EXPORT_HEADERS_HE.map((_, i) => ws[XLSX.utils.encode_cell({ r: 0, c: i })].v),
    ACTIVITY_REPORT_EXPORT_HEADERS_HE
  );
  assert.deepEqual(
    ws["!cols"]?.map((col) => col.wch),
    ACTIVITY_REPORT_XLSX_COL_WIDTHS
  );
  assert.equal(ws.B2?.v, "הוגש");
  assert.equal(ws.A3?.v, "גל פלג");
  assert.equal(ws.D2?.v, "4/5");
  assert.equal(ws.E2?.v, 80);
});

test("activity report xlsx applies right-aligned bold header styling", () => {
  const wb = buildActivityReportWorkbook(SAMPLE);
  const ws = wb.Sheets[ACTIVITY_REPORT_SHEET_NAME_HE];
  assert.equal(ws.A1?.s?.font?.bold, true);
  assert.equal(ws.A1?.s?.alignment?.horizontal, "right");
  assert.equal(ws.A1?.s?.alignment?.readingOrder, 2);
  assert.equal(ws.B2?.s?.font?.bold, undefined);
  assert.equal(ws.B2?.s?.alignment?.horizontal, "right");
});

test("activity report xlsx buffer keeps RTL view and column widths after write", () => {
  const buffer = buildActivityReportXlsxArrayBuffer(SAMPLE);
  const wb = XLSX.read(buffer, { type: "array", cellStyles: true });
  assert.equal(wb.Workbook?.Views?.[0]?.RTL, true);
  const ws = wb.Sheets[ACTIVITY_REPORT_SHEET_NAME_HE];
  assert.deepEqual(
    ws["!cols"]?.map((col) => col.wch),
    ACTIVITY_REPORT_XLSX_COL_WIDTHS
  );
  assert.equal(ws.A2?.v, "איתי ביטון");
  assert.equal(ws.E2?.v, 80);
});

test("applyActivityReportSheetFormatting sets explicit widths for key columns", () => {
  const sheet = XLSX.utils.aoa_to_sheet([ACTIVITY_REPORT_EXPORT_HEADERS_HE, ["א", "הוגש", 5, "4/5", 80]]);
  applyActivityReportSheetFormatting(sheet, 2, ACTIVITY_REPORT_EXPORT_HEADERS_HE.length);
  assert.deepEqual(
    sheet["!cols"]?.map((col) => col.wch),
    [22, 16, 14, 14, 12]
  );
});

test("activity report download stem is Hebrew and title-based", () => {
  const stem = buildActivityReportDownloadStem(SAMPLE);
  assert.match(stem, /^דוח-פעילות-/);
  assert.ok(stem.includes("זויות"));
});

test("report page uses shared Hebrew export helpers", () => {
  assert.ok(reportPageSrc.includes("downloadActivityReportXlsx"));
  assert.ok(reportPageSrc.includes("downloadActivityReportCsv"));
  assert.ok(!reportPageSrc.includes("function exportReportCsv"));
});

test("teacher report page still shows percentage analytics", () => {
  assert.ok(reportPageSrc.includes("scorePct"));
  assert.ok(reportPageSrc.includes("%"));
});
