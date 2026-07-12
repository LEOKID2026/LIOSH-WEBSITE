/**
 * Elementary Hebrew wording for geometry classroom-activity question stems (grades 1–6).
 * Applied when freezing new items and when serving stored question sets to students.
 */

import { stripGeometryFormulaHelpParenthetical } from "./student-question-display.js";

/** Patterns that must not appear in student-facing elementary geometry activity stems. */
export const GEOMETRY_ELEMENTARY_FORBIDDEN_STEM_RE =
  /אלגברה|משווא(?:ה|ת)|ביטוי\s+אלגברי|(?:^|[\s—–-])נעלם(?:[\s,.!?]|$)/u;

/**
 * Canonical elementary stem when two triangle angles are known.
 * @param {number|string} angle1
 * @param {number|string} angle2
 */
export function formatTriangleAnglesKnownTwoStem(angle1, angle2) {
  return `חישוב זוויות במשולש: ידועות 2 זוויות במשולש ${angle1}° ו-${angle2}°. השלימו את הזווית השלישית.`;
}

/**
 * @param {string} text
 * @param {{ kind?: string|null, topic?: string|null }} [context]
 * @returns {string}
 */
export function sanitizeGeometryActivityQuestionStem(text, context = {}) {
  let t = String(text ?? "").trim();
  if (!t) return t;

  const isTriangleAngles =
    context?.kind === "triangle_angles" ||
    (context?.topic === "angles" && /זווית|משולש|180°/.test(t));

  t = t.replace(/אלגברה\s+של\s+זוויות\s*[—–-]\s*/gu, "חישוב זוויות במשולש — ");
  t = t.replace(/אלגברה\s+של\s+זוויות/gu, "חישוב זוויות במשולש");

  t = t.replace(
    /משוואת\s+זוויות:\s*(\d+)°\s*\+\s*(\d+)°\s*\+\s*\?\s*=\s*180°\s*—\s*מה\s+החסר\?/gu,
    (_, a1, a2) => formatTriangleAnglesKnownTwoStem(a1, a2)
  );
  t = t.replace(/משוואת\s+זוויות/gu, "חישוב זוויות במשולש");

  if (isTriangleAngles) {
    t = t.replace(
      /^חישוב זוויות במשולש\s*[—–-]\s*סכום שתי זוויות ידועות הוא (\d+)°\+(\d+)°\s*[—–-]\s*השלימו (?:ל)?זווית השלישית(?: במשולש)?\.?/giu,
      (_, a1, a2) => formatTriangleAnglesKnownTwoStem(a1, a2)
    );
    t = t.replace(
      /^חישוב זוויות במשולש:\s*ידועות\s+(\d+)°\s*ו-(\d+)°\.\s*השלימו את הזווית השלישית\.?$/giu,
      (_, a1, a2) => formatTriangleAnglesKnownTwoStem(a1, a2)
    );
    t = t.replace(
      /^חישוב זוויות במשולש:\s*ידועות\s+(\d+)°\s*ו-(\d+)°\.\s*מה הזווית השלישית\?$/giu,
      (_, a1, a2) => formatTriangleAnglesKnownTwoStem(a1, a2)
    );
    t = t.replace(
      /^ניתוח\s+ל(?:לא\s+)?(?:ניסוח\s+)?(?:הכלל\s+)?(?:במפורש\s*)?[—–-]\s*/giu,
      "מציאת זווית חסרה במשולש — "
    );
    t = t.replace(/^אתגר\s+(?:קצר|זוויות\s+משולש)\s*[—–-]\s*/giu, "חישוב זוויות במשולש — ");
    t = t.replace(/^אתגר\s+זוויות\s+משולש\s*[—–-]\s*/giu, "חישוב זוויות במשולש — ");
  }

  t = stripGeometryFormulaHelpParenthetical(t);
  return t.replace(/\s{2,}/g, " ").trim();
}

/**
 * @param {string} stem
 * @returns {boolean}
 */
export function geometryElementaryStemHasForbiddenTerms(stem) {
  return GEOMETRY_ELEMENTARY_FORBIDDEN_STEM_RE.test(String(stem ?? ""));
}
