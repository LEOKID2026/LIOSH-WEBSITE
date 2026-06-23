/**
 * Grade 6 Geometry learning book — draft-only manifest (scripts / docs).
 */

/** @type {{ id: string, titleHe: string, pages: string[] }[]} */
export const GEOMETRY_G6_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "היקף, שטח וזוויות — המשך כיתה ו׳",
    pages: [
      "square_perimeter",
      "triangle_perimeter",
      "square_area",
      "parallelogram_area",
      "trapezoid_area",
      "triangle_angles",
    ],
  },
  {
    id: "b",
    titleHe: "מעגל ועיגול",
    pages: ["circle_perimeter", "circle_area"],
  },
  {
    id: "c",
    titleHe: "משפט פיתגורס",
    pages: ["pythagoras_hyp", "pythagoras_leg"],
  },
  {
    id: "d",
    titleHe: "גופים ונפח בסיסי",
    pages: ["solids", "rectangular_prism_volume"],
  },
  {
    id: "e",
    titleHe: "נפח מנסרות",
    pages: ["prism_volume_rectangular", "prism_volume_triangle"],
  },
  {
    id: "f",
    titleHe: "נפח פירמידות",
    pages: ["pyramid_volume_square", "pyramid_volume_rectangular"],
  },
  {
    id: "g",
    titleHe: "נפח גליל, חרוט וכדור",
    pages: ["cylinder_volume", "cone_volume", "sphere_volume"],
  },
];

export const GEOMETRY_G6_PAGE_ORDER = GEOMETRY_G6_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same problem context in both sections */
export const GEOMETRY_G6_ALIGNMENT_ANCHORS = {
  square_perimeter: ["15 ס״מ"],
  triangle_perimeter: ["7 ס״מ", "12 ס״מ"],
  square_area: ["9 ס״מ"],
  parallelogram_area: ["8 ס״מ", "7 ס״מ"],
  trapezoid_area: ["6 ס״מ", "10 ס״מ", "4 ס״מ"],
  triangle_angles: ["65°", "40°"],
  circle_perimeter: ["7 ס״מ", "3.14"],
  circle_area: ["6 ס״מ", "3.14"],
  pythagoras_hyp: ["5 ס״מ", "12 ס״מ"],
  pythagoras_leg: ["10 ס״מ", "6 ס״מ"],
  solids: ["גליל", "חרוט"],
  rectangular_prism_volume: ["3 ס״מ", "4 ס״מ", "7 ס״מ"],
  prism_volume_rectangular: ["4 ס״מ", "5 ס״מ", "7 ס״מ"],
  prism_volume_triangle: ["6 ס״מ", "8 ס״מ", "7 ס״מ"],
  pyramid_volume_square: ["4 ס״מ", "12 ס״מ"],
  pyramid_volume_rectangular: ["5 ס״מ", "9 ס״מ", "6 ס״מ"],
  cylinder_volume: ["5 ס״מ", "8 ס״מ", "3.14"],
  cone_volume: ["5 ס״מ", "6 ס״מ", "3.14"],
  sphere_volume: ["6 ס״מ", "3.14"],
};

/** @type {Record<string, { skillId: string, pageType: string; titleHe: string; scope: string }>} */
export const GEOMETRY_G6_PAGE_META = {
  square_perimeter: {
    skillId: "geometry:kind:square_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף ריבוע — כיתה ו׳",
    scope: "היקף = 4×צלע; מספרים גדולים יותר",
  },
  triangle_perimeter: {
    skillId: "geometry:kind:triangle_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף משולש — כיתה ו׳",
    scope: "סכום שלוש צלעות",
  },
  square_area: {
    skillId: "geometry:kind:square_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח ריבוע — כיתה ו׳",
    scope: "צלע²; יחידות סמ״ר",
  },
  parallelogram_area: {
    skillId: "geometry:kind:parallelogram_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח מקבילית — כיתה ו׳",
    scope: "בסיס×גובה; G6 upgrade",
  },
  trapezoid_area: {
    skillId: "geometry:kind:trapezoid_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח טרפז — כיתה ו׳",
    scope: "(b1+b2)×h÷2",
  },
  triangle_angles: {
    skillId: "geometry:kind:triangle_angles",
    pageType: "step_by_step_procedure",
    titleHe: "זוויות במשולש — כיתה ו׳",
    scope: "סכום 180°; יישומים",
  },
  circle_perimeter: {
    skillId: "geometry:kind:circle_perimeter",
    pageType: "step_by_step_procedure",
    titleHe: "היקף מעגל",
    scope: "2×π×r; π≈3.14",
  },
  circle_area: {
    skillId: "geometry:kind:circle_area",
    pageType: "step_by_step_procedure",
    titleHe: "שטח עיגול",
    scope: "π×r²; π≈3.14",
  },
  pythagoras_hyp: {
    skillId: "geometry:kind:pythagoras_hyp",
    pageType: "step_by_step_procedure",
    titleHe: "משפט פיתגורס — מציאת יתר",
    scope: "a²+b²=c²; יתר",
  },
  pythagoras_leg: {
    skillId: "geometry:kind:pythagoras_leg",
    pageType: "step_by_step_procedure",
    titleHe: "משפט פיתגורס — מציאת ניצב",
    scope: "c²−a²=b²",
  },
  solids: {
    skillId: "geometry:kind:solids",
    pageType: "concept_foundation",
    titleHe: "גופים — גליל, פירמידה, חרוט, כדור",
    scope: "שמות ותכונות; G6 solids",
  },
  rectangular_prism_volume: {
    skillId: "geometry:kind:rectangular_prism_volume",
    pageType: "step_by_step_procedure",
    titleHe: "נפח תיבה — כיתה ו׳",
    scope: "a×b×h",
  },
  prism_volume_rectangular: {
    skillId: "geometry:kind:prism_volume_rectangular",
    pageType: "step_by_step_procedure",
    titleHe: "נפח מנסרה — בסיס מלבן",
    scope: "שטח בסיס × גובה",
  },
  prism_volume_triangle: {
    skillId: "geometry:kind:prism_volume_triangle",
    pageType: "step_by_step_procedure",
    titleHe: "נפח מנסרה — בסיס משולש",
    scope: "שטח משולש × גובה",
  },
  pyramid_volume_square: {
    skillId: "geometry:kind:pyramid_volume_square",
    pageType: "step_by_step_procedure",
    titleHe: "נפח פירמידה — בסיס ריבוע",
    scope: "(1/3)×שטח בסיס×גובה",
  },
  pyramid_volume_rectangular: {
    skillId: "geometry:kind:pyramid_volume_rectangular",
    pageType: "step_by_step_procedure",
    titleHe: "נפח פירמידה — בסיס מלבן",
    scope: "(1/3)×שטח בסיס×גובה",
  },
  cylinder_volume: {
    skillId: "geometry:kind:cylinder_volume",
    pageType: "step_by_step_procedure",
    titleHe: "נפח גליל",
    scope: "π×r²×h",
  },
  cone_volume: {
    skillId: "geometry:kind:cone_volume",
    pageType: "step_by_step_procedure",
    titleHe: "נפח חרוט",
    scope: "(1/3)×π×r²×h",
  },
  sphere_volume: {
    skillId: "geometry:kind:sphere_volume",
    pageType: "step_by_step_procedure",
    titleHe: "נפח כדור",
    scope: "(4/3)×π×r³",
  },
};
