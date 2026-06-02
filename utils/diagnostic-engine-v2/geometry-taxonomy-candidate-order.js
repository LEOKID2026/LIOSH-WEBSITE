/**
 * Phase 3-B0 — order geometry taxonomy candidates for conflict buckets only:
 * - `quadrilaterals`: G-01 vs G-03
 * - `area`: G-03 vs G-08
 *
 * Uses wrong-event metadata (patternFamily, kind, params, etc.) plus row grade/level only.
 * Row bucket/topic keys are excluded from the routing haystack so literal bucket names do not dominate.
 * Never removes candidates; only reorders when both conflict ids are present.
 */
import {
  parseGeometryGateGrade,
  TRIANGLE_AREA_FORMULA_MIN_GRADE,
} from "../geometry-curriculum-gates.js";

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
      : null
  );
  if (n == null || n < TRIANGLE_AREA_FORMULA_MIN_GRADE) {
    return G08_INDICATORS.filter((ind) => !G08_FORMULA_INDICATORS.has(ind));
  }
  return G08_INDICATORS;
}

/**
 * @param {unknown} ev
 * @returns {string}
 */
function haystackForWrong(ev) {
  if (!ev || typeof ev !== "object") return "";
  const e = /** @type {Record<string, unknown>} */ (ev);
  const parts = [];
  for (const k of ["patternFamily", "kind", "conceptTag", "diagnosticSkillId", "topicOrOperation"]) {
    if (e[k] != null && String(e[k]).trim()) parts.push(String(e[k]));
  }
  const params = e.params;
  if (params && typeof params === "object") {
    const p = /** @type {Record<string, unknown>} */ (params);
    for (const k of ["kind", "patternFamily", "operation", "conceptTag", "diagnosticSkillId", "semanticFamily"]) {
      if (p[k] != null && String(p[k]).trim()) parts.push(String(p[k]));
    }
    try {
      parts.push(JSON.stringify(p).toLowerCase());
    } catch {
      /* ignore */
    }
    const contract = p.contract;
    if (contract && typeof contract === "object") {
      try {
        parts.push(JSON.stringify(contract).toLowerCase());
      } catch {
        /* ignore */
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Grade / level only — avoids bucket/topic literals skewing scores.
 *
 * @param {unknown} row
 * @returns {string}
 */
function rowGradeLevelHaystack(row) {
  const parts = [];
  if (row && typeof row === "object") {
    const r = /** @type {Record<string, unknown>} */ (row);
    for (const k of ["levelKey", "gradeKey"]) {
      if (r[k] != null && String(r[k]).trim()) parts.push(String(r[k]).toLowerCase());
    }
  }
  return parts.join(" ");
}

/**
 * @param {string} hay
 * @param {readonly string[]} phrases
 * @returns {number}
 */
function countIndicatorHits(hay, phrases) {
  let n = 0;
  for (const ph of phrases) {
    if (!ph) continue;
    if (hay.includes(ph)) n += 1;
  }
  return n;
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ g01Score: number; g03Score: number }}
 */
export function geometryQuadrilateralRoutingScores(wrongEvents, row) {
  const rowHay = rowGradeLevelHaystack(row);
  let g01Score = 0;
  let g03Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  for (const ev of list) {
    const wh = `${rowHay} ${haystackForWrong(ev)}`.trim().toLowerCase();
    g01Score += countIndicatorHits(wh, G01_INDICATORS);
    g03Score += countIndicatorHits(wh, G03_INDICATORS);
  }
  return { g01Score, g03Score };
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ g03Score: number; g08Score: number }}
 */
export function geometryAreaRoutingScores(wrongEvents, row) {
  const rowHay = rowGradeLevelHaystack(row);
  const g08Indicators = g08IndicatorsForRow(row);
  let g03Score = 0;
  let g08Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  for (const ev of list) {
    const wh = `${rowHay} ${haystackForWrong(ev)}`.trim().toLowerCase();
    g03Score += countIndicatorHits(wh, G03_INDICATORS);
    g08Score += countIndicatorHits(wh, g08Indicators);
  }
  return { g03Score, g08Score };
}

/**
 * @param {string[]} candidateIds
 * @param {string} a
 * @param {string} b
 * @param {boolean} preferA
 * @param {boolean} preferB
 * @returns {string[]}
 */
function reorderConflictPair(candidateIds, a, b, preferA, preferB) {
  const rest = candidateIds.filter((id) => id !== a && id !== b);
  if (preferA && !preferB) return [a, b, ...rest];
  if (preferB && !preferA) return [b, a, ...rest];
  return [...candidateIds];
}

/**
 * Reorders G-01/G-03 on `quadrilaterals`, and G-03/G-08 on `area`, when both appear.
 *
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {string[]}
 */
export function orderGeometryTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return candidateIds ? [...candidateIds] : [];
  const bucketKey = String(ctx.bucketKey || "").trim();

  if (bucketKey === "quadrilaterals") {
    const has1 = candidateIds.includes("G-01");
    const has3 = candidateIds.includes("G-03");
    if (has1 && has3) {
      const { g01Score, g03Score } = geometryQuadrilateralRoutingScores(wrongEvents, ctx.row);
      if (g01Score > g03Score) {
        return reorderConflictPair(candidateIds, "G-01", "G-03", true, false);
      }
      if (g03Score > g01Score) {
        return reorderConflictPair(candidateIds, "G-01", "G-03", false, true);
      }
      return [...candidateIds];
    }
  }

  if (bucketKey === "area") {
    const has3 = candidateIds.includes("G-03");
    const has8 = candidateIds.includes("G-08");
    if (has3 && has8) {
      const { g03Score, g08Score } = geometryAreaRoutingScores(wrongEvents, ctx.row);
      if (g08Score > g03Score) {
        return reorderConflictPair(candidateIds, "G-03", "G-08", false, true);
      }
      if (g03Score > g08Score) {
        return reorderConflictPair(candidateIds, "G-03", "G-08", true, false);
      }
      return [...candidateIds];
    }
  }

  return [...candidateIds];
}
