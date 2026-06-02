/**
 * Phase 7.9 — grade spans for curriculum spine math/geometry kind rows.
 * Truth: utils/math-constants.js GRADES + utils/math-question-generator.js kind branches;
 *        utils/geometry-constants.js GRADES/topics + TOPIC_SHAPES via getShapesForTopic,
 *        aligned to utils/geometry-question-generator.js switch(selectedTopic).
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TRIANGLE_AREA_FORMULA_MIN_GRADE } from "../utils/geometry-curriculum-gates.js";

const __bindDir = path.dirname(fileURLToPath(import.meta.url));
const _geoHref = pathToFileURL(path.join(__bindDir, "..", "utils", "geometry-constants.js")).href;
const { GRADES: GEO_GRADES, getShapesForTopic } = await import(_geoHref);

const GEO_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

function spanFromNums(nums) {
  if (!nums.length) return null;
  return { minGrade: Math.min(...nums), maxGrade: Math.max(...nums) };
}

function geoTopicShapeSpan(topic, shape) {
  const nums = [];
  for (const gk of GEO_KEYS) {
    if (!GEO_GRADES[gk]?.topics?.includes(topic)) continue;
    const shapes = getShapesForTopic(gk, topic);
    if (shapes.includes(shape)) nums.push(Number.parseInt(gk.slice(1), 10));
  }
  return spanFromNums(nums);
}

function geoTopicSpan(topic) {
  const nums = [];
  for (const gk of GEO_KEYS) {
    if (GEO_GRADES[gk]?.topics?.includes(topic)) nums.push(Number.parseInt(gk.slice(1), 10));
  }
  return spanFromNums(nums);
}

/** @returns {{ minGrade: number, maxGrade: number } | null} */
export function geometryKindGradeSpan(kind) {
  switch (kind) {
    case "no_question":
      return { minGrade: 1, maxGrade: 6 };
    case "square_area":
      return geoTopicShapeSpan("area", "square");
    case "triangle_area":
      return { minGrade: TRIANGLE_AREA_FORMULA_MIN_GRADE, maxGrade: 6 };
    case "parallelogram_area":
      return geoTopicShapeSpan("area", "parallelogram");
    case "trapezoid_area":
      return geoTopicShapeSpan("area", "trapezoid");
    case "circle_area": {
      const a = geoTopicShapeSpan("area", "circle");
      const c = geoTopicSpan("circles");
      if (a && c) {
        const lo = Math.max(a.minGrade, c.minGrade);
        const hi = Math.min(a.maxGrade, c.maxGrade);
        if (lo <= hi) return { minGrade: lo, maxGrade: hi };
      }
      return a || c || { minGrade: 6, maxGrade: 6 };
    }
    case "square_perimeter":
      return geoTopicShapeSpan("perimeter", "square");
    case "triangle_perimeter":
      return geoTopicShapeSpan("perimeter", "triangle");
    case "circle_perimeter": {
      const p = geoTopicShapeSpan("perimeter", "circle");
      const c = geoTopicSpan("circles");
      if (p && c) {
        const lo = Math.max(p.minGrade, c.minGrade);
        const hi = Math.min(p.maxGrade, c.maxGrade);
        if (lo <= hi) return { minGrade: lo, maxGrade: hi };
      }
      return p || c || { minGrade: 6, maxGrade: 6 };
    }
    case "rectangular_prism_volume":
      return geoTopicShapeSpan("volume", "rectangular_prism");
    case "cylinder_volume":
      return geoTopicShapeSpan("volume", "cylinder");
    case "sphere_volume":
      return geoTopicShapeSpan("volume", "sphere");
    case "cone_volume":
      return geoTopicShapeSpan("volume", "cone");
    case "pyramid_volume_square":
    case "pyramid_volume_rectangular":
      return geoTopicShapeSpan("volume", "pyramid");
    case "prism_volume_triangle":
    case "prism_volume_rectangular":
      return geoTopicShapeSpan("volume", "prism");
    case "diagonal_square":
      return geoTopicShapeSpan("diagonal", "square");
    case "diagonal_rectangle":
      return geoTopicShapeSpan("diagonal", "rectangle");
    case "diagonal_parallelogram":
      return geoTopicShapeSpan("diagonal", "parallelogram");
    case "heights_triangle":
      return geoTopicShapeSpan("heights", "triangle");
    case "heights_parallelogram":
      return geoTopicShapeSpan("heights", "parallelogram");
    case "heights_trapezoid":
      return geoTopicShapeSpan("heights", "trapezoid");
    case "parallel_perpendicular":
      return geoTopicSpan("parallel_perpendicular");
    case "triangles":
      return geoTopicSpan("triangles");
    case "quadrilaterals":
      return geoTopicSpan("quadrilaterals");
    case "transformations":
      return geoTopicSpan("transformations");
    case "rotation":
      return geoTopicSpan("rotation");
    case "symmetry":
      return geoTopicSpan("symmetry");
    case "tiling":
      return geoTopicSpan("tiling");
    case "triangle_angles":
      return geoTopicSpan("angles");
    case "pythagoras_hyp":
    case "pythagoras_leg":
      return geoTopicSpan("pythagoras");
    case "solids":
      return geoTopicSpan("solids");
    case "shapes_basic_square":
    case "shapes_basic_rectangle":
      return { minGrade: 1, maxGrade: 1 };
    case "shapes_basic_properties_square":
    case "shapes_basic_properties_rectangle":
    case "shapes_basic_properties_angles":
      return { minGrade: 4, maxGrade: 4 };
    default:
      return null;
  }
}

