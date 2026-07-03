/**
 * Core parent report rows — only registered-grade (same) practice feeds regular conclusions.
 * Out-of-grade practice stays in raw tables / transparency slices only.
 */

import { buildGradeEvidenceFields } from "../lib/learning-supabase/practice-grade-resolution.js";

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
