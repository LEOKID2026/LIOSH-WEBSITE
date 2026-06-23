/**
 * Grade 2 Geometry learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G2GeoBatch */

/** @type {G2GeoBatch[]} */
export const GEOMETRY_G2_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "גופים תלת ממדיים",
    pages: ["solids"],
  },
  {
    id: "b",
    titleHe: "שטח — ריבוע",
    pages: ["square_area"],
  },
  {
    id: "c",
    titleHe: "הזזה ושיקוף — המשך",
    pages: ["transformations"],
  },
];

export const GEOMETRY_G2_PAGE_ORDER = GEOMETRY_G2_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const GEOMETRY_G2_ALIGNMENT_ANCHORS = {
  solids: ["גוף", "פחית"],
  square_area: ["ריבוע", "3"],
  transformations: ["הזזה", "שיקוף"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const GEOMETRY_G2_PAGE_META = {
  solids: {
    skillId: "geometry:kind:solids",
    pageType: "visual_intuition",
    titleHe: "גופים תלת ממדיים — שמות והיכרות",
    scope: "קובייה, תיבה, גליל, פירמידה, חרוט, כדור — זיהוי; ללא נפח",
  },
  square_area: {
    skillId: "geometry:kind:square_area",
    pageType: "visual_intuition",
    titleHe: "שטח של ריבוע",
    scope: "כיסוי בריבועים; צלע × צלע; מספרים קטנים; ללא π",
  },
  transformations: {
    skillId: "geometry:kind:transformations",
    pageType: "visual_intuition",
    titleHe: "הזזה ושיקוף — המשך",
    scope: "הבחנה מדויקת יותר; הזזה מול שיקוף; ללא סיבוב",
  },
};
