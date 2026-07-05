/**
 * Grade-filtered topic maps for regular parent report — filter only, no time synthesis.
 */

import {
  NORMALIZED_SUBJECT_IDS,
  REPORT_TOPIC_MAP_KEYS,
} from "../learning/normalized-subject-practice.js";
import { isCoreParentReportRow } from "../../utils/parent-report-core-grade-filter.js";

/** @param {unknown} value */
function safeFloor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * @param {Record<string, Record<string, unknown>>|null|undefined} map
 * @param {string|null|undefined} registeredGradeKey
 */
function filterTopicMapForRegularReport(map, registeredGradeKey) {
  if (!map || typeof map !== "object") return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, row] of Object.entries(map)) {
    if (!row || typeof row !== "object") continue;
    if (registeredGradeKey && !isCoreParentReportRow(row, registeredGradeKey)) continue;
    out[key] = row;
  }
  return out;
}

/**
 * Read minutes already computed by the server sync pipeline.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function resolveTopicRowTimeMinutes(row) {
  if (!row || typeof row !== "object") return 0;
  return safeFloor(row.timeMinutes);
}

/**
 * Build grade-filtered topic maps (topic + grade + date range). Time comes from sync, not UI.
 * @param {Record<string, unknown>} report
 * @param {string|null|undefined} registeredGradeKey
 */
export function buildGradeFilteredTopicMapsForRegularReport(report, registeredGradeKey) {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const mapKey = REPORT_TOPIC_MAP_KEYS[subjectId];
    out[mapKey] = filterTopicMapForRegularReport(report?.[mapKey], registeredGradeKey);
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function formatRegularReportTopicTimeCellHe(row) {
  const q = safeFloor(row?.questions);
  const tm = safeFloor(row?.timeMinutes);
  if (q <= 0) return "0 דק'";
  return `${tm} דק'`;
}

/**
 * @param {Record<string, { timeMinutes?: number, questions?: number }>|null|undefined} map
 */
export function sumTopicMapMinutes(map) {
  let total = 0;
  for (const row of Object.values(map || {})) {
    if (!row || typeof row !== "object") continue;
    total += safeFloor(row.timeMinutes);
  }
  return total;
}
