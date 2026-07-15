/**
 * Elementary Hebrew wording for geometry classroom-activity question stems (grades 1–6).
 * Applied when freezing new items and when serving stored question sets to students.
 */

import { stripGeometryFormulaHelpParenthetical } from "./student-question-display.js";

/** Patterns that must not appear in student-facing elementary geometry activity stems. */
export const GEOMETRY_ELEMENTARY_FORBIDDEN_STEM_RE =
  /אלגברה|משווא(?:ה|ת)|ביטוי\s+אלגברי|(?:^|[\s\-–])נעלם(?:[\s,.!?]|$)/u;

/** Banned fallback phrase — never emit on worksheets. */
export const GEOMETRY_GENERIC_ANSWER_FILLER_RE = /חשבו את התשובה/u;

const HAS_ASK_CUE_RE =
  /(חשב(?:ו|י)?|מצא(?:ו|י)?|כתב(?:ו|י)?|השל(?:ימו|ם)|קבע(?:ו|י)?|סמנ(?:ו|י)?|מה\s|כמה\s)/u;

/**
 * Canonical elementary stem when two triangle angles are known.
 * @param {number|string} angle1
 * @param {number|string} angle2
 */
export function formatTriangleAnglesKnownTwoStem(angle1, angle2) {
  return `במשולש שתי זוויות שגודלן ${angle1}° ו-${angle2}°. חשבו את גודל הזווית השלישית.`;
}

/**
 * @param {Record<string, unknown>} [params]
 * @param {string} kind
 * @returns {string|null}
 */
