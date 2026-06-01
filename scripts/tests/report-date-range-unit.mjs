import assert from "node:assert/strict";
import {
  appendReportRangeToSearchParams,
  computeDayPresetRange,
  computeDefaultReportRange,
  computeReportRangeForDays,
  computeSchoolYearToDateRange,
  computeSchoolYearToDateRangeLocal,
  formatReportRangeDisplayHe,
  MAX_REPORT_RANGE_DAYS,
  validateCustomReportRange,
} from "../../lib/reporting/report-date-range.js";

const defaultRange = computeDefaultReportRange();
assert.equal(defaultRange.from.length, 10);
assert.equal(defaultRange.to.length, 10);
assert.ok(defaultRange.from <= defaultRange.to);

const thirty = computeReportRangeForDays(30);
const seven = computeReportRangeForDays(7);
assert.ok(seven.from > thirty.from || seven.from === thirty.from);

// School year to date (1/9 → selected report date)
assert.deepEqual(computeSchoolYearToDateRange("2026-05-31"), {
  from: "2025-09-01",
  to: "2026-05-31",
});
assert.deepEqual(computeSchoolYearToDateRange("2025-10-20"), {
  from: "2025-09-01",
  to: "2025-10-20",
});
assert.deepEqual(computeSchoolYearToDateRange("2026-07-15"), {
  from: "2025-09-01",
  to: "2026-07-15",
});
assert.deepEqual(computeSchoolYearToDateRange("2026-09-10"), {
  from: "2026-09-01",
  to: "2026-09-10",
});
assert.deepEqual(computeSchoolYearToDateRange("2026-09-01"), {
  from: "2026-09-01",
  to: "2026-09-01",
});
assert.deepEqual(computeSchoolYearToDateRange("2026-08-31"), {
  from: "2025-09-01",
  to: "2026-08-31",
});

assert.deepEqual(computeDayPresetRange(new Date(2026, 5, 1)), {
  from: "2026-06-01",
  to: "2026-06-01",
});

assert.deepEqual(computeSchoolYearToDateRangeLocal(new Date(2026, 5, 1)), {
  from: "2025-09-01",
  to: "2026-06-01",
});
assert.deepEqual(computeSchoolYearToDateRangeLocal(new Date(2026, 8, 10)), {
  from: "2026-09-01",
  to: "2026-09-10",
});
assert.deepEqual(computeSchoolYearToDateRangeLocal(new Date(2026, 0, 15)), {
  from: "2025-09-01",
  to: "2026-01-15",
});

const schoolYearParams = appendReportRangeToSearchParams(new URLSearchParams(), {
  from: "2025-09-01",
  to: "2026-05-31",
});
assert.equal(schoolYearParams.get("from"), "2025-09-01");
assert.equal(schoolYearParams.get("to"), "2026-05-31");
assert.equal(schoolYearParams.get("windowDays"), null);

const params = appendReportRangeToSearchParams(new URLSearchParams({ windowDays: "30" }), {
  from: "2026-05-01",
  to: "2026-05-31",
});
assert.equal(params.get("from"), "2026-05-01");
assert.equal(params.get("to"), "2026-05-31");
assert.equal(params.get("windowDays"), null);

assert.equal(validateCustomReportRange("2026-05-10", "2026-05-01").ok, false);
assert.equal(validateCustomReportRange("2026-05-01", "2099-01-01").ok, false);

const tooLongFrom = "2020-01-01";
const tooLongTo = "2026-05-01";
const tooLong = validateCustomReportRange(tooLongFrom, tooLongTo);
assert.equal(tooLong.ok, false);
assert.equal(tooLong.code, "too_long");

const ok = validateCustomReportRange("2026-05-01", "2026-05-15");
assert.equal(ok.ok, true);
assert.equal(ok.from, "2026-05-01");
assert.equal(ok.to, "2026-05-15");

const display = formatReportRangeDisplayHe("2026-05-01", "2026-05-15");
assert.ok(display.includes("01/05/2026"));
assert.ok(display.includes("15/05/2026"));

assert.equal(MAX_REPORT_RANGE_DAYS, 366);

console.log("report-date-range-unit: ok");
