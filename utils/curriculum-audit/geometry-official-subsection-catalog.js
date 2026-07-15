/**
 * Phase 4G — Official Geometry subsection catalog (planning artefact).
 * Geometry is a separate product strand but aligns with the MoE math programme geometry thread (POP).
 *
 * @typedef {'high' | 'medium' | 'low'} CatalogConfidence
 * @typedef {'intro' | 'basic' | 'developing' | 'advanced'} ExpectedDepth
 */

import {
  MATH_ELEMENTARY_GRADE_PDF_BASE,
  SOURCE_REGISTRY_CHECKED_AT,
} from "./official-curriculum-source-registry.js";

/** Official elementary programme PDF for grade (geometry strand appears inside math kita PDF). */
export function geometryGradeProgrammePdfUrl(grade) {
  return `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita${grade}.pdf`;
}

/** POP — geometry strand (single anchor for all elementary grades). */
export const GEOMETRY_STRAND_POP_PAGE =
  "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/noseem_nilmadim/geometrya/";

/** @param {object} p */
function sec(p) {
  return {
    confidence: /** @type {CatalogConfidence} */ (p.confidence || "medium"),
    notes:
      p.notes ||
      "נוסח ידני לפי מיתר הגאומטריה בתוכנית מתמטיקה יסודית - לאמת מול PDF הכיתה.",
    ...p,
  };
}

/**
 * @param {number} grade 1–6
 */