export function buildGeometryComputeStemFromParams(kind, params = {}) {
  const p = params && typeof params === "object" ? params : {};
  const k = String(kind || "").replace(/^story_/, "");

  if (k === "diagonal_square" && typeof p.side === "number") {
    return `אורך צלע הריבוע הוא ${p.side} ס״מ. חשבו את אורך האלכסון.`;
  }
  if (
    (k === "diagonal_rectangle" || k === "diagonal_parallelogram") &&
    typeof p.side === "number" &&
    typeof p.width === "number"
  ) {
    const shapeHe = k === "diagonal_parallelogram" ? "המקבילית" : "המלבן";
    return `אורכי צלעות ${shapeHe} הם ${p.side} ס״מ ו-${p.width} ס״מ. חשבו את אורך האלכסון.`;
  }
  if (
    k === "triangle_perimeter" &&
    typeof p.side1 === "number" &&
    typeof p.side2 === "number" &&
    typeof p.side3 === "number"
  ) {
    return `אורכי צלעות המשולש הם ${p.side1} ס״מ, ${p.side2} ס״מ ו-${p.side3} ס״מ. חשבו את היקף המשולש.`;
  }
  if (k === "parallelogram_area" && typeof p.base === "number" && typeof p.height === "number") {
    return `אורך בסיס המקבילית הוא ${p.base} ס״מ והגובה לבסיס הוא ${p.height} ס״מ. חשבו את שטח המקבילית.`;
  }
  if (k === "triangle_area" && typeof p.base === "number" && typeof p.height === "number") {
    return `אורך בסיס המשולש הוא ${p.base} ס״מ והגובה לבסיס הוא ${p.height} ס״מ. חשבו את שטח המשולש.`;
  }
  if (k === "square_area" && typeof p.side === "number") {
    return `אורך צלע הריבוע הוא ${p.side} ס״מ. חשבו את שטח הריבוע.`;
  }
  if (k === "rectangle_area" && typeof p.length === "number" && typeof p.width === "number") {
    return `אורך המלבן הוא ${p.length} ס״מ ורוחבו ${p.width} ס״מ. חשבו את שטח המלבן.`;
  }
  if (k === "square_perimeter" && typeof p.side === "number") {
    return `אורך צלע הריבוע הוא ${p.side} ס״מ. חשבו את היקף הריבוע.`;
  }
  if (
    k === "rectangle_perimeter" &&
    typeof p.length === "number" &&
    typeof p.width === "number"
  ) {
    return `אורך המלבן הוא ${p.length} ס״מ ורוחבו ${p.width} ס״מ. חשבו את היקף המלבן.`;
  }
  if (k === "heights_triangle" && typeof p.base === "number" && typeof p.area === "number") {
    return `שטח המשולש הוא ${p.area} סמ״ר ואורך הבסיס הוא ${p.base} ס״מ. חשבו את גובה המשולש לבסיס זה.`;
  }
  if (k === "heights_parallelogram" && typeof p.base === "number" && typeof p.area === "number") {
    return `שטח המקבילית הוא ${p.area} סמ״ר ואורך הבסיס הוא ${p.base} ס״מ. חשבו את הגובה לבסיס זה.`;
  }
  if (
    k === "trapezoid_area" &&
    typeof p.base1 === "number" &&
    typeof p.base2 === "number" &&
    typeof p.height === "number"
  ) {
    return `בסיסי הטרפז הם ${p.base1} ס״מ ו-${p.base2} ס״מ, והגובה הוא ${p.height} ס״מ. חשבו את שטח הטרפז.`;
  }
  if (k === "cylinder_volume" && typeof p.radius === "number" && typeof p.height === "number") {
    return `רדיוס הגליל הוא ${p.radius} ס״מ וגובהו ${p.height} ס״מ. חשבו את נפח הגליל (π = 3.14).`;
  }
  if (k === "sphere_volume" && typeof p.radius === "number") {
    return `רדיוס הכדור הוא ${p.radius} ס״מ. חשבו את נפח הכדור (π = 3.14).`;
  }
  if (
    (k === "pyramid_volume_square" || k === "pyramid_volume_rectangular") &&
    (typeof p.side === "number" || typeof p.baseSide === "number") &&
    typeof p.height === "number"
  ) {
    const side = typeof p.side === "number" ? p.side : p.baseSide;
    if (typeof p.baseWidth === "number" || typeof p.width === "number") {
      const w = typeof p.baseWidth === "number" ? p.baseWidth : p.width;
      return `בסיס הפירמידה הוא מלבן באורך ${side} ס״מ וברוחב ${w} ס״מ, וגובהה ${p.height} ס״מ. חשבו את נפח הפירמידה.`;
    }
    return `אורך צלע בסיס הפירמידה הריבועי הוא ${side} ס״מ וגובהה ${p.height} ס״מ. חשבו את נפח הפירמידה.`;
  }
  if (k === "cone_volume" && typeof p.radius === "number" && typeof p.height === "number") {
    return `רדיוס בסיס החרוט הוא ${p.radius} ס״מ וגובהו ${p.height} ס״מ. חשבו את נפח החרוט (π = 3.14).`;
  }
  if (k === "cube_volume" && typeof p.side === "number") {
    return `אורך צלע הקובייה הוא ${p.side} ס״מ. חשבו את נפח הקובייה.`;
  }
  if (
    (k === "rectangular_prism_volume" || k === "box_volume") &&
    typeof p.length === "number" &&
    typeof p.width === "number" &&
    typeof p.height === "number"
  ) {
    return `אורך התיבה הוא ${p.length} ס״מ, רוחבה ${p.width} ס״מ וגובהה ${p.height} ס״מ. חשבו את נפח התיבה.`;
  }
  if (
    (k === "prism_volume_triangle" || k === "prism_volume_rectangular") &&
    typeof p.base === "number" &&
    typeof p.height === "number"
  ) {
    if (typeof p.baseHeight === "number") {
      return `בסיס המנסרה המשולשת הוא משולש שאורך בסיסו ${p.base} ס״מ וגובהו ${p.baseHeight} ס״מ, וגובה המנסרה הוא ${p.height} ס״מ. חשבו את נפח המנסרה.`;
    }
    return `שטח בסיס המנסרה הוא ${p.base} סמ״ר וגובהה ${p.height} ס״מ. חשבו את נפח המנסרה.`;
  }
  if (k === "pythagoras_hyp" && typeof p.a === "number" && typeof p.b === "number") {
    return `במשולש ישר-זווית, אורכי הניצבים הם ${p.a} ס״מ ו-${p.b} ס״מ. חשבו את אורך היתר.`;
  }
  if (k === "pythagoras_leg" && typeof p.c === "number") {
    if (p.which === "leg_a" && typeof p.b === "number") {
      return `במשולש ישר-זווית, אורך היתר הוא ${p.c} ס״מ ואורך ניצב אחד הוא ${p.b} ס״מ. חשבו את אורך הניצב השני.`;
    }
    if (p.which === "leg_b" && typeof p.a === "number") {
      return `במשולש ישר-זווית, אורך היתר הוא ${p.c} ס״מ ואורך ניצב אחד הוא ${p.a} ס״מ. חשבו את אורך הניצב השני.`;
    }
  }

  return null;
}

