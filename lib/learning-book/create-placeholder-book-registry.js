/**
 * Factory for placeholder learning-book registries (single page, 7 sections).
 */

import { getGradeLongLabel } from "./learning-book-grade-labels.js";
import { PLACEHOLDER_PAGE_ID } from "./learning-book-placeholders.js";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} LearningBookBatch */

/**
 * @param {string} subject
 * @param {string} grade
 * @param {{ subjectTitleHe?: string }} [opts]
 */
export function createPlaceholderBookRegistry(subject, grade, opts = {}) {
  const subjectKey = String(subject || "").toLowerCase();
  const gradeKey = String(grade || "").toLowerCase();
  const subjectTitleHe =
    opts.subjectTitleHe || (subjectKey === "geometry" ? "גאומטריה" : "חשבון");

  /** @type {LearningBookBatch[]} */
  const batches = [
    {
      id: "placeholder",
      titleHe: "ספר בהכנה",
      pages: [PLACEHOLDER_PAGE_ID],
    },
  ];

  const pageOrder = [PLACEHOLDER_PAGE_ID];

  const meta = Object.freeze({
    subject: subjectKey,
    grade: gradeKey,
    routeBase: `/student/learning/book/${subjectKey}/${gradeKey}`,
    bookTitleHe: `ספר ${subjectTitleHe} - ${getGradeLongLabel(gradeKey)}`,
    draftsDir: `docs/learning-book/${subjectKey}/${gradeKey}/drafts`,
    gradeShortLabel: getGradeLongLabel(gradeKey),
    status: "placeholder",
    subjectTitleHe,
  });

  return {
    batches,
    pageOrder,
    meta,
    getPageNeighbors(pageId) {
      const index = pageOrder.indexOf(pageId);
      if (index === -1) {
        return { prev: null, next: null, index: -1 };
      }
      return {
        prev: index > 0 ? pageOrder[index - 1] : null,
        next: index < pageOrder.length - 1 ? pageOrder[index + 1] : null,
        index,
      };
    },
    isValidPageId(pageId) {
      return pageOrder.includes(pageId);
    },
  };
}
