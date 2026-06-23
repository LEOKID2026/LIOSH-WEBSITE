/**
 * Phase 3-B0 / Stage 4D — order geometry taxonomy candidates for conflict buckets only:
 * - `quadrilaterals`: G-01 vs G-03
 * - `area`: G-03 vs G-08
 *
 * Uses wrong-event metadata (patternFamily, kind, params, possibleErrorPatterns, questionLabel)
 * plus row grade/level only. Never removes candidates; only reorders with real evidence.
 */
import {
  parseGeometryGateGrade,
  TRIANGLE_AREA_FORMULA_MIN_GRADE,
} from "../geometry-curriculum-gates.js";
import {
  routingHaystackForWrongEvent,
  routingRowGradeLevelHaystack,
  countRoutingIndicatorHits,
} from "./diagnostic-routing-haystack.js";
import {
  taxonomyPatternRoutingScores,
  reorderPairByPreference,
} from "./taxonomy-pattern-routing-scores.js";

/** Longer phrases first to reduce redundant double-counting on the same haystack. */
const G01_INDICATORS = [
  "classify_shape",
  "shape_property",
  "shapes_basic",
  "quadrilateral",
  "quadrilaterals",
  "parallelogram",
  "perpendicular",
  "rectangle",
  "trapezoid",
  "diagonals",
  "diagonal",
  "rhombus",
  "parallel",
  "tiling",
  "square",
  "shape",
  "identify_rectangle",
  "shapes_basic_rectangle",
];

const G03_INDICATORS = [
  "area_of_trapezoid",
  "area_of_parallelogram",
  "quadrilateral_area",
  "area_reasoning",
  "missing_height",
  "area_by_height",
  "base_height",
  "area_height",
  "height",
  "base",
  "rectangle_area_procedural",
  "procedural",
  "צלעות כגובה",
  "בחירת גובה",
  "כפל שגוי",
];

const G08_INDICATORS = [
  "formula_pipeline",
  "substitute_formula",
  "advanced_area",
  "triangle_area",
  "area_formula",
  "pythagorean",
  "pythagoras",
  "hypotenuse",
  "theorem",
  "formula",
  "leg",
  "triangle_area_formula",
];

const G08_FORMULA_INDICATORS = new Set([
  "formula_pipeline",
  "substitute_formula",
  "advanced_area",
  "triangle_area",
  "area_formula",
  "formula",
]);

/**
 * @param {unknown} row
 * @returns {string[]}
 */
function g08IndicatorsForRow(row) {
  const n = parseGeometryGateGrade(
    row && typeof row === "object"
      ? /** @type {Record<string, unknown>} */ (row).gradeKey ??
          /** @type {Record<string, unknown>} */ (row).contentGradeKey
      : null,
  );
  if (n == null || n < TRIANGLE_AREA_FORMULA_MIN_GRADE) {
    return G08_INDICATORS.filter((ind) => !G08_FORMULA_INDICATORS.has(ind));
  }
  return G08_INDICATORS;
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ g01Score: number; g03Score: number }}
 */
export function geometryQuadrilateralRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  let g01Score = 0;
  let g03Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  const tax = taxonomyPatternRoutingScores(["G-01", "G-03"], list, row);
  g01Score += tax["G-01"] || 0;
  g03Score += tax["G-03"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev)}`.trim().toLowerCase();
    g01Score += countRoutingIndicatorHits(wh, G01_INDICATORS);
    g03Score += countRoutingIndicatorHits(wh, G03_INDICATORS);
  }
  return { g01Score, g03Score };
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ g03Score: number; g08Score: number }}
 */
export function geometryAreaRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  const g08Indicators = g08IndicatorsForRow(row);
  let g03Score = 0;
  let g08Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  const tax = taxonomyPatternRoutingScores(["G-03", "G-08"], list, row);
  g03Score += tax["G-03"] || 0;
  g08Score += tax["G-08"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev)}`.trim().toLowerCase();
    g03Score += countRoutingIndicatorHits(wh, G03_INDICATORS);
    g08Score += countRoutingIndicatorHits(wh, g08Indicators);

    if (/perimeter|היקף/.test(wh)) g03Score += 1;
    if (/unit|יחיד|cm|מ\"ר|sq/.test(wh) && !/formula|נוסח/.test(wh)) g03Score += 1;
  }
  return { g03Score, g08Score };
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {{ orderedIds: string[]; disambiguationApplied: boolean; winnerId: string|null; scores?: Record<string, number> }}
 */
export function orderGeometryTaxonomyCandidatesWithMeta(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { orderedIds: candidateIds ? [...candidateIds] : [], disambiguationApplied: false, winnerId: null };
  }
  const bucketKey = String(ctx.bucketKey || "").trim();
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  if (bucketKey === "quadrilaterals") {
    const has1 = candidateIds.includes("G-01");
    const has3 = candidateIds.includes("G-03");
    if (has1 && has3) {
      const { g01Score, g03Score } = geometryQuadrilateralRoutingScores(list, ctx.row);
      const pair = reorderPairByPreference(
        "G-01",
        "G-03",
        g01Score > g03Score,
        g03Score > g01Score,
        candidateIds,
      );
      return { ...pair, scores: { "G-01": g01Score, "G-03": g03Score } };
    }
  }

  if (bucketKey === "area") {
    const has3 = candidateIds.includes("G-03");
    const has8 = candidateIds.includes("G-08");
    if (has3 && has8) {
      const { g03Score, g08Score } = geometryAreaRoutingScores(list, ctx.row);
      const pair = reorderPairByPreference(
        "G-03",
        "G-08",
        g03Score > g08Score,
        g08Score > g03Score,
        candidateIds,
      );
      return { ...pair, scores: { "G-03": g03Score, "G-08": g08Score } };
    }
  }

  return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {string[]}
 */
export function orderGeometryTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  return orderGeometryTaxonomyCandidatesWithMeta(candidateIds, wrongEvents, ctx).orderedIds;
}
