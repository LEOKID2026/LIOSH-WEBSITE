/**
 * Textual assigned-activity subjects (not math / not geometry).
 * Product shows 6 subjects; code uses 5 canonical IDs because moledet + geography
 * share `moledet_geography`.
 */

/** @type {readonly string[]} */
export const TEXTUAL_ASSIGNED_ACTIVITY_SUBJECT_IDS = Object.freeze([
  "hebrew",
  "english",
  "science",
  "history",
  "moledet_geography",
]);

const TEXTUAL_SUBJECT_SET = new Set(TEXTUAL_ASSIGNED_ACTIVITY_SUBJECT_IDS);

/** Legacy / alternate keys that may appear on older frozen question sets. */
const SUBJECT_ALIASES = Object.freeze({
  moledet: "moledet_geography",
  geography: "moledet_geography",
  "moledet-geography": "moledet_geography",
  "moledet_geog": "moledet_geography",
});

/**
 * @param {unknown} subject
 * @returns {string}
 */
export function normalizeAssignedActivitySubjectKey(subject) {
  const key = String(subject || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!key) return "";
  return SUBJECT_ALIASES[key] || key;
}

/**
 * True only for the five textual play paths (+ aliases). Never true for math/geometry.
 * @param {unknown} subject
 */
export function isTextualAssignedActivitySubject(subject) {
  return TEXTUAL_SUBJECT_SET.has(normalizeAssignedActivitySubjectKey(subject));
}
