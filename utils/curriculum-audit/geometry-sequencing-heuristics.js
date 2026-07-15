/**
 * Geometry sequencing / depth flags — advisory. Cross-checks inventory vs product GRADES + grade bands.
 */
import { GRADES } from "../geometry-constants.js";
import { minGradeForTopicKey, maxGradeForTopicKey } from "../geometry-grade-topic-policy.js";

/** Normalized curriculum key → geometry-constants topic id (best-effort) */
const NORM_TO_TOPIC = {
  "geometry.shape_recognition_plane_figures": "shapes_basic",
  "geometry.polygons_quadrilaterals": "quadrilaterals",
  "geometry.triangles": "triangles",
  "geometry.area": "area",
  "geometry.perimeter": "perimeter",
  "geometry.volume": "volume",
  "geometry.solids_3d": "solids",
  "geometry.angles": "angles",
  "geometry.parallel_perpendicular_spatial": "parallel_perpendicular",
  "geometry.transformations_symmetry": "transformations",
  "geometry.tiling_covering": "tiling",
  "geometry.diagonals_properties": "diagonal",
  "geometry.heights_area_links": "heights",
  "geometry.circle_basic": "circles",
  "geometry.pythagoras_right_triangles": "pythagoras",
  "geometry.mixed_review": "mixed",
};

/** One norm key may cover several UI topic ids */
const NORM_TOPIC_ALIASES = {
  "geometry.transformations_symmetry": ["transformations", "rotation", "symmetry"],
};

function productGradeHasNorm(gk, normKey) {
  const aliases = NORM_TOPIC_ALIASES[normKey];
  const topics = GRADES[gk]?.topics || [];
  if (aliases) return aliases.some((id) => topics.includes(id));
  const single = NORM_TO_TOPIC[normKey];
  return single ? topics.includes(single) : false;
}

function primaryTopicIdForNorm(normKey) {
  return NORM_TO_TOPIC[normKey] || null;
}

/**
 * @param {object} invRecord inventory row
 * @param {string} normKey normalized topic key
 * @returns {Array<{ code: string, severity: string, note: string }>}
 */
export function geometrySequencingSuspicions(invRecord, normKey) {
  /** @type {Array<{ code: string, severity: string, note: string }>} */
  const flags = [];

  const gmin = Number(invRecord?.gradeMin);
  if (!Number.isFinite(gmin) || gmin < 1 || gmin > 6) return flags;

  const gk = `g${gmin}`;
  const topicId = primaryTopicIdForNorm(normKey);

  if (String(normKey || "").startsWith("geometry.") && !productGradeHasNorm(gk, normKey)) {
    flags.push({
      code: "topic_not_in_product_grade",
      severity: "high",
      note: `מפתח מנורמל ${normKey} לא תואם נושאים זמינים ב-${gk} - ייתכן מאגר/מטא-דאטה ישן או כיתה שגויה.`,
    });
  }

  if (topicId) {
    const aliasList = NORM_TOPIC_ALIASES[normKey];
    const topicIdsForMin = aliasList || [topicId];
    let minG = 99;
    let maxG = 0;
    for (const tid of topicIdsForMin) {
      const a = minGradeForTopicKey(tid);
      const b = maxGradeForTopicKey(tid);
      if (a != null) minG = Math.min(minG, a);
      if (b != null) maxG = Math.max(maxG, b);
    }
    if (minG !== 99 && gmin < minG) {
      flags.push({
        code: "topic_too_early_for_spine",
        severity: "high",
        note: `כיתה ${gmin} לפני רצף המוצר לנושאי "${normKey}" (מינימום כיתה ${minG}).`,
      });
    }
    if (maxG > 0 && gmin > maxG) {
      flags.push({
        code: "topic_unusual_late_row",
        severity: "medium",
        note: `כיתה ${gmin} אחרי טווח הנושא "${normKey}" במוצר (עד כיתה ${maxG}) - לא בהכרח שגיאה.`,
      });
    }
  }

  if (!topicId && String(normKey || "").startsWith("geometry.")) {
    flags.push({
      code: "depth_unclear_norm_mapping",
      severity: "low",
      note: `אין מיפוי נושא מוצר ל-${normKey} - לבדוק מנורמל והרחבת מפת NORM_TO_TOPIC.`,
    });
  }

  /** Enrichment-tier topics */
  if (normKey === "geometry.tiling_covering" && gmin <= 3) {
    flags.push({
      code: "tiling_usually_enrichment_early",
      severity: "low",
      note: "ריצוף לרוב מדורג כהעשרה בשכבות נמוכות - לאמת מול PDF.",
    });
  }

  return flags;
}
