import {
  computeDayPresetRange,
  computeSchoolYearToDateRangeLocal,
} from "./report-date-range.js";

/** Align `from`/`to` query params with parent-report preset windows. */
export function computeReportRangeForParentApi(period, customDates, appliedStartDate, appliedEndDate) {
  if (customDates && appliedStartDate && appliedEndDate && appliedStartDate <= appliedEndDate) {
    return { from: appliedStartDate, to: appliedEndDate };
  }
  if (period === "day") {
    return computeDayPresetRange();
  }
  if (period === "schoolYear") {
    return computeSchoolYearToDateRangeLocal();
  }
  const days = period === "month" ? 30 : 7;
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

/**
 * Map parent-report UI period to generateParentReportV2 args (no engine changes).
 * @returns {{ period: string, customStartDate: string|null, customEndDate: string|null }}
 */
export function resolveParentReportGenerationArgs(period, customDates, appliedStartDate, appliedEndDate) {
  if (customDates && appliedStartDate && appliedEndDate && appliedStartDate <= appliedEndDate) {
    return { period: "custom", customStartDate: appliedStartDate, customEndDate: appliedEndDate };
  }
  if (period === "day") {
    const range = computeDayPresetRange();
    return { period: "custom", customStartDate: range.from, customEndDate: range.to };
  }
  if (period === "schoolYear") {
    const range = computeSchoolYearToDateRangeLocal();
    return { period: "custom", customStartDate: range.from, customEndDate: range.to };
  }
  return { period: period === "month" ? "month" : "week", customStartDate: null, customEndDate: null };
}
