import { useCallback, useMemo, useState } from "react";
import {
  computeDefaultReportRange,
  computeReportRangeForDays,
  computeSchoolYearToDateRange,
  formatReportRangeDisplayHe,
  validateCustomReportRange,
  appendReportRangeToSearchParams,
} from "../lib/reporting/report-date-range.js";

/**
 * Report date-range state for school/teacher portals (default 30 days, from/to query params).
 */
export function useReportDateRange() {
  const [appliedRange, setAppliedRange] = useState(() => computeDefaultReportRange());
  const [customDates, setCustomDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  /** @type {7 | 30 | 'schoolYear' | null} */
  const [presetDays, setPresetDays] = useState(30);

  const rangeLabel = useMemo(
    () => formatReportRangeDisplayHe(appliedRange.from, appliedRange.to),
    [appliedRange.from, appliedRange.to]
  );

  const applyPreset = useCallback((days) => {
    setCustomDates(false);
    setPresetDays(days === 7 ? 7 : 30);
    const next = computeReportRangeForDays(days);
    setAppliedRange(next);
    return next;
  }, []);

  const applySchoolYearPreset = useCallback(() => {
    setCustomDates(false);
    setPresetDays("schoolYear");
    const next = computeSchoolYearToDateRange();
    setAppliedRange(next);
    return next;
  }, []);

  const applyCustom = useCallback(() => {
    const validated = validateCustomReportRange(startDate, endDate);
    if (!validated.ok) return validated;
    setCustomDates(true);
    setPresetDays(null);
    setAppliedRange({ from: validated.from, to: validated.to });
    return validated;
  }, [startDate, endDate]);

  const buildSearchParams = useCallback(
    (init) => {
      const base = init instanceof URLSearchParams ? new URLSearchParams(init) : new URLSearchParams(init || {});
      return appendReportRangeToSearchParams(base, appliedRange);
    },
    [appliedRange]
  );

  return {
    appliedRange,
    rangeLabel,
    customDates,
    setCustomDates,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    presetDays,
    applyPreset,
    applySchoolYearPreset,
    applyCustom,
    buildSearchParams,
  };
}
