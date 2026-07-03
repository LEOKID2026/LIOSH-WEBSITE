/**
 * Core parent report rows — only registered-grade (same) practice feeds regular conclusions.
 * Out-of-grade practice stays in raw tables / transparency slices only.
 */

import { buildGradeEvidenceFields } from "../lib/learning-supabase/practice-grade-resolution.js";
import { normalizeGradeLevelToKey } from "../lib/learning-student-defaults.js";

/**
 * @param {Record<string, Record<string, unknown>>|null|undefined} maps
 */
export function registeredGradeKeyFromReportMaps(maps) {
  for (const map of Object.values(maps && typeof maps === "object" ? maps : {})) {
    if (!map || typeof map !== "object") continue;
    for (const row of Object.values(map)) {
      const g = row?.registeredGradeKey ?? row?.registeredGradeLevel;
      if (g != null && String(g).trim()) return String(g).trim();
    }
  }
  return null;
}

/**
 * Resolve registered grade from aggregate / optional V2 snapshot fields.
 * @param {unknown} aggregate
 * @param {unknown} [v2Report]
 */
export function resolveRegisteredGradeKeyFromAggregate(aggregate, v2Report) {
  const candidates = [
    v2Report?.registeredGradeKey,
    aggregate?.summary?.registeredGradeLevel,
    aggregate?.student?.registeredGradeLevel,
    aggregate?.student?.gradeLevelKey,
    aggregate?.summary?.normalizedGradeLevel,
    aggregate?.student?.grade_level,
  ];
  for (const c of candidates) {
    const key = normalizeGradeLevelToKey(c);
    if (key) return key;
  }
  return null;
}

/**
 * @param {unknown} row
 */
export function resolveParentReportRowGradeRelation(row, registeredGradeKey) {
  const direct = String(row?.gradeRelation || row?.rowIdentityV1?.gradeRelation || "").trim();
  if (direct && direct !== "unknown") return direct;

  const contentGradeKey =
    row?.contentGradeKey ??
    row?.contentGradeLevel ??
    row?.gradeKey ??
    row?.actualGradeKey ??
    null;
  const ge = buildGradeEvidenceFields(registeredGradeKey, contentGradeKey);
  return ge.gradeRelation || "unknown";
}

/**
 * @param {unknown} row
 */
export function parentReportRowHasPracticeEvidence(row) {
  const q = Number(row?.questions ?? row?.questionCount ?? row?.answers) || 0;
  const tm = Number(row?.timeMinutes) || 0;
  const dur = Number(row?.durationSeconds) || 0;
  return q > 0 || tm > 0 || dur > 0;
}

/**
 * True when row may feed regular parent-report conclusions (strengths, focus, recommendations).
 * @param {unknown} row
 * @param {string|null|undefined} registeredGradeKey
 */
export function isCoreParentReportRow(row, registeredGradeKey) {
  if (!row || typeof row !== "object") return false;
  if (!parentReportRowHasPracticeEvidence(row)) return false;

  const reg =
    registeredGradeKey != null && String(registeredGradeKey).trim() !== ""
      ? String(registeredGradeKey).trim()
      : null;
  const gradeRelation = resolveParentReportRowGradeRelation(row, reg);

  if (gradeRelation === "same") return true;
  if (gradeRelation === "higher" || gradeRelation === "lower") return false;

  if (reg) {
    const contentGradeKey =
      row?.contentGradeKey ??
      row?.contentGradeLevel ??
      row?.gradeKey ??
      row?.actualGradeKey ??
      null;
    if (contentGradeKey == null || String(contentGradeKey).trim() === "") return false;
    return false;
  }

  return true;
}

/**
 * @param {unknown} unit
 * @param {unknown|null|undefined} mapRow
 * @param {string|null|undefined} registeredGradeKey
 */
export function isCoreV2UnitForReport(unit, mapRow, registeredGradeKey) {
  const trk = String(unit?.topicRowKey || "");
  const mapR = mapRow && typeof mapRow === "object" ? mapRow : {};
  const gk =
    mapR.gradeKey != null && String(mapR.gradeKey).trim()
      ? String(mapR.gradeKey).trim()
      : (() => {
          if (!trk.includes("::grade:")) return null;
          return trk.split("::grade:")[1] || null;
        })();

  const synthetic = {
    gradeRelation: mapR.gradeRelation,
    contentGradeKey: gk ?? mapR.contentGradeKey,
    registeredGradeKey: mapR.registeredGradeKey ?? registeredGradeKey,
    questions: Number(unit?.evidenceTrace?.[0]?.value?.questions) || Number(mapR.questions) || 0,
    timeMinutes: Number(mapR.timeMinutes) || 0,
    rowIdentityV1: mapR.rowIdentityV1,
  };
  return isCoreParentReportRow(synthetic, registeredGradeKey);
}

/**
 * @param {unknown[]} units
 * @param {Record<string, unknown>|null|undefined} topicMap
 * @param {string|null|undefined} registeredGradeKey
 */
export function filterCoreV2Units(units, topicMap, registeredGradeKey) {
  const map = topicMap && typeof topicMap === "object" ? topicMap : {};
  return (Array.isArray(units) ? units : []).filter((u) => {
    const trk = String(u?.topicRowKey || "");
    const mapR = trk && map[trk] ? map[trk] : null;
    return isCoreV2UnitForReport(u, mapR, registeredGradeKey);
  });
}

/**
 * @param {unknown[]} rows
 * @param {string|null|undefined} registeredGradeKey
 */
export function filterCoreParentReportRows(rows, registeredGradeKey) {
  return (Array.isArray(rows) ? rows : []).filter((row) => isCoreParentReportRow(row, registeredGradeKey));
}

const REPORT_TOPIC_MAP_KEYS = [
  "mathOperations",
  "geometryTopics",
  "englishTopics",
  "scienceTopics",
  "historyTopics",
  "hebrewTopics",
  "moledetGeographyTopics",
];

/**
 * Resolve registered grade from a V2/base report object.
 * @param {unknown} report
 */
export function resolveRegisteredGradeKeyFromReport(report) {
  if (!report || typeof report !== "object") return null;
  const r = /** @type {Record<string, unknown>} */ (report);
  const direct = normalizeGradeLevelToKey(r.registeredGradeKey);
  if (direct) return direct;

  const fromAggregate = resolveRegisteredGradeKeyFromAggregate(r, r);
  if (fromAggregate) return fromAggregate;

  const maps = {};
  for (const mk of REPORT_TOPIC_MAP_KEYS) {
    if (r[mk] && typeof r[mk] === "object") maps[mk] = r[mk];
  }
  const fromMaps = registeredGradeKeyFromReportMaps(maps);
  if (fromMaps) return normalizeGradeLevelToKey(fromMaps);

  const summary = r.summary && typeof r.summary === "object" ? r.summary : null;
  return normalizeGradeLevelToKey(summary?.registeredGradeLevel ?? summary?.gradeLevel ?? summary?.normalizedGradeLevel);
}
