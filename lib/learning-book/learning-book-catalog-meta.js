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
import { getGradeShortLabel } from "./learning-book-grade-labels.js";

/** @typedef {"authored"|"placeholder"} BookContentStatus */

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
  if (key === "geometry") return "הנדסה";
  if (key === "science") return "מדעים";
  return "חשבון";
}

/**
 * @param {string} subject
 */
export function getLearningBookMasterPath(subject) {
  const key = String(subject || "").toLowerCase();
  if (key === "geometry") return "/learning/geometry-master";
  if (key === "science") return "/learning/science-master";
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
    meta: { ...MATH_G1_BOOK_META, subjectTitleHe: "חשבון" },
  };
  map[getLearningBookKey("math", "g2")] = {
    subject: "math",
    grade: "g2",
    status: "authored",
    meta: { ...MATH_G2_BOOK_META, subjectTitleHe: "חשבון" },
  };
  map[getLearningBookKey("math", "g3")] = {
    subject: "math",
    grade: "g3",
    status: "authored",
    meta: { ...MATH_G3_BOOK_META, subjectTitleHe: "חשבון" },
  };
  map[getLearningBookKey("math", "g4")] = {
    subject: "math",
    grade: "g4",
    status: "authored",
    meta: { ...MATH_G4_BOOK_META, subjectTitleHe: "חשבון" },
  };
  map[getLearningBookKey("math", "g5")] = {
    subject: "math",
    grade: "g5",
    status: "authored",
    meta: { ...MATH_G5_BOOK_META, subjectTitleHe: "חשבון" },
  };
  map[getLearningBookKey("math", "g6")] = {
    subject: "math",
    grade: "g6",
    status: "authored",
    meta: { ...MATH_G6_BOOK_META, subjectTitleHe: "חשבון" },
  };

  map[getLearningBookKey("geometry", "g1")] = {
    subject: "geometry",
    grade: "g1",
    status: "authored",
    meta: { ...GEOMETRY_G1_BOOK_META, subjectTitleHe: "הנדסה" },
  };

  map[getLearningBookKey("geometry", "g2")] = {
    subject: "geometry",
    grade: "g2",
    status: "authored",
    meta: { ...GEOMETRY_G2_BOOK_META, subjectTitleHe: "הנדסה" },
  };

  map[getLearningBookKey("geometry", "g3")] = {
    subject: "geometry",
    grade: "g3",
    status: "authored",
    meta: { ...GEOMETRY_G3_BOOK_META, subjectTitleHe: "הנדסה" },
  };

  map[getLearningBookKey("geometry", "g4")] = {
    subject: "geometry",
    grade: "g4",
    status: "authored",
    meta: { ...GEOMETRY_G4_BOOK_META, subjectTitleHe: "הנדסה" },
  };

  map[getLearningBookKey("geometry", "g5")] = {
    subject: "geometry",
    grade: "g5",
    status: "authored",
    meta: { ...GEOMETRY_G5_BOOK_META, subjectTitleHe: "הנדסה" },
  };

  map[getLearningBookKey("geometry", "g6")] = {
    subject: "geometry",
    grade: "g6",
    status: "authored",
    meta: { ...GEOMETRY_G6_BOOK_META, subjectTitleHe: "הנדסה" },
  };

  map[getLearningBookKey("science", "g1")] = {
    subject: "science",
    grade: "g1",
    status: "authored",
    meta: { ...SCIENCE_G1_BOOK_META, subjectTitleHe: "מדעים" },
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
  return entry?.meta?.routeBase ?? null;
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
  return Boolean(getLearningBookClientMeta(subject, grade));
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
