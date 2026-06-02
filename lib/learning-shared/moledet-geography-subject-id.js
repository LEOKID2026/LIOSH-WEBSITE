/**
 * Moledet/Geography canonical subject ids and backward-compatible aliases.
 *
 * Runtime/DB/activities: moledet_geography (underscore)
 * Reports/diagnostics/copilot: moledet-geography (hyphen)
 * Oracle ministry-matrix G2–4: moledet | G5–6: geography
 */

/** @type {"moledet_geography"} */
export const MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID = "moledet_geography";

/** @type {"moledet-geography"} */
export const MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID = "moledet-geography";

export const MOLEDET_GEOGRAPHY_ORACLE_MOLEDET_SUBJECT = "moledet";
export const MOLEDET_GEOGRAPHY_ORACLE_GEOGRAPHY_SUBJECT = "geography";

const ACTIVITY_ALIASES = new Set([
  MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID,
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
  "moledet",
]);

/**
 * @param {string|null|undefined} subjectId
 * @returns {typeof MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID|null}
 */
export function normalizeMoledetGeographyActivitySubjectId(subjectId) {
  const s = String(subjectId || "").trim().toLowerCase();
  if (!s) return null;
  if (ACTIVITY_ALIASES.has(s)) return MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID;
  return null;
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {typeof MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID|null}
 */
export function normalizeMoledetGeographyReportSubjectId(subjectId) {
  if (normalizeMoledetGeographyActivitySubjectId(subjectId)) {
    return MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID;
  }
  return null;
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {boolean}
 */
export function isMoledetGeographySubjectAlias(subjectId) {
  return normalizeMoledetGeographyActivitySubjectId(subjectId) != null;
}

/**
 * Oracle-aligned spine subject for moledet-geography curriculum skills.
 * @param {number|string|null|undefined} grade 2–6
 * @returns {"moledet"|"geography"|null}
 */
export function resolveMoledetGeographySpineSubjectForGrade(grade) {
  const g = Number(String(grade ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(g)) return null;
  if (g >= 2 && g <= 4) return MOLEDET_GEOGRAPHY_ORACLE_MOLEDET_SUBJECT;
  if (g >= 5 && g <= 6) return MOLEDET_GEOGRAPHY_ORACLE_GEOGRAPHY_SUBJECT;
  return null;
}

/** Report topic-map key prefix, e.g. moledet-geography_homeland */
export function moledetGeographyReportTopicKeyPrefix() {
  return `${MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID}_`;
}

/**
 * Verifier helper: hyphen ↔ underscore aliases resolve to activity canonical id.
 * @returns {boolean}
 */
export function assertMoledetGeographySubjectAliasesConfigured() {
  return (
    normalizeMoledetGeographyActivitySubjectId(MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID) ===
      MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID &&
    normalizeMoledetGeographyReportSubjectId(MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID) ===
      MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID
  );
}
