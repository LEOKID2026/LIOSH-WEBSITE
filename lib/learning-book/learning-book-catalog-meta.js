/**
 * Client-safe learning book metadata (no Node fs imports).
 */

import { MATH_G1_BOOK_META } from "./math-g1-registry.js";
import { MATH_G2_BOOK_META } from "./math-g2-registry.js";
import { MATH_G3_BOOK_META } from "./math-g3-registry.js";
import { MATH_G4_BOOK_META } from "./math-g4-registry.js";
import { createPlaceholderBookRegistry } from "./create-placeholder-book-registry.js";
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
  return subject === "geometry" ? "הנדסה" : "חשבון";
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

  for (const grade of ["g5", "g6"]) {
    const reg = createPlaceholderBookRegistry("math", grade);
    map[getLearningBookKey("math", grade)] = {
      subject: "math",
      grade,
      status: "placeholder",
      meta: reg.meta,
    };
  }

  for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    const reg = createPlaceholderBookRegistry("geometry", grade, {
      subjectTitleHe: "הנדסה",
    });
    map[getLearningBookKey("geometry", grade)] = {
      subject: "geometry",
      grade,
      status: "placeholder",
      meta: reg.meta,
    };
  }

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
export function getDynamicRouteBookMetaList() {
  return LEARNING_BOOK_META_LIST.filter(
    (book) =>
      !(book.subject === "math" && ["g1", "g2", "g3", "g4"].includes(book.grade))
  );
}
