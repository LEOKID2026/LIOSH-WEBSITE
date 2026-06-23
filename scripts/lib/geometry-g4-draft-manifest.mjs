/**
 * Grade 4 Geometry learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const GEOMETRY_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "תכונות ריבוע ומלבן",
    pages: [
      "shapes_basic_properties_square",
      "shapes_basic_properties_rectangle",
      "shapes_basic_properties_angles",
      "symmetry",
    ],
  },
  {
    id: "b",
    titleHe: "מרובעים ומקבילות",
    pages: ["quadrilaterals", "parallel_perpendicular"],
  },
  {
    id: "c",
    titleHe: "היקף ושטח",
    pages: ["square_perimeter", "square_area", "triangle_perimeter", "triangle_angles"],
  },
  {
    id: "d",
    titleHe: "אלכסונים",
    pages: ["diagonal_square", "diagonal_rectangle"],
  },
  {
    id: "e",
    titleHe: "גופים ונפח תיבה",
    pages: ["solids", "rectangular_prism_volume"],
  },
];

export const GEOMETRY_G4_PAGE_ORDER = GEOMETRY_G4_BOOK_BATCHES.flatMap((b) => b.pages);

export const GEOMETRY_G4_ALIGNMENT_ANCHORS = {
  shapes_basic_properties_square: ["ריבוע", "4"],
  shapes_basic_properties_rectangle: ["מלבן", "2"],
  shapes_basic_properties_angles: ["ריבוע", "4"],
  symmetry: ["ריבוע"],
  quadrilaterals: ["מלבן", "ריבוע"],
  parallel_perpendicular: ["מקבילות"],
  square_perimeter: ["ריבוע", "6"],
  square_area: ["ריבוע", "9"],
  triangle_perimeter: ["4", "7", "9"],
  triangle_angles: ["60°", "80°"],
  diagonal_square: ["ריבוע", "8"],
  diagonal_rectangle: ["6", "8"],
  solids: ["תיבה"],
  rectangular_prism_volume: ["2", "4", "6"],
};

/** @type {Record<string, { skillId: string; pageType: string; titleHe: string; scope: string }>} */
export const GEOMETRY_G4_PAGE_META = {
  shapes_basic_properties_square: {
    skillId: "geometry:kind:shapes_basic_properties_square",
    pageType: "concept_foundation",
    titleHe: "תכונות הריבוע — צלעות",
    scope: "4 צלעות שוות; g4-only skill",
  },
  shapes_basic_properties_rectangle: {
    skillId: "geometry:kind:shapes_basic_properties_rectangle",
    pageType: "concept_foundation",
    titleHe: "תכונות המלבן — זוגות צלעות",
    scope: "2 זוגות צלעות שוות; g4-only",
  },
  shapes_basic_properties_angles: {
    skillId: "geometry:kind:shapes_basic_properties_angles",
    pageType: "concept_foundation",
    titleHe: "זוויות ישרות במרובע",
    scope: "4 זוויות ישרות; 90°; g4-only",
  },
  symmetry: {
    skillId: "geometry:kind:symmetry",
    pageType: "visual_intuition",
    titleHe: "סימטרייה במישור",
    scope: "ציר סימטרייה; ריבוע 4 צירים; g4-only",
  },
  quadrilaterals: {
    skillId: "geometry:kind:quadrilaterals",
    pageType: "concept_foundation",
    titleHe: "מרובעים — תכונות וסיווג",
    scope: "ריבוע ⊂ מלבן; מקבילית; טרפז; G4 depth",
  },
  parallel_perpendicular: {
    skillId: "geometry:kind:parallel_perpendicular",
    pageType: "concept_foundation",
    titleHe: "מקבילות ומאונכות — במצולעים",
    scope: "יישום במרובעים; 90°",
  },
  square_perimeter: {
    skillId: "geometry:kind:square_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף ריבוע — כיתה ד׳",
    scope: "4 × צלע; מספרים גדולים יותר",
  },
  square_area: {
    skillId: "geometry:kind:square_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח ריבוע — כיתה ד׳",
    scope: "צלע × צלע; עד ~100",
  },
  triangle_perimeter: {
    skillId: "geometry:kind:triangle_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף משולש — כיתה ד׳",
    scope: "סכום שלוש צלעות",
  },
  triangle_angles: {
    skillId: "geometry:kind:triangle_angles",
    pageType: "step_by_step_procedure",
    titleHe: "זוויות במשולש — כיתה ד׳",
    scope: "180°; שתי זוויות ידועות",
  },
  diagonal_square: {
    skillId: "geometry:kind:diagonal_square",
    pageType: "step_by_step_procedure",
    titleHe: "אלכסון בריבוע",
    scope: "קו מפינה לפינה; ארוך מהצלע; ללא שורש רשמי בכיתה ד׳",
  },
  diagonal_rectangle: {
    skillId: "geometry:kind:diagonal_rectangle",
    pageType: "step_by_step_procedure",
    titleHe: "אלכסון במלבן",
    scope: "מלבן 3×4; אלכסון 5 (משולש 3-4-5)",
  },
  solids: {
    skillId: "geometry:kind:solids",
    pageType: "practice_bridge",
    titleHe: "גופים — פאות במישור",
    scope: "תיבה: 6 מלבנים; זיהוי; ללא נפח מורכב",
  },
  rectangular_prism_volume: {
    skillId: "geometry:kind:rectangular_prism_volume",
    pageType: "step_by_step_procedure",
    titleHe: "נפח תיבה",
    scope: "אורך × רוחב × גובה; ס״מ מעוקב; מספרים קטנים",
  },
};
