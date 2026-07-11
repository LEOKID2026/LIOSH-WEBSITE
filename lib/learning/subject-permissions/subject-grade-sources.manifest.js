import { SUBJECT_PERMISSION_KEYS } from "./subject-key-map.js";
import { SUBJECT_PERMISSION_LABELS_HE } from "./subject-permission-labels.he.js";

/** @type {readonly string[]} */
export const REGISTERED_GRADE_KEYS = Object.freeze(["g1", "g2", "g3", "g4", "g5", "g6"]);

/**
 * Source manifest for resolver build only — not used at runtime for enforcement.
 * @type {Array<{
 *   subjectKey: string,
 *   displayNameHe: string,
 *   sortOrder: number,
 *   primarySources: Array<{ exportName: string, module: string }>,
 *   secondarySources: Array<{ exportName: string, module: string }>,
 *   architecturalNotes?: string[],
 * }>}
 */
export const SUBJECT_GRADE_SOURCE_MANIFEST = [
  {
    subjectKey: "math",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.math,
    sortOrder: 1,
    primarySources: [{ exportName: "GRADES", module: "utils/math-constants.js" }],
    secondarySources: [
      { exportName: "LEARNING_BOOK_META_LIST", module: "lib/learning-book/learning-book-catalog-meta.js" },
    ],
  },
  {
    subjectKey: "geometry",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.geometry,
    sortOrder: 2,
    primarySources: [{ exportName: "GRADES", module: "utils/geometry-constants.js" }],
    secondarySources: [
      { exportName: "LEARNING_BOOK_META_LIST", module: "lib/learning-book/learning-book-catalog-meta.js" },
    ],
  },
  {
    subjectKey: "hebrew",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.hebrew,
    sortOrder: 3,
    primarySources: [
      { exportName: "HEBREW_GRADE_ORDER", module: "data/hebrew-curriculum.js" },
    ],
    secondarySources: [{ exportName: "GRADES", module: "utils/hebrew-constants.js" }],
  },
  {
    subjectKey: "english",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.english,
    sortOrder: 4,
    primarySources: [
      { exportName: "ENGLISH_GRADE_ORDER", module: "data/english-curriculum.js" },
    ],
    secondarySources: [
      { exportName: "LEARNING_BOOK_META_LIST", module: "lib/learning-book/learning-book-catalog-meta.js" },
    ],
  },
  {
    subjectKey: "science",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.science,
    sortOrder: 5,
    primarySources: [
      { exportName: "SCIENCE_GRADE_ORDER", module: "data/science-curriculum.js" },
    ],
    secondarySources: [
      { exportName: "LEARNING_BOOK_META_LIST", module: "lib/learning-book/learning-book-catalog-meta.js" },
    ],
  },
  {
    subjectKey: "history",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.history,
    sortOrder: 6,
    primarySources: [
      { exportName: "HISTORY_GRADE_ORDER", module: "data/history-curriculum.js" },
    ],
    secondarySources: [
      { exportName: "HISTORY_TEACH_GRADE_KEY", module: "utils/history-curriculum-gates.js" },
    ],
    architecturalNotes: ["Home hub shows history tile for all grades; teachable is g6 only."],
  },
  {
    subjectKey: "moledet",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.moledet,
    sortOrder: 7,
    primarySources: [
      { exportName: "MOLEDET_TEACHABLE_GRADE_ORDER", module: "data/moledet-curriculum.js" },
    ],
    secondarySources: [
      { exportName: "MOLEDET_CATALOG_GRADE_KEYS", module: "lib/learning-shared/moledet-geography-display.js" },
    ],
    architecturalNotes: ["Separate permission from geography; engine uses moledet_geography."],
  },
  {
    subjectKey: "geography",
    displayNameHe: SUBJECT_PERMISSION_LABELS_HE.geography,
    sortOrder: 8,
    primarySources: [
      {
        exportName: "GEOGRAPHY_SUBJECT_TEACHABLE_GRADE_ORDER",
        module: "data/geography-subject-curriculum.js",
      },
    ],
    secondarySources: [
      { exportName: "GEOGRAPHY_CATALOG_GRADE_KEYS", module: "lib/learning-shared/moledet-geography-display.js" },
    ],
    architecturalNotes: ["Not in LEARNING_SUBJECT_ALLOWLIST; enforcement via subject-key-map."],
  },
];

export { SUBJECT_PERMISSION_KEYS };