export function buildGeometrySectionsForGrade(grade) {
  /** @type {object[]} */
  const s = [];

  const strand = {
    shapes: "plane_figures",
    measure: "measurement_volume",
    spatial: "spatial_reasoning",
    reasoning: "geometric_reasoning",
  };

  /* ---------- Grade 1 ---------- */
  if (grade === 1) {
    s.push(
      sec({
        sectionKey: "g1_shapes_plane_intro",
        labelHe: "צורות במישור - היכרות והעתקה",
        strand: strand.shapes,
        subsectionLabelsHe: ["זיהוי ריבוע ומלבן", "סיווג ראשוני"],
        expectedDepth: "intro",
        sourcePageHint: "גאומטריה כיתה א׳ - צורות בסיסיות",
        mapsToNormalizedKeys: ["geometry.shape_recognition_plane_figures"],
        confidence: "high",
      }),
      sec({
        sectionKey: "g1_transformations_intro",
        labelHe: "תנועות והזזות בסיסיות",
        strand: strand.spatial,
        subsectionLabelsHe: ["הזזה", "שיקוף פשוט"],
        expectedDepth: "intro",
        sourcePageHint: "טרנספורמציות בסיסיות",
        mapsToNormalizedKeys: ["geometry.transformations_symmetry"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g1_solids_area_exposure",
        labelHe: "גופים ושטח - חשיפה ראשונית",
        strand: strand.measure,
        subsectionLabelsHe: ["הכרת גופים", "השוואת שטחים פשוטה"],
        expectedDepth: "intro",
        sourcePageHint: "מדידות והיכרות",
        mapsToNormalizedKeys: ["geometry.solids_3d", "geometry.area"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g1_parallel_spatial_intro",
        labelHe: "מקבילים ומאונכים - תפיסה ראשונית",
        strand: strand.spatial,
        subsectionLabelsHe: [],
        expectedDepth: "intro",
        sourcePageHint: "מיקום במרחב",
        mapsToNormalizedKeys: ["geometry.parallel_perpendicular_spatial"],
        confidence: "low",
      })
    );
  }

  /* ---------- Grade 2 ---------- */
  if (grade === 2) {
    s.push(
      sec({
        sectionKey: "g2_area_solids_core",
        labelHe: "שטח וגופים - המשך כיתה ב׳",
        strand: strand.measure,
        subsectionLabelsHe: ["שטיח פשוט", "גופים מוכרים"],
        expectedDepth: "basic",
        sourcePageHint: "מדידות וגופים",
        mapsToNormalizedKeys: ["geometry.area", "geometry.solids_3d", "geometry.volume"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_shapes_transformations",
        labelHe: "צורות וטרנספורמציות",
        strand: strand.shapes,
        subsectionLabelsHe: ["מצולעים", "הזזה ושיקוף"],
        expectedDepth: "basic",
        sourcePageHint: "צורות במישור",
        mapsToNormalizedKeys: [
          "geometry.shape_recognition_plane_figures",
          "geometry.transformations_symmetry",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_perimeter_spatial",
        labelHe: "היקף והקשר למצולעים",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "basic",
        sourcePageHint: "מדידות",
        mapsToNormalizedKeys: ["geometry.perimeter", "geometry.parallel_perpendicular_spatial"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_angles_intro",
        labelHe: "זוויות - היכרות",
        strand: strand.reasoning,
        subsectionLabelsHe: [],
        expectedDepth: "basic",
        sourcePageHint: "זוויות בסיסיות",
        mapsToNormalizedKeys: ["geometry.angles"],
        confidence: "low",
      })
    );
  }

  /* ---------- Grade 3 ---------- */
  if (grade === 3) {
    s.push(
      sec({
        sectionKey: "g3_angles_parallel_triangles_quads",
        labelHe: "זוויות, מקבילים, משולשים ומרובעים",
        strand: strand.reasoning,
        subsectionLabelsHe: ["סיווג זוויות", "מקבילים ומאונכים"],
        expectedDepth: "developing",
        sourcePageHint: "גאומטריה כיתה ג׳",
        mapsToNormalizedKeys: [
          "geometry.angles",
          "geometry.parallel_perpendicular_spatial",
          "geometry.triangles",
          "geometry.polygons_quadrilaterals",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_area_perimeter",
        labelHe: "שטח, היקף ונפח בסיסי",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "מדידות",
        mapsToNormalizedKeys: ["geometry.area", "geometry.perimeter", "geometry.volume"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_shapes_solids_diagonals",
        labelHe: "צורות, גופים ואלכסונים",
        strand: strand.shapes,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "מצולעים וגופים",
        mapsToNormalizedKeys: [
          "geometry.shape_recognition_plane_figures",
          "geometry.solids_3d",
          "geometry.diagonals_properties",
          "geometry.heights_area_links",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_transform_rotation",
        labelHe: "טרנספורמציות וסיבוב",
        strand: strand.spatial,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "תנועות במישור",
        mapsToNormalizedKeys: ["geometry.transformations_symmetry"],
        confidence: "medium",
      })
    );
  }

  /* ---------- Grade 4 ---------- */
  if (grade === 4) {
    s.push(
      sec({
        sectionKey: "g4_polygons_diagonals_symmetry",
        labelHe: "מצולעים, אלכסונים וסימטריה",
        strand: strand.shapes,
        subsectionLabelsHe: ["תכונות ריבוע ומלבן", "אלכסון במלבן"],
        expectedDepth: "developing",
        sourcePageHint: "גאומטריה כיתה ד׳",
        mapsToNormalizedKeys: [
          "geometry.shape_recognition_plane_figures",
          "geometry.diagonals_properties",
          "geometry.transformations_symmetry",
          "geometry.polygons_quadrilaterals",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_area_perimeter_volume_boxes",
        labelHe: "שטח, היקף ונפח תיבה",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "מדידות ונפח תיבה",
        mapsToNormalizedKeys: ["geometry.area", "geometry.perimeter", "geometry.volume"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_circles_solids_intro",
        labelHe: "מעגל וגופים",
        strand: strand.shapes,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "צורות עגולות ותיבות",
        mapsToNormalizedKeys: ["geometry.circle_basic", "geometry.solids_3d"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_triangles_quadrilaterals",
        labelHe: "משולשים, מרובעים, זוויות ומקבילים",
        strand: strand.reasoning,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "סיווג צורות",
        mapsToNormalizedKeys: [
          "geometry.triangles",
          "geometry.polygons_quadrilaterals",
          "geometry.angles",
          "geometry.parallel_perpendicular_spatial",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_tiling_enrichment",
        labelHe: "ריצוף וכיסוי",
        strand: strand.shapes,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "ריצוף",
        mapsToNormalizedKeys: ["geometry.tiling_covering"],
        confidence: "low",
      })
    );
  }

  /* ---------- Grade 5 ---------- */
  if (grade === 5) {
    s.push(
      sec({
        sectionKey: "g5_angle_quad_parallel_diagonal_height",
        labelHe: "זוויות, מרובעים, מקבילים, אלכסון וגובה",
        strand: strand.reasoning,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "גאומטריה כיתה ה׳",
        mapsToNormalizedKeys: [
          "geometry.angles",
          "geometry.polygons_quadrilaterals",
          "geometry.parallel_perpendicular_spatial",
          "geometry.diagonals_properties",
          "geometry.heights_area_links",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_area_perimeter_volume",
        labelHe: "שטח, היקף ונפח",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "מדידות",
        mapsToNormalizedKeys: ["geometry.area", "geometry.perimeter", "geometry.volume"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_transform_tiling_mixed",
        labelHe: "טרנספורמציות, ריצוף וערבוב",
        strand: strand.spatial,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "סימטריה וריצוף",
        mapsToNormalizedKeys: [
          "geometry.transformations_symmetry",
          "geometry.tiling_covering",
          "geometry.mixed_review",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_solids_triangles",
        labelHe: "גופים ומשולשים",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "גופים תלת ממדיים",
        mapsToNormalizedKeys: ["geometry.solids_3d", "geometry.triangles"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_shapes_recognition",
        labelHe: "הכרת צורות במישור",
        strand: strand.shapes,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "חזרה והרחבה",
        mapsToNormalizedKeys: ["geometry.shape_recognition_plane_figures"],
        confidence: "low",
      })
    );
  }

  /* ---------- Grade 6 ---------- */
  if (grade === 6) {
    s.push(
      sec({
        sectionKey: "g6_solids_circle_volume",
        labelHe: "גופים, מעגל ונפח",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "גאומטריה כיתה ו׳",
        mapsToNormalizedKeys: [
          "geometry.solids_3d",
          "geometry.circle_basic",
          "geometry.volume",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_area_perimeter_angles",
        labelHe: "שטח, היקף וזוויות",
        strand: strand.measure,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "מדידות והיקפים",
        mapsToNormalizedKeys: ["geometry.area", "geometry.perimeter", "geometry.angles"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_pythagoras_triangles",
        labelHe: "משפט פיתגורס ומשולשים",
        strand: strand.reasoning,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "משולש ישר זווית",
        mapsToNormalizedKeys: ["geometry.pythagoras_right_triangles", "geometry.triangles"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_quadrilaterals_transform",
        labelHe: "מרובעים, אלכסונים וטרנספורמציות",
        strand: strand.shapes,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "תכונות צורה",
        mapsToNormalizedKeys: [
          "geometry.polygons_quadrilaterals",
          "geometry.transformations_symmetry",
          "geometry.parallel_perpendicular_spatial",
          "geometry.diagonals_properties",
          "geometry.tiling_covering",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_mixed_review_geometry",
        labelHe: "תרגול משולב",
        strand: strand.reasoning,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "סיכום",
        mapsToNormalizedKeys: ["geometry.mixed_review", "geometry.heights_area_links"],
        confidence: "low",
      })
    );
  }

  return s;
}

/**
 * Planning notes until PDF subsection anchors are confirmed.
 * @param {number} grade
 */
export function geometryMissingUncertainAreasForGrade(grade) {
  const common = [
    "מיתר הגאומטריה משולב בתוכנית המתמטיקה - לאמת סדר עומק מול מסמך הכיתה.",
    "קישור לעמוד מדויק ב PDF לא נסרק אוטומטית.",
  ];
  if (grade <= 2) return [...common, "חשיפה מוקדמת לנושאים מתקדמים - רגישות רצף מוסדית."];
  if (grade <= 4) return [...common, "נפח ואלכסונים - לאמת עומק לפי המוסד."];
  return [...common];
}

function buildFullGeometryCatalog() {
  /** @type {Record<string, object>} */
  const out = {};
  for (let g = 1; g <= 6; g++) {
    out[`grade_${g}`] = {
      grade: g,
      sourcePdf: geometryGradeProgrammePdfUrl(g),
      strandPopAnchor: GEOMETRY_STRAND_POP_PAGE,
      catalogCheckedAt: SOURCE_REGISTRY_CHECKED_AT,
      missingUncertainAreas: geometryMissingUncertainAreasForGrade(g),
      sections: buildGeometrySectionsForGrade(g),
    };
  }
  return out;
}

export const GEOMETRY_OFFICIAL_SUBSECTION_CATALOG = buildFullGeometryCatalog();
