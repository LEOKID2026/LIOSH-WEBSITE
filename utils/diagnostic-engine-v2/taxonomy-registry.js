import { MATH_TAXONOMY_ROWS } from "./taxonomy-math.js";
import { GEOMETRY_TAXONOMY_ROWS } from "./taxonomy-geometry.js";
import { HEBREW_TAXONOMY_ROWS } from "./taxonomy-hebrew.js";
import { ENGLISH_TAXONOMY_ROWS } from "./taxonomy-english.js";
import { SCIENCE_TAXONOMY_ROWS } from "./taxonomy-science.js";
import { MOLEDET_TAXONOMY_ROWS } from "./taxonomy-moledet.js";
import { HISTORY_TAXONOMY_ROWS } from "./taxonomy-history.js";

/** @type {import("./taxonomy-types.js").TaxonomyRow[]} */
export const ALL_TAXONOMY_ROWS = [
  ...MATH_TAXONOMY_ROWS,
  ...GEOMETRY_TAXONOMY_ROWS,
  ...HEBREW_TAXONOMY_ROWS,
  ...ENGLISH_TAXONOMY_ROWS,
  ...SCIENCE_TAXONOMY_ROWS,
  ...MOLEDET_TAXONOMY_ROWS,
  ...HISTORY_TAXONOMY_ROWS,
];

/** @type {Record<string, import("./taxonomy-types.js").TaxonomyRow>} */
export const TAXONOMY_BY_ID = ALL_TAXONOMY_ROWS.reduce((acc, row) => {
  acc[row.id] = row;
  return acc;
}, {});

/**
 * @param {import("./subject-ids.js").SubjectId} subjectId
 * @returns {import("./taxonomy-types.js").TaxonomyRow[]}
 */
export function taxonomyRowsForSubject(subjectId) {
  return ALL_TAXONOMY_ROWS.filter((r) => r.subjectId === subjectId);
}
