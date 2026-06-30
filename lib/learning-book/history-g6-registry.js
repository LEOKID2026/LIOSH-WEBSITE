import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade 6 History Learning Book — internal TOC registry.
 * Content files: docs/learning-book/history/g6/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} HistoryG6Batch */

/** @type {HistoryG6Batch[]} */
const HISTORY_G6_BOOK_BATCHES_RAW = [
  { id: "a", titleHe: "יסודות ההיסטוריה", pages: ["what_is_history"] },
  { id: "b", titleHe: "יוון הקלאסית", pages: ["classical_greece"] },
  { id: "c", titleHe: "הלניזם והיהודים", pages: ["hellenism_jews"] },
  { id: "d", titleHe: "החשמונאים", pages: ["hasmonaeans"] },
  { id: "e", titleHe: "רומא והיהודים", pages: ["rome_jews"] },
];

const _HISTORY_G6_SEQUENCE = createSequencedBookExports("history", "g6", HISTORY_G6_BOOK_BATCHES_RAW);
export const HISTORY_G6_PAGE_ORDER = _HISTORY_G6_SEQUENCE.pageOrder;
export const HISTORY_G6_BOOK_BATCHES = _HISTORY_G6_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHistoryG6PageNeighbors(pageId) {
  return _HISTORY_G6_SEQUENCE.getPageNeighbors(pageId);
}

export function isValidHistoryG6PageId(pageId) {
  return _HISTORY_G6_SEQUENCE.isValidPageId(pageId);
}

export const HISTORY_G6_BOOK_META = Object.freeze({
  subject: "history",
  grade: "g6",
  routeBase: "/student/learning/book/history/g6",
  bookTitleHe: "ספר היסטוריה",
  gradeShortLabel: "",
  draftsDir: "docs/learning-book/history/g6/drafts",
});
