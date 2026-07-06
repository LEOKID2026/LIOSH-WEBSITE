/**
 * Client-safe learning book metadata (no Node fs imports).
 */

import { MATH_G1_BOOK_META } from "./math-g1-registry.js";
import { MATH_G2_BOOK_META } from "./math-g2-registry.js";
import { MATH_G3_BOOK_META } from "./math-g3-registry.js";
import { MATH_G4_BOOK_META } from "./math-g4-registry.js";
import { MATH_G5_BOOK_META } from "./math-g5-registry.js";
import { MATH_G6_BOOK_META } from "./math-g6-registry.js";
import { GEOMETRY_G1_BOOK_META } from "./geometry-g1-registry.js";
import { GEOMETRY_G2_BOOK_META } from "./geometry-g2-registry.js";
import { GEOMETRY_G3_BOOK_META } from "./geometry-g3-registry.js";
import { GEOMETRY_G4_BOOK_META } from "./geometry-g4-registry.js";
import { GEOMETRY_G5_BOOK_META } from "./geometry-g5-registry.js";
import { GEOMETRY_G6_BOOK_META } from "./geometry-g6-registry.js";
import { SCIENCE_G1_BOOK_META } from "./science-g1-registry.js";
import { SCIENCE_G2_BOOK_META } from "./science-g2-registry.js";
import { SCIENCE_G3_BOOK_META } from "./science-g3-registry.js";
import { SCIENCE_G4_BOOK_META } from "./science-g4-registry.js";
import { SCIENCE_G5_BOOK_META } from "./science-g5-registry.js";
import { SCIENCE_G6_BOOK_META } from "./science-g6-registry.js";
import { HEBREW_G1_BOOK_META } from "./hebrew-g1-registry.js";
import { HEBREW_G2_BOOK_META } from "./hebrew-g2-registry.js";
import { HEBREW_G3_BOOK_META } from "./hebrew-g3-registry.js";
import { HEBREW_G4_BOOK_META } from "./hebrew-g4-registry.js";
import { HEBREW_G5_BOOK_META } from "./hebrew-g5-registry.js";
import { HEBREW_G6_BOOK_META } from "./hebrew-g6-registry.js";
import { ENGLISH_G1_BOOK_META } from "./english-g1-registry.js";
import { ENGLISH_G2_BOOK_META } from "./english-g2-registry.js";
import { ENGLISH_G3_BOOK_META } from "./english-g3-registry.js";
import { ENGLISH_G4_BOOK_META } from "./english-g4-registry.js";
import { ENGLISH_G5_BOOK_META } from "./english-g5-registry.js";
import { ENGLISH_G6_BOOK_META } from "./english-g6-registry.js";
import { MOLEDET_G2_BOOK_META } from "./moledet-g2-registry.js";
import { MOLEDET_G3_BOOK_META } from "./moledet-g3-registry.js";
import { MOLEDET_G4_BOOK_META } from "./moledet-g4-registry.js";
import { GEOGRAPHY_G5_BOOK_META } from "./geography-g5-registry.js";
import { GEOGRAPHY_G6_BOOK_META } from "./geography-g6-registry.js";
import { HISTORY_G6_BOOK_META } from "./history-g6-registry.js";
import { getGradeShortLabel } from "./learning-book-grade-labels.js";

/** @typedef {"authored"|"placeholder"|"prepared"} BookContentStatus */

/**
 * @param {string} subject
 * @param {string} grade
 */
export function getLearningBookKey(subject, grade) {
  return `${String(subject).toLowerCase()}:${String(grade).toLowerCase()}`;
}

/**
 * @param {string} subject
 */
export function getLearningBookSubjectLabelHe(subject) {
  const key = String(subject || "").toLowerCase();
  if (key === "geometry") return "גאומטריה";
  if (key === "science") return "מדעים";
  if (key === "hebrew") return "עברית";
  if (key === "english") return "אנגלית";
  if (key === "moledet") return "מולדת";
  if (key === "geography") return "גאוגרפיה";
  if (key === "history") return "היסטוריה";
  return "מתמטיקה";
}

