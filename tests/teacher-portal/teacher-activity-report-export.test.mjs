import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as XLSX from "xlsx";
import {
  ACTIVITY_REPORT_EXPORT_HEADERS_HE,
  ACTIVITY_REPORT_SHEET_NAME_HE,
  buildActivityReportCsvContent,
  buildActivityReportDownloadStem,
  buildActivityReportStudentRows,
  buildActivityReportWorkbook,
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
  assert.equal(rows[0][4], 80);
  assert.equal(rows[1][0], "גל פלג");
  assert.equal(rows[1][1], "טרם התחיל");
});

test("activity report xlsx workbook uses Hebrew sheet, headers, and RTL view", () => {
  const wb = buildActivityReportWorkbook(SAMPLE);
  assert.equal(wb.SheetNames[0], ACTIVITY_REPORT_SHEET_NAME_HE);
  const ws = wb.Sheets[ACTIVITY_REPORT_SHEET_NAME_HE];
  assert.deepEqual(
    ACTIVITY_REPORT_EXPORT_HEADERS_HE.map((_, i) => ws[XLSX.utils.encode_cell({ r: 0, c: i })].v),
    ACTIVITY_REPORT_EXPORT_HEADERS_HE
  );
  assert.equal(ws["!views"]?.[0]?.rightToLeft, true);
  assert.equal(ws.B2?.v, "הוגש");
  assert.equal(ws.A3?.v, "גל פלג");
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
