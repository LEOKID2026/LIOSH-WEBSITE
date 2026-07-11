/** Hebrew display labels for parent subject permissions panel. */

/** @type {Record<string, string>} */
export const SUBJECT_PERMISSION_LABELS_HE = Object.freeze({
  math: "מתמטיקה",
  geometry: "גאומטריה",
  hebrew: "עברית",
  english: "אנגלית",
  science: "מדעים",
  history: "היסטוריה",
  moledet: "מולדת",
  geography: "גאוגרפיה",
});

/**
 * @param {string} subjectKey
 */
export function getSubjectPermissionLabelHe(subjectKey) {
  return SUBJECT_PERMISSION_LABELS_HE[subjectKey] || subjectKey;
}