/**
 * @param {string} subject
 * @param {{ studentScoped?: boolean }} [options]
 */
export function getLearningBookMasterPath(subject, options = {}) {
  const studentScoped = options?.studentScoped === true;
  const key = String(subject || "").toLowerCase();
  if (studentScoped) {
    return "/student/learning";
  }
  if (key === "geometry") return "/learning/geometry-master";
  if (key === "science") return "/learning/science-master";
  if (key === "hebrew") return "/learning/hebrew-master";
  if (key === "english") return "/learning/english-master";
  if (key === "moledet") return "/learning/moledet-master";
  if (key === "geography") return "/learning/geography-master";
  if (key === "history") return "/learning/history-master";
  return "/learning/math-master";
}

/** @type {Record<string, { subject: string, grade: string, status: BookContentStatus, meta: Record<string, unknown> }>} */
export const LEARNING_BOOK_META_BY_KEY = (() => {
  /** @type {Record<string, { subject: string, grade: string, status: BookContentStatus, meta: Record<string, unknown> }>} */
  const map = {};

  map[getLearningBookKey("math", "g1")] = {
    subject: "math",
    grade: "g1",
    status: "authored",
    meta: { ...MATH_G1_BOOK_META, subjectTitleHe: "מתמטיקה" },
  };
  map[getLearningBookKey("math", "g2")] = {
    subject: "math",
    grade: "g2",
    status: "authored",
    meta: { ...MATH_G2_BOOK_META, subjectTitleHe: "מתמטיקה" },
  };
  map[getLearningBookKey("math", "g3")] = {
    subject: "math",
    grade: "g3",
    status: "authored",
    meta: { ...MATH_G3_BOOK_META, subjectTitleHe: "מתמטיקה" },
  };
  map[getLearningBookKey("math", "g4")] = {
    subject: "math",
    grade: "g4",
    status: "authored",
    meta: { ...MATH_G4_BOOK_META, subjectTitleHe: "מתמטיקה" },
  };
  map[getLearningBookKey("math", "g5")] = {
    subject: "math",
    grade: "g5",
    status: "authored",
    meta: { ...MATH_G5_BOOK_META, subjectTitleHe: "מתמטיקה" },
  };
  map[getLearningBookKey("math", "g6")] = {
    subject: "math",
    grade: "g6",
    status: "authored",
    meta: { ...MATH_G6_BOOK_META, subjectTitleHe: "מתמטיקה" },
  };

  map[getLearningBookKey("geometry", "g1")] = {
    subject: "geometry",
    grade: "g1",
    status: "authored",
    meta: { ...GEOMETRY_G1_BOOK_META, subjectTitleHe: "גאומטריה" },
  };

  map[getLearningBookKey("geometry", "g2")] = {
    subject: "geometry",
    grade: "g2",
    status: "authored",
    meta: { ...GEOMETRY_G2_BOOK_META, subjectTitleHe: "גאומטריה" },
  };

  map[getLearningBookKey("geometry", "g3")] = {
    subject: "geometry",
    grade: "g3",
    status: "authored",
    meta: { ...GEOMETRY_G3_BOOK_META, subjectTitleHe: "גאומטריה" },
  };

  map[getLearningBookKey("geometry", "g4")] = {
    subject: "geometry",
    grade: "g4",
    status: "authored",
    meta: { ...GEOMETRY_G4_BOOK_META, subjectTitleHe: "גאומטריה" },
  };

  map[getLearningBookKey("geometry", "g5")] = {
    subject: "geometry",
    grade: "g5",
    status: "authored",
    meta: { ...GEOMETRY_G5_BOOK_META, subjectTitleHe: "גאומטריה" },
  };

  map[getLearningBookKey("geometry", "g6")] = {
    subject: "geometry",
    grade: "g6",
    status: "authored",
    meta: { ...GEOMETRY_G6_BOOK_META, subjectTitleHe: "גאומטריה" },
  };

  map[getLearningBookKey("science", "g1")] = {
    subject: "science",
    grade: "g1",
    status: "authored",
    meta: { ...SCIENCE_G1_BOOK_META, subjectTitleHe: "מדעים" },
  };

  map[getLearningBookKey("science", "g2")] = {
    subject: "science",
    grade: "g2",
    status: "authored",
    meta: { ...SCIENCE_G2_BOOK_META, subjectTitleHe: "מדעים" },
  };

  map[getLearningBookKey("science", "g3")] = {
    subject: "science",
    grade: "g3",
    status: "authored",
    meta: { ...SCIENCE_G3_BOOK_META, subjectTitleHe: "מדעים" },
  };

  map[getLearningBookKey("science", "g4")] = {
    subject: "science",
    grade: "g4",
    status: "authored",
    meta: { ...SCIENCE_G4_BOOK_META, subjectTitleHe: "מדעים" },
  };

  map[getLearningBookKey("science", "g5")] = {
    subject: "science",
    grade: "g5",
    status: "authored",
    meta: { ...SCIENCE_G5_BOOK_META, subjectTitleHe: "מדעים" },
  };

  map[getLearningBookKey("science", "g6")] = {
    subject: "science",
    grade: "g6",
    status: "authored",
    meta: { ...SCIENCE_G6_BOOK_META, subjectTitleHe: "מדעים" },
  };

  map[getLearningBookKey("hebrew", "g1")] = {
    subject: "hebrew",
    grade: "g1",
    status: "authored",
    meta: { ...HEBREW_G1_BOOK_META, subjectTitleHe: "עברית" },
  };

  map[getLearningBookKey("hebrew", "g2")] = {
    subject: "hebrew",
    grade: "g2",
    status: "authored",
    meta: { ...HEBREW_G2_BOOK_META, subjectTitleHe: "עברית" },
  };

  map[getLearningBookKey("hebrew", "g3")] = {
    subject: "hebrew",
    grade: "g3",
    status: "authored",
    meta: { ...HEBREW_G3_BOOK_META, subjectTitleHe: "עברית" },
  };

  map[getLearningBookKey("hebrew", "g4")] = {
    subject: "hebrew",
    grade: "g4",
    status: "authored",
    meta: { ...HEBREW_G4_BOOK_META, subjectTitleHe: "עברית" },
  };

  map[getLearningBookKey("hebrew", "g5")] = {
    subject: "hebrew",
    grade: "g5",
    status: "authored",
    meta: { ...HEBREW_G5_BOOK_META, subjectTitleHe: "עברית" },
  };

  map[getLearningBookKey("hebrew", "g6")] = {
    subject: "hebrew",
    grade: "g6",
    status: "authored",
    meta: { ...HEBREW_G6_BOOK_META, subjectTitleHe: "עברית" },
  };

  map[getLearningBookKey("english", "g1")] = {
    subject: "english",
    grade: "g1",
    status: "authored",
    meta: { ...ENGLISH_G1_BOOK_META, subjectTitleHe: "אנגלית" },
  };

  map[getLearningBookKey("english", "g2")] = {
    subject: "english",
    grade: "g2",
    status: "authored",
    meta: { ...ENGLISH_G2_BOOK_META, subjectTitleHe: "אנגלית" },
  };

  map[getLearningBookKey("english", "g3")] = {
    subject: "english",
    grade: "g3",
    status: "authored",
    meta: { ...ENGLISH_G3_BOOK_META, subjectTitleHe: "אנגלית" },
  };

  map[getLearningBookKey("english", "g4")] = {
    subject: "english",
    grade: "g4",
    status: "authored",
    meta: { ...ENGLISH_G4_BOOK_META, subjectTitleHe: "אנגלית" },
  };

  map[getLearningBookKey("english", "g5")] = {
    subject: "english",
    grade: "g5",
    status: "authored",
    meta: { ...ENGLISH_G5_BOOK_META, subjectTitleHe: "אנגלית" },
  };

  map[getLearningBookKey("english", "g6")] = {
    subject: "english",
    grade: "g6",
    status: "authored",
    meta: { ...ENGLISH_G6_BOOK_META, subjectTitleHe: "אנגלית" },
  };

  map[getLearningBookKey("moledet", "g2")] = {
    subject: "moledet",
    grade: "g2",
    status: "authored",
    meta: { ...MOLEDET_G2_BOOK_META, subjectTitleHe: "מולדת" },
  };
  map[getLearningBookKey("moledet", "g3")] = {
    subject: "moledet",
    grade: "g3",
    status: "authored",
    meta: { ...MOLEDET_G3_BOOK_META, subjectTitleHe: "מולדת" },
  };
  map[getLearningBookKey("moledet", "g4")] = {
    subject: "moledet",
    grade: "g4",
    status: "authored",
    meta: { ...MOLEDET_G4_BOOK_META, subjectTitleHe: "מולדת" },
  };
  map[getLearningBookKey("geography", "g5")] = {
    subject: "geography",
    grade: "g5",
    status: "authored",
    meta: { ...GEOGRAPHY_G5_BOOK_META, subjectTitleHe: "גאוגרפיה" },
  };
  map[getLearningBookKey("geography", "g6")] = {
    subject: "geography",
    grade: "g6",
    status: "authored",
    meta: { ...GEOGRAPHY_G6_BOOK_META, subjectTitleHe: "גאוגרפיה" },
  };

  map[getLearningBookKey("history", "g6")] = {
    subject: "history",
    grade: "g6",
    status: "authored",
    meta: { ...HISTORY_G6_BOOK_META, subjectTitleHe: "היסטוריה" },
  };

  return map;
})();

