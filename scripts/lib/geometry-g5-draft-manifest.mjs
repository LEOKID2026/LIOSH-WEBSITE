/**
 * Grade 5 Geometry learning book — draft-only manifest (scripts / docs).
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const GEOMETRY_G5_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "מקבילות, מרובעים וזוויות",
    pages: ["parallel_perpendicular", "quadrilaterals", "triangle_angles"],
  },
  {
    id: "b",
    titleHe: "היקף ושטח — ריבוע ומשולש",
    pages: ["square_perimeter", "triangle_perimeter", "square_area"],
  },
  {
    id: "c",
    titleHe: "שטח — מקבילית וטרפז",
    pages: ["parallelogram_area", "trapezoid_area"],
  },
  {
    id: "d",
    titleHe: "גובה במצולעים",
    pages: ["heights_triangle", "heights_parallelogram", "heights_trapezoid"],
  },
  {
    id: "e",
    titleHe: "אלכסונים",
    pages: ["diagonal_square", "diagonal_rectangle", "diagonal_parallelogram"],
  },
  {
    id: "f",
    titleHe: "גופים ונפח",
    pages: ["solids", "rectangular_prism_volume"],
  },
  {
    id: "g",
    titleHe: "ריצוף",
    pages: ["tiling"],
  },
];

export const GEOMETRY_G5_PAGE_ORDER = GEOMETRY_G5_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same problem context in both sections */
export const GEOMETRY_G5_ALIGNMENT_ANCHORS = {
  parallel_perpendicular: ["AB", "CD"],
  quadrilaterals: ["מקבילית", "טרפז"],
  triangle_angles: ["45°", "95°"],
  square_perimeter: ["7 ס״מ"],
  triangle_perimeter: ["3 ס״מ", "7 ס״מ", "9 ס״מ"],
  square_area: ["9 ס״מ"],
  parallelogram_area: ["6 ס״מ", "7 ס״מ"],
  trapezoid_area: ["4 ס״מ", "8 ס״מ", "6 ס״מ"],
  heights_triangle: ["12 ס״מ", "30 סמ״ר"],
  heights_parallelogram: ["6 ס״מ", "54 סמ״ר"],
  heights_trapezoid: ["3 ס״מ", "7 ס״מ", "30 סמ״ר"],
  diagonal_square: ["5 ס״מ", "√2"],
  diagonal_rectangle: ["5 ס״מ", "12 ס״מ"],
  diagonal_parallelogram: ["מקבילית", "מלבן"],
  solids: ["קובייה", "תיבה"],
  rectangular_prism_volume: ["2 ס״מ", "6 ס״מ", "3 ס״מ"],
  tiling: ["ריצוף", "משולשים"],
};

/** @type {Record<string, { skillId: string, pageType: string, titleHe: string, scope: string }>} */
export const GEOMETRY_G5_PAGE_META = {
  parallel_perpendicular: {
    skillId: "geometry:kind:parallel_perpendicular",
    pageType: "concept_foundation",
    titleHe: "קווים מקבילים ומאונכים",
    scope: "זיהוי מקביל ומאונך; בטרפז ומרובעים",
  },
  quadrilaterals: {
    skillId: "geometry:kind:quadrilaterals",
    pageType: "concept_foundation",
    titleHe: "סיווג מרובעים — כיתה ה׳",
    scope: "מקבילית, טרפז, מלבן, ריבוע; קשרי הכלה",
  },
  triangle_angles: {
    skillId: "geometry:kind:triangle_angles",
    pageType: "step_by_step_procedure",
    titleHe: "זוויות במשולש",
    scope: "סכום זוויות 180°; מציאת זווית שלישית",
  },
  square_perimeter: {
    skillId: "geometry:kind:square_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף ריבוע",
    scope: "היקף = 4 × צלע",
  },
  triangle_perimeter: {
    skillId: "geometry:kind:triangle_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף משולש",
    scope: "סכום שלוש הצלעות",
  },
  square_area: {
    skillId: "geometry:kind:square_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח ריבוע",
    scope: "שטח = צלע × צלע",
  },
  parallelogram_area: {
    skillId: "geometry:kind:parallelogram_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח מקבילית",
    scope: "שטח = בסיס × גובה",
  },
  trapezoid_area: {
    skillId: "geometry:kind:trapezoid_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח טרפז",
    scope: "שטח = (בסיס1 + בסיס2) × גובה ÷ 2",
  },
  heights_triangle: {
    skillId: "geometry:kind:heights_triangle",
    pageType: "step_by_step_procedure",
    titleHe: "גובה במשולש",
    scope: "גובה מהשטח והבסיס",
  },
  heights_parallelogram: {
    skillId: "geometry:kind:heights_parallelogram",
    pageType: "step_by_step_procedure",
    titleHe: "גובה במקבילית",
    scope: "גובה = שטח ÷ בסיס",
  },
  heights_trapezoid: {
    skillId: "geometry:kind:heights_trapezoid",
    pageType: "step_by_step_procedure",
    titleHe: "גובה בטרפז",
    scope: "גובה מהשטח ושני הבסיסים",
  },
  diagonal_square: {
    skillId: "geometry:kind:diagonal_square",
    pageType: "step_by_step_procedure",
    titleHe: "אלכסון בריבוע",
    scope: "אלכסון = צלע × √2",
  },
  diagonal_rectangle: {
    skillId: "geometry:kind:diagonal_rectangle",
    pageType: "step_by_step_procedure",
    titleHe: "אלכסון במלבן",
    scope: "פיתגורס: √(אורך² + רוחב²)",
  },
  diagonal_parallelogram: {
    skillId: "geometry:kind:diagonal_parallelogram",
    pageType: "concept_foundation",
    titleHe: "אלכסון במקבילית",
    scope: "אלכסון מחלק לשני משולשים; לא √(a²+b²) לכל מקבילית",
  },
  solids: {
    skillId: "geometry:kind:solids",
    pageType: "concept_foundation",
    titleHe: "גופים תלת-ממדיים — חזרה",
    scope: "קובייה, תיבה, גליל, כדור — שמות ותכונות",
  },
  rectangular_prism_volume: {
    skillId: "geometry:kind:rectangular_prism_volume",
    pageType: "step_by_step_procedure",
    titleHe: "נפח תיבה",
    scope: "נפח = אורך × רוחב × גובה",
  },
  tiling: {
    skillId: "geometry:kind:tiling",
    pageType: "concept_foundation",
    titleHe: "ריצוף במישור",
    scope: "זוויות ריצוף; ריבוע 90°",
  },
};
