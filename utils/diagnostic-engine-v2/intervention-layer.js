import { TAXONOMY_BY_ID } from "./taxonomy-registry.js";

/**
 * @param {string|null} taxonomyId
 */
export function buildInterventionPlan(taxonomyId) {
  if (!taxonomyId || !TAXONOMY_BY_ID[taxonomyId]) {
    return {
      immediateActionHe: "איסוף ראיה נוספת לפני תוכנית",
      shortPracticeHe: "3–7 פריטים באותו נושא ברמת קושי נמוכה במעט",
      avoidHe: "קפיצה לרמה גבוהה; ערבוב נושאים",
      improvementSignalsHe: ["ירידה בטעויות חוזרות", "תיקון עצמאי אחרי טעות"],
      failureSignalsHe: ["אין שינוי אחרי שני מחזורים מובנים"],
      hypothesisChangeHe: "כישלון בבדיקה המוצעת או הצלחה רק כשיש הרבה רמזים",
    };
  }
  const row = TAXONOMY_BY_ID[taxonomyId];
  return {
    immediateActionHe: row.probeHe,
    shortPracticeHe: row.interventionHe,
    avoidHe: "קפיצה לרמה גבוהה; ערבוב נושאים; משוב כללי בלי דוגמה נגדית",
    improvementSignalsHe: ["התאמה לסמני ההצלחה מהטקסונומיה", "שחזור בהעברה למשימה דומה"],
    failureSignalsHe: [row.escalationHe],
    hypothesisChangeHe: "כאשר נכשל probe המומלץ או מופיעה נגד ראיה חזקה",
    taxonomyId: row.id,
  };
}
