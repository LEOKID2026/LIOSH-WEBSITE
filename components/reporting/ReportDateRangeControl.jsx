import { isoDateLocal, MAX_REPORT_RANGE_DAYS } from "../../lib/reporting/report-date-range.js";

/**
 * Date-range picker for school/teacher report modals and pages (mirrors parent-report presets).
 */
export default function ReportDateRangeControl({
  presetDays = 30,
  customDates = false,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  onPreset,
  onDayPreset,
  onSchoolYearPreset,
  onApplyCustom,
  onEnableCustom,
  rangeLabel = "",
  disabled = false,
  showDayPreset = false,
  showSchoolYearPreset = false,
  customRangeLabel = "תאריכים מותאמים",
  compactPresets = false,
  presetRowClassName = "",
  className = "",
}) {
  const today = isoDateLocal();

  const handleApplyCustom = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onApplyCustom?.();
  };

  const btnSize = compactPresets
    ? "px-1.5 py-1 text-[10px] sm:text-xs leading-tight"
    : "px-3 py-1.5 text-xs";
  const activeClass = "bg-blue-500/80 text-white";
  const idleClass = "bg-white/10 text-white/70 hover:bg-white/20";

  return (
    <div
      className={`rounded-lg border border-white/10 bg-black/20 p-3 mb-3 ${className}`.trim()}
      data-testid="report-date-range-control"
    >
      <div
        className={`flex flex-nowrap gap-1 sm:gap-2 justify-center mb-2 min-w-0 max-w-full overflow-x-hidden ${presetRowClassName}`.trim()}
        data-testid="report-date-range-preset-row"
      >
        {showDayPreset ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDayPreset?.()}
            className={`${btnSize} rounded-lg font-bold transition-all disabled:opacity-50 shrink-0 ${
              !customDates && presetDays === "day" ? activeClass : idleClass
            }`}
            data-testid="report-range-preset-day"
          >
            יום
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPreset?.(7)}
          className={`${btnSize} rounded-lg font-bold transition-all disabled:opacity-50 shrink-0 ${
            !customDates && presetDays === 7 ? activeClass : idleClass
          }`}
          data-testid="report-range-preset-week"
        >
          שבוע
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPreset?.(30)}
          className={`${btnSize} rounded-lg font-bold transition-all disabled:opacity-50 shrink-0 ${
            !customDates && presetDays === 30 ? activeClass : idleClass
          }`}
          data-testid="report-range-preset-month"
        >
          חודש
        </button>
        {showSchoolYearPreset ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSchoolYearPreset?.()}
            className={`${btnSize} rounded-lg font-bold transition-all disabled:opacity-50 shrink-0 ${
              !customDates && presetDays === "schoolYear" ? activeClass : idleClass
            }`}
            data-testid="report-range-preset-school-year"
          >
            שנה
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEnableCustom?.()}
          className={`${btnSize} rounded-lg font-bold transition-all disabled:opacity-50 shrink-0 ${
            customDates ? activeClass : idleClass
          }`}
          data-testid="report-range-preset-custom"
        >
          {customRangeLabel}
        </button>
      </div>

      {customDates ? (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <label className="text-xs text-white/70 whitespace-nowrap">מתאריך:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange?.(e.target.value)}
              max={endDate || today}
              dir="ltr"
              disabled={disabled}
              className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              data-testid="report-range-start"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <label className="text-xs text-white/70 whitespace-nowrap">עד תאריך:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange?.(e.target.value)}
              min={startDate}
              max={today}
              dir="ltr"
              disabled={disabled}
              className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              data-testid="report-range-end"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={disabled || !startDate || !endDate || startDate > endDate}
            className="px-4 py-1.5 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            data-testid="report-range-apply"
          >
            הצג
          </button>
        </div>
      ) : null}

      {rangeLabel ? (
        <p className="text-xs text-white/50 text-center mt-2" data-testid="report-range-label">
          {rangeLabel}
          <span className="sr-only">{` (max ${MAX_REPORT_RANGE_DAYS} days)`}</span>
        </p>
      ) : null}
    </div>
  );
}
