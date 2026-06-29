import {
  LEARNING_BOOK_PRACTICE_FROM_QUERY,
  withLearningBookLearningReturn,
  getLearningBookReturnQuerySuffix,
  saveLearningBookLearningSnapshot,
  consumeLearningBookLearningSnapshot,
  saveLearningBookPracticePreset,
  consumeLearningBookPracticePreset,
  isLearningBookPracticeEntry,
  handleLearningBookCloseToMaster,
} from "./learning-book-nav";

export function getHistoryBookPracticePath() {
  return `/learning/history-master?${LEARNING_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }} preset
 */
export function saveHistoryBookPracticePreset(grade, preset) {
  saveLearningBookPracticePreset("history", grade, preset);
}

/**
 * @param {string} grade
 * @returns {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }|null}
 */
export function consumeHistoryBookPracticePreset(grade) {
  const parsed = consumeLearningBookPracticePreset("history", grade);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.grade !== grade || parsed.mode !== "learning") return null;
  if (typeof parsed.topic !== "string" || typeof parsed.forceKind !== "string") {
    return null;
  }
  return parsed;
}

export function isHistoryBookPracticeEntry(query) {
  return isLearningBookPracticeEntry(query);
}

export const getHistoryBookReturnQuerySuffix = getLearningBookReturnQuerySuffix;
export const withHistoryBookLearningReturn = withLearningBookLearningReturn;

/**
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveHistoryBookLearningSnapshot(grade, snapshot) {
  saveLearningBookLearningSnapshot("history", grade, snapshot);
}

/**
 * @param {string} grade
 */
export function consumeHistoryBookLearningSnapshot(grade) {
  return consumeLearningBookLearningSnapshot("history", grade);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} grade
 */
export function handleHistoryBookClose(router, grade) {
  handleLearningBookCloseToMaster(router, "history", grade, "/learning/history-master");
}

const HISTORY_BOOK_GRADES = ["g6"];

export function consumeAnyHistoryBookLearningSnapshot() {
  for (const grade of HISTORY_BOOK_GRADES) {
    const snap = consumeHistoryBookLearningSnapshot(grade);
    if (snap) return snap;
  }
  return null;
}

export function consumeAnyHistoryBookPracticePreset() {
  for (const grade of HISTORY_BOOK_GRADES) {
    const preset = consumeHistoryBookPracticePreset(grade);
    if (preset) return preset;
  }
  return null;
}

export { HISTORY_BOOK_GRADES };