/**
 * @param {string} text
 * @param {string} kind
 * @returns {boolean}
 */
function stemNeedsComputeRewrite(text, kind) {
  const t = String(text || "").trim();
  const k = String(kind || "").replace(/^story_/, "");
  if (!t) return false;
  if (k.startsWith("concept_")) return false;
  if (GEOMETRY_GENERIC_ANSWER_FILLER_RE.test(t)) return true;
  if (/^מדידת אלכסון/u.test(t)) return true;
  if (/שטח פנים/.test(t) && /ריבוע|מלבן|משולש|מקבילית|טרפז/.test(t)) return true;
  if (/^אתגר קצר\s*-\s*אלכסון/u.test(t)) return true;
  if (/^ניתוח אלכסון/u.test(t)) return true;
  if (/^חישוב אלכסון מ/u.test(t) && !HAS_ASK_CUE_RE.test(t)) return true;
  if (/גובה במשולש\s*\(ביחס/u.test(t)) return true;
  if (/הוא[:.]?\s*$/u.test(t)) return true;

  // Known compute kinds: sanitizer often keeps only the data clause — rebuild.
  const computeKinds = new Set([
    "triangle_perimeter",
    "parallelogram_area",
    "triangle_area",
    "square_area",
    "rectangle_area",
    "square_perimeter",
    "rectangle_perimeter",
    "heights_triangle",
    "heights_parallelogram",
    "diagonal_square",
    "diagonal_rectangle",
    "diagonal_parallelogram",
    "trapezoid_area",
    "cylinder_volume",
    "sphere_volume",
    "pyramid_volume_square",
    "pyramid_volume_rectangular",
    "cone_volume",
    "cube_volume",
    "rectangular_prism_volume",
    "prism_volume_triangle",
    "prism_volume_rectangular",
    "pythagoras_hyp",
    "pythagoras_leg",
  ]);
  if (computeKinds.has(k) && !HAS_ASK_CUE_RE.test(t)) return true;
  if (
    (k === "pythagoras_hyp" || k === "pythagoras_leg") &&
    (!/ס״מ|סמ/.test(t) || !HAS_ASK_CUE_RE.test(t))
  ) {
    return true;
  }

  if (
    /היקף|שטח|נפח|אלכסון|גובה|יתר|ניצב/.test(t) &&
    !HAS_ASK_CUE_RE.test(t)
  ) {
    return true;
  }
  if (
    /מקבילית:|היקף משולש:|ריבוע \d|צלעות \d|אורכי צלעות|אורך בסיס|אורך צלע/u.test(t) &&
    !HAS_ASK_CUE_RE.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * Worksheet-facing stem cleanup (keeps activity sanitizer for forbidden algebra terms).
 * @param {string} text
 * @param {{
 *   kind?: string|null,
 *   topic?: string|null,
 *   angle1?: number|null,
 *   angle2?: number|null,
 *   params?: Record<string, unknown>|null,
 * }} [context]
 * @returns {string}
 */
export function normalizeGeometryWorksheetStem(text, context = {}) {
  let t = sanitizeGeometryActivityQuestionStem(text, context);
  if (!t) return t;

  const kind = String(context?.kind || "");
  const angle1 = context?.angle1;
  const angle2 = context?.angle2;
  const params = context?.params && typeof context.params === "object" ? context.params : {};

  // Force clear compute wording for missing triangle angle.
  const isComputeTriangleAngles =
    kind === "triangle_angles" ||
    (context?.topic === "angles" &&
      !kind.startsWith("concept_") &&
      /זווית השלישית|שתי זוויות|ידועות/.test(t) &&
      /\d+\s*°/.test(t));
  if (isComputeTriangleAngles) {
    const m =
      t.match(/(\d+)\s*°\s*(?:ו[־\-–]?|ו)\s*(\d+)\s*°/u) ||
      t.match(/(\d+)\s*°[^\d]{0,12}(\d+)\s*°/u);
    const a1 = typeof angle1 === "number" ? angle1 : m ? Number(m[1]) : null;
    const a2 = typeof angle2 === "number" ? angle2 : m ? Number(m[2]) : null;
    if (a1 != null && a2 != null && Number.isFinite(a1) && Number.isFinite(a2)) {
      return formatTriangleAnglesKnownTwoStem(a1, a2);
    }
  }

  // Awkward principle prompts → clear MCQ stem (options stay conceptual).
  if (
    kind === "concept_angle_reason" ||
    /עיקרון גיאומטרי|לפני חישוב המספר|מה אפשר להסיק על הזווית/.test(t)
  ) {
    if (/סכום|180|זווית השלישית|שתי זוויות|ידועות/.test(t)) {
      return "מה נכון לגבי סכום הזוויות במשולש?";
    }
  }

  // Drop lead-ins that leave a data-only fragment looking unfinished.
  t = t.replace(/^חישוב זוויות במשולש\s*[:-–-]\s*/u, "");
  t = t.replace(/^מציאת זווית חסרה במשולש\s*[:-–-]\s*/u, "");

  // Never keep the banned generic filler — rewrite from params when possible.
  t = t.replace(/\s*חשבו את התשובה\.?\s*/gu, " ").replace(/\s{2,}/g, " ").trim();

  if (stemNeedsComputeRewrite(t, kind) || GEOMETRY_GENERIC_ANSWER_FILLER_RE.test(String(text || ""))) {
    const rebuilt = buildGeometryComputeStemFromParams(kind, { ...params, ...context });
    if (rebuilt) return rebuilt;
  }

  // Concept definition stems ending with colon are OK for MCQ — leave them.
  if (kind.startsWith("concept_")) {
    return t.replace(/\s{2,}/g, " ").trim();
  }

  return t.replace(/\s{2,}/g, " ").trim();
}

/**
 * True when a worksheet stem is still too vague / uses banned filler.
 * @param {string} stem
 * @param {string} [kind]
 * @returns {boolean}
 */
export function isGeometryWorksheetStemIncomplete(stem, kind = "") {
  const t = String(stem || "").trim();
  const k = String(kind || "");
  if (!t) return true;
  if (GEOMETRY_GENERIC_ANSWER_FILLER_RE.test(t)) return true;
  if (k.startsWith("concept_")) return false;
  if (/גובה במשולש\s*\(ביחס/u.test(t) && !HAS_ASK_CUE_RE.test(t)) return true;
  if (/^מדידת אלכסון/u.test(t)) return true;
  if (stemNeedsComputeRewrite(t, k) && !HAS_ASK_CUE_RE.test(t)) return true;
  return false;
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

  t = t.replace(/אלגברה\s+של\s+זוויות\s*[–-]\s*/gu, "חישוב זוויות במשולש - ");
  t = t.replace(/אלגברה\s+של\s+זוויות/gu, "חישוב זוויות במשולש");

  t = t.replace(
    /משוואת\s+זוויות:\s*(\d+)°\s*\+\s*(\d+)°\s*\+\s*\?\s*=\s*180°\s*-\s*מה\s+החסר\?/gu,
    (_, a1, a2) => formatTriangleAnglesKnownTwoStem(a1, a2)
  );
  t = t.replace(/משוואת\s+זוויות/gu, "חישוב זוויות במשולש");

  if (isTriangleAngles) {
    t = t.replace(
      /^חישוב זוויות במשולש\s*[–-]\s*סכום שתי זוויות ידועות הוא (\d+)°\+(\d+)°\s*[–-]\s*השלימו (?:ל)?זווית השלישית(?: במשולש)?\.?/giu,
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
      /^ניתוח\s+ל(?:לא\s+)?(?:ניסוח\s+)?(?:הכלל\s+)?(?:במפורש\s*)?[–-]\s*/giu,
      "מציאת זווית חסרה במשולש - "
    );
    t = t.replace(/^אתגר\s+(?:קצר|זוויות\s+משולש)\s*[–-]\s*/giu, "חישוב זוויות במשולש - ");
    t = t.replace(/^אתגר\s+זוויות\s+משולש\s*[–-]\s*/giu, "חישוב זוויות במשולש - ");
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