/**
 * Static bounds from `utils/math-question-generator.js` traced against
 * `utils/math-constants.js` GRADES[].operations (which ops exist per grade).
 * @type {Record<string, { minGrade: number, maxGrade: number }>}
 */
export const MATH_KIND_GRADE_SPAN = {
  add_second_decade: { minGrade: 1, maxGrade: 1 },
  add_tens_only: { minGrade: 1, maxGrade: 1 },
  add_three: { minGrade: 3, maxGrade: 6 },
  add_two: { minGrade: 1, maxGrade: 6 },
  add_vertical: { minGrade: 2, maxGrade: 2 },
  cmp: { minGrade: 1, maxGrade: 6 },
  dec_add: { minGrade: 3, maxGrade: 6 },
  dec_sub: { minGrade: 3, maxGrade: 6 },
  dec_divide: { minGrade: 6, maxGrade: 6 },
  dec_divide_10_100: { minGrade: 6, maxGrade: 6 },
  dec_multiply: { minGrade: 6, maxGrade: 6 },
  dec_multiply_10_100: { minGrade: 6, maxGrade: 6 },
  dec_repeating: { minGrade: 6, maxGrade: 6 },
  div: { minGrade: 2, maxGrade: 6 },
  div_long: { minGrade: 4, maxGrade: 4 },
  div_two_digit: { minGrade: 5, maxGrade: 5 },
  div_with_remainder: { minGrade: 3, maxGrade: 6 },
  divisibility: { minGrade: 2, maxGrade: 4 },
  eq_add: { minGrade: 3, maxGrade: 6 },
  eq_add_simple: { minGrade: 1, maxGrade: 1 },
  eq_div: { minGrade: 5, maxGrade: 6 },
  eq_mul: { minGrade: 5, maxGrade: 6 },
  eq_sub: { minGrade: 3, maxGrade: 6 },
  eq_sub_simple: { minGrade: 1, maxGrade: 1 },
  est_add: { minGrade: 4, maxGrade: 5 },
  est_mul: { minGrade: 4, maxGrade: 5 },
  est_quantity: { minGrade: 4, maxGrade: 5 },
  fm_factor: { minGrade: 4, maxGrade: 6 },
  fm_gcd: { minGrade: 4, maxGrade: 6 },
  fm_multiple: { minGrade: 4, maxGrade: 6 },
  frac_add_sub: { minGrade: 5, maxGrade: 5 },
  frac_as_division: { minGrade: 6, maxGrade: 6 },
  frac_divide: { minGrade: 6, maxGrade: 6 },
  frac_expand: { minGrade: 5, maxGrade: 5 },
  frac_half: { minGrade: 2, maxGrade: 2 },
  frac_half_reverse: { minGrade: 2, maxGrade: 2 },
  frac_multiply: { minGrade: 6, maxGrade: 6 },
  frac_quarter: { minGrade: 2, maxGrade: 2 },
  frac_quarter_reverse: { minGrade: 2, maxGrade: 2 },
  frac_reduce: { minGrade: 5, maxGrade: 5 },
  frac_to_mixed: { minGrade: 5, maxGrade: 5 },
  mixed_to_frac: { minGrade: 5, maxGrade: 5 },
  mul: { minGrade: 1, maxGrade: 6 },
  mul_hundreds: { minGrade: 3, maxGrade: 3 },
  mul_tens: { minGrade: 3, maxGrade: 3 },
  mul_vertical: { minGrade: 4, maxGrade: 4 },
  ns_complement10: { minGrade: 1, maxGrade: 4 },
  ns_complement100: { minGrade: 3, maxGrade: 6 },
  ns_counting_backward: { minGrade: 1, maxGrade: 1 },
  ns_counting_forward: { minGrade: 1, maxGrade: 1 },
  ns_even_odd: { minGrade: 1, maxGrade: 4 },
  ns_neighbors: { minGrade: 1, maxGrade: 6 },
  ns_number_line: { minGrade: 1, maxGrade: 1 },
  ns_place_hundreds: { minGrade: 3, maxGrade: 6 },
  ns_place_tens_units: { minGrade: 1, maxGrade: 2 },
  one_mul: { minGrade: 4, maxGrade: 4 },
  order_add_mul: { minGrade: 3, maxGrade: 3 },
  order_mul_sub: { minGrade: 3, maxGrade: 3 },
  order_parentheses: { minGrade: 3, maxGrade: 3 },
  perc_discount: { minGrade: 5, maxGrade: 6 },
  perc_part_of: { minGrade: 5, maxGrade: 6 },
  power_base: { minGrade: 4, maxGrade: 4 },
  power_calc: { minGrade: 4, maxGrade: 4 },
  prime_composite: { minGrade: 4, maxGrade: 4 },
  ratio_find: { minGrade: 6, maxGrade: 6 },
  ratio_first: { minGrade: 6, maxGrade: 6 },
  ratio_second: { minGrade: 6, maxGrade: 6 },
  round: { minGrade: 4, maxGrade: 6 },
  scale_find: { minGrade: 6, maxGrade: 6 },
  scale_map_to_real: { minGrade: 6, maxGrade: 6 },
  scale_real_to_map: { minGrade: 6, maxGrade: 6 },
  sequence: { minGrade: 3, maxGrade: 6 },
  sub_two: { minGrade: 1, maxGrade: 6 },
  sub_vertical: { minGrade: 2, maxGrade: 2 },
  wp_coins: { minGrade: 1, maxGrade: 2 },
  wp_coins_spent: { minGrade: 1, maxGrade: 2 },
  wp_comparison_more: { minGrade: 3, maxGrade: 6 },
  wp_distance_time: { minGrade: 5, maxGrade: 6 },
  wp_division_simple: { minGrade: 2, maxGrade: 2 },
  wp_groups_g2: { minGrade: 2, maxGrade: 2 },
  wp_leftover: { minGrade: 3, maxGrade: 6 },
  wp_multi_step: { minGrade: 5, maxGrade: 5 },
  wp_shop_discount: { minGrade: 5, maxGrade: 6 },
  wp_time_date: { minGrade: 1, maxGrade: 2 },
  wp_time_days: { minGrade: 1, maxGrade: 2 },
  wp_time_sum: { minGrade: 3, maxGrade: 6 },
  wp_unit_cm_to_m: { minGrade: 5, maxGrade: 6 },
  wp_unit_g_to_kg: { minGrade: 5, maxGrade: 6 },
  zero_add: { minGrade: 4, maxGrade: 4 },
  zero_mul: { minGrade: 4, maxGrade: 4 },
  zero_sub: { minGrade: 4, maxGrade: 4 },
};

export const MATH_GRADE_TRUTH =
  "utils/math-constants.js GRADES[].operations (per-grade ops) + conditional kind branches in utils/math-question-generator.js";

export const GEOMETRY_GRADE_TRUTH =
  "utils/geometry-constants.js GRADES[].topics, TOPIC_SHAPES, getShapesForTopic(); case/topic→kind mapping in utils/geometry-question-generator.js";