export const LEARNING_BOOK_META_LIST = Object.values(LEARNING_BOOK_META_BY_KEY);

/**
 * @param {string} subject
 * @param {string} grade
 */
export function getLearningBookClientMeta(subject, grade) {
  return LEARNING_BOOK_META_BY_KEY[getLearningBookKey(subject, grade)] ?? null;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @returns {string|null}
 */
export function getLearningBookIndexHref(subject, grade) {
  const entry = getLearningBookClientMeta(subject, grade);
  if (!entry || entry.status !== "authored") return null;
  return entry.meta?.routeBase ?? null;
}

/**
 * @param {string} subject
 * @param {string} grade
 */
export function getLearningBookTileTitle(subject, grade) {
  const subjectHe = getLearningBookSubjectLabelHe(subject);
  return {
    line1: `ספר ${subjectHe}`,
    line2: `כיתה ${getGradeShortLabel(grade)}`,
  };
}

/**
 * @param {string} subject
 * @param {string} grade
 */
export function hasLearningBook(subject, grade) {
  const entry = getLearningBookClientMeta(subject, grade);
  return Boolean(entry && entry.status === "authored");
}

/**
 * Authored books that appear in master-page book tiles and dynamic SSG routes.
 * @param {string} [subject]
 */
export function getVisibleLearningBooks(subject) {
  return LEARNING_BOOK_META_LIST.filter(
    (book) =>
      book.status === "authored" &&
      book.meta?.routeBase &&
      (!subject || book.subject === String(subject).toLowerCase())
  );
}

/**
 * Books served by dynamic `[subject]/[grade]` routes (not explicit math g1/g2).
 */
const EXPLICIT_ROUTE_BOOK_KEYS = new Set([
  ...["g1", "g2", "g3", "g4", "g5", "g6"].map((grade) => getLearningBookKey("math", grade)),
  getLearningBookKey("geometry", "g1"),
  getLearningBookKey("geometry", "g2"),
  getLearningBookKey("geometry", "g3"),
  getLearningBookKey("geometry", "g4"),
  getLearningBookKey("geometry", "g5"),
  getLearningBookKey("geometry", "g6"),
]);

export function getDynamicRouteBookMetaList() {
  return LEARNING_BOOK_META_LIST.filter(
    (book) => !EXPLICIT_ROUTE_BOOK_KEYS.has(getLearningBookKey(book.subject, book.grade))
  );
}
