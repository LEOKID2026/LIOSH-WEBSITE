/**
 * Neutralize spreadsheet formula-injection prefixes in exported cell values.
 * Applied before CSV escaping or XLSX cell assignment.
 */

const SPREADSHEET_RISK_PREFIX = /^[=+\-@\t\r]/;

/**
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeSpreadsheetCellValue(value) {
  const s = value == null ? "" : String(value);
  if (!s) return s;
  if (SPREADSHEET_RISK_PREFIX.test(s)) {
    return `'${s}`;
  }
  return s;
}
