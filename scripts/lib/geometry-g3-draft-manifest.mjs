/**
 * Grade 3 Geometry learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G3GeoBatch */

/** @type {G3GeoBatch[]} */
export const GEOMETRY_G3_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "משולשים ומרובעים",
    pages: ["triangles", "quadrilaterals"],
  },
  {
    id: "b",
    titleHe: "מקבילות ומאונכות",
    pages: ["parallel_perpendicular"],
  },
  {
    id: "c",
    titleHe: "שטח והיקף",
    pages: ["square_area", "square_perimeter", "triangle_perimeter"],
  },
  {
    id: "d",
    titleHe: "זוויות במשולש",
    pages: ["triangle_angles"],
  },
  {
    id: "e",
    titleHe: "סיבוב וגופים",
    pages: ["rotation", "solids"],
  },
];

export const GEOMETRY_G3_PAGE_ORDER = GEOMETRY_G3_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors */
export const GEOMETRY_G3_ALIGNMENT_ANCHORS = {
  triangles: ["3", "5"],
  quadrilaterals: ["מלבן", "ריבוע"],
  parallel_perpendicular: ["מקבילים", "מאונכים"],
  square_area: ["ריבוע", "6"],
  square_perimeter: ["ריבוע", "8"],
  triangle_perimeter: ["4", "5", "6"],
  triangle_angles: ["40°", "75°"],
  rotation: ["סיבוב", "מעלות"],
  solids: ["מקצועות", "קוביית"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const GEOMETRY_G3_PAGE_META = {
  triangles: {
    skillId: "geometry:kind:triangles",
    pageType: "concept_foundation",
    titleHe: "סוגי משולשים",
    scope: "שווה צלעות, שווה שוקיים, שונה צלעות; זיהוי",
  },
  quadrilaterals: {
    skillId: "geometry:kind:quadrilaterals",
    pageType: "concept_foundation",
    titleHe: "סוגי מרובעים",
    scope: "ריבוע, מלבן, מקבילית, טרפז — שמות בסיסיים",
  },
  parallel_perpendicular: {
    skillId: "geometry:kind:parallel_perpendicular",
    pageType: "concept_foundation",
    titleHe: "מקבילות ומאונכות",
    scope: "זוג קווים מקבילים; זווית ישרה 90°",
  },
  square_area: {
    skillId: "geometry:kind:square_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח ריבוע — כיתה ג׳",
    scope: "יחידות ריבוע; צלע × צלע; מספרים עד ~100",
  },
  square_perimeter: {
    skillId: "geometry:kind:square_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף ריבוע",
    scope: "סכום 4 צלעות; 4 × צלע",
  },
  triangle_perimeter: {
    skillId: "geometry:kind:triangle_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף משולש",
    scope: "חיבור שלוש צלעות",
  },
  triangle_angles: {
    skillId: "geometry:kind:triangle_angles",
    pageType: "step_by_step_procedure",
    titleHe: "זוויות במשולש",
    scope: "סכום זוויות 180°; שתי זוויות ידועות",
  },
  rotation: {
    skillId: "geometry:kind:rotation",
    pageType: "visual_intuition",
    titleHe: "סיבוב במישור",
    scope: "רבע סיבוב 90°; היכרות; ללא מרכז פורמלי",
  },
  solids: {
    skillId: "geometry:kind:solids",
    pageType: "practice_bridge",
    titleHe: "גופים — פאות, קדקודים ומקצועות",
    scope: "קובייה: 6 פאות, 8 קדקודים, 12 מקצועות; ללא נפח",
  },
};
