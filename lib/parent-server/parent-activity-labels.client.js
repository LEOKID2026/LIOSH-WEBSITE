/**
 * Hebrew labels for parent-assigned activity monitoring (parent portal).
 */

/** @param {string|null|undefined} status */
export function parentSentActivityStatusLabelHe(status) {
  const s = String(status || "not_started").trim();
  if (s === "in_progress") return "בתהליך";
  if (s === "submitted") return "הושלם";
  return "ממתין להתחלה";
}

export function parentSentActivitiesSectionTitleHe() {
  return "פעילויות שנשלחו";
}

export function parentViewActivityResultsLabelHe() {
  return "צפה בתוצאות";
}
