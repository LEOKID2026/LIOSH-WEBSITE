import { MAX_REPORT_RANGE_DAYS } from "../../lib/reporting/report-date-range.js";

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
  onApplyCustom,
  onEnableCustom,
  rangeLabel = "",
  disabled = false,
  className = "",
}) {
  const today = new Date().toISOString().split("T")[0];

  const handleApplyCustom = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onApplyCustom?.();
  };

  return (
    <div
      className={`rounded-lg border border-white/10 bg-black/20 p-3 mb-3 ${className}`.trim()}
      data-testid="report-date-range-control"
    >
      <div className="flex flex-wrap gap-2 justify-center mb-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPreset?.(7)}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 ${
            !customDates && presetDays === 7
              ? "bg-blue-500/80 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }`}
          data-testid="report-range-preset-week"
        >
          שבוע
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPreset?.(30)}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 ${
            !customDates && presetDays === 30
              ? "bg-blue-500/80 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }`}
          data-testid="report-range-preset-month"
        >
          חודש
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEnableCustom?.()}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 ${
            customDates
              ? "bg-blue-500/80 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }`}
          data-testid="report-range-preset-custom"
        >
          תאריכים מותאמים
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
