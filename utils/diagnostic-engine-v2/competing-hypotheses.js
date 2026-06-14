/**
 * מודל השערות מתחרות — stage1 §8 + אותות behaviorProfile.
 * @param {import("./taxonomy-types.js").TaxonomyRow} taxonomyRow
 * @param {string|null|undefined} behaviorDominant
 */
export function buildCompetingHypotheses(taxonomyRow, behaviorDominant) {
  /** @type {Array<{ hypothesisId: string, labelHe: string, role: "primary"|"competitor"|"behavior" }>} */
  const out = [];
  const root = taxonomyRow.rootsHe && taxonomyRow.rootsHe[0];
  if (root) out.push({ hypothesisId: "root_primary", labelHe: root, role: "primary" });
  for (const c of taxonomyRow.competitorsHe || []) {
    out.push({ hypothesisId: `competitor:${c}`, labelHe: c, role: "competitor" });
  }
  const b = behaviorDominant ? String(behaviorDominant) : "";
  if (b === "speed_pressure") {
    out.push({
      hypothesisId: "speed_vs_knowledge",
      labelHe: "לחץ מהירות מול פער ידע",
      role: "behavior",
    });
  } else if (b === "careless_pattern") {
    out.push({
      hypothesisId: "careless_vs_misunderstanding",
      labelHe: "רשלנות מול אי הבנה",
      role: "behavior",
    });
  } else if (b === "instruction_friction") {
    out.push({
      hypothesisId: "hint_dependence_vs_gap",
      labelHe: "חיכוך הוראה/רמז מול פער מושגי",
      role: "behavior",
    });
  }
  return {
    hypotheses: out,
    distinguishingEvidenceHe: [
      "השוואת ביצועים timed מול untimed",
      "השוואת רמז דל מול רמז עשיר",
      "בדיקת חזרתיות לפי משפחת דפוס",
    ],
  };
}
