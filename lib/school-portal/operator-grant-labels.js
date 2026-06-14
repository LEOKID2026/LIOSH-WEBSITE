/** Hebrew labels for school operator grants — visible UI only. */

/** @type {Record<string, string>} */
export const OPERATOR_GRANT_LABELS_HE = {
  studentAccessAdmin: "ניהול גישות ילדים והורים",
  studentDataViewer: "צפייה בדוחות ופרטי ילדים",
};

/** @param {"studentAccessAdmin"|"studentDataViewer"|string} key */
export function operatorGrantLabel(key) {
  if (key === "studentAccessAdmin") return OPERATOR_GRANT_LABELS_HE.studentAccessAdmin;
  if (key === "studentDataViewer") return OPERATOR_GRANT_LABELS_HE.studentDataViewer;
  return OPERATOR_GRANT_LABELS_HE[key] || "";
}
