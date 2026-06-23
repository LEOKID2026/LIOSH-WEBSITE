/**
 * Grade 1 Geometry learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G1GeoBatch */

/** @type {G1GeoBatch[]} */
export const GEOMETRY_G1_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "צורות בסיסיות — ריבוע ומלבן",
    pages: ["shapes_basic_square", "shapes_basic_rectangle"],
  },
  {
    id: "b",
    titleHe: "הזזה ושיקוף",
    pages: ["transformations"],
  },
];

export const GEOMETRY_G1_PAGE_ORDER = GEOMETRY_G1_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same shape/context in both sections */
export const GEOMETRY_G1_ALIGNMENT_ANCHORS = {
  shapes_basic_square: ["ריבוע", "4"],
  shapes_basic_rectangle: ["מלבן", "רוחב"],
  transformations: ["הזזה"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const GEOMETRY_G1_PAGE_META = {
  shapes_basic_square: {
    skillId: "geometry:kind:shapes_basic_square",
    pageType: "visual_intuition",
    titleHe: "הכרת הריבוע",
    scope: "זיהוי ריבוע; ארבע צלעות שוות; זוויות ישרות; ללא מדידות",
  },
  shapes_basic_rectangle: {
    skillId: "geometry:kind:shapes_basic_rectangle",
    pageType: "visual_intuition",
    titleHe: "הכרת המלבן",
    scope: "זיהוי מלבן; אורך ורוחב שונים; זוגות צלעות נגדיות; ללא מדידות",
  },
  transformations: {
    skillId: "geometry:kind:transformations",
    pageType: "visual_intuition",
    titleHe: "הזזה ושיקוף — היכרות",
    scope: "הזזה (מעבר בלי היפוך); שיקוף (מראה); ללא סיבוב בכיתה א׳",
  },
};
