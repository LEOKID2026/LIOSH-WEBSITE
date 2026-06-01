import assert from "node:assert/strict";
import {
  computeReportRangeForParentApi,
  resolveParentReportGenerationArgs,
} from "../../lib/reporting/parent-report-date-range.js";

const parentDay = computeReportRangeForParentApi("day", false, "", "");
assert.equal(parentDay.from, parentDay.to);

const parentSchoolYear = computeReportRangeForParentApi("schoolYear", false, "", "");
assert.ok(parentSchoolYear.from.endsWith("-09-01"));
assert.ok(parentSchoolYear.from <= parentSchoolYear.to);

const parentDayArgs = resolveParentReportGenerationArgs("day", false, "", "");
assert.equal(parentDayArgs.period, "custom");
assert.equal(parentDayArgs.customStartDate, parentDayArgs.customEndDate);

const parentSchoolArgs = resolveParentReportGenerationArgs("schoolYear", false, "", "");
assert.equal(parentSchoolArgs.period, "custom");
assert.ok(parentSchoolArgs.customStartDate.endsWith("-09-01"));
assert.equal(parentSchoolArgs.customEndDate, parentSchoolYear.to);

console.log("report-date-range-parent-api: ok");
