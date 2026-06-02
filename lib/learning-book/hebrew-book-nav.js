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

export function getHebrewBookPracticePath() {
  return `/learning/hebrew-master?${LEARNING_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, operation?: string, forceKind: string, pageId?: string, skillId?: string }} preset
 */
export function saveHebrewBookPracticePreset(grade, preset) {
  saveLearningBookPracticePreset("hebrew", grade, preset);
}

/**
 * @param {string} grade
 */
export function consumeHebrewBookPracticePreset(grade) {
  const parsed = consumeLearningBookPracticePreset("hebrew", grade);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.grade !== grade || parsed.mode !== "learning") return null;
  const topic = parsed.topic || parsed.operation;
  if (typeof topic !== "string" || typeof parsed.forceKind !== "string") {
    return null;
  }
  return parsed;
}

export function isHebrewBookPracticeEntry(query) {
  return isLearningBookPracticeEntry(query);
}

export const getHebrewBookReturnQuerySuffix = getLearningBookReturnQuerySuffix;
export const withHebrewBookLearningReturn = withLearningBookLearningReturn;

/**
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveHebrewBookLearningSnapshot(grade, snapshot) {
  saveLearningBookLearningSnapshot("hebrew", grade, snapshot);
}

/**
 * @param {string} grade
 */
export function consumeHebrewBookLearningSnapshot(grade) {
  return consumeLearningBookLearningSnapshot("hebrew", grade);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} grade
 */
export function handleHebrewBookClose(router, grade) {
  handleLearningBookCloseToMaster(router, "hebrew", grade, "/learning/hebrew-master");
}

const HEBREW_BOOK_GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

export function consumeAnyHebrewBookLearningSnapshot() {
  for (const grade of HEBREW_BOOK_GRADES) {
    const snap = consumeHebrewBookLearningSnapshot(grade);
    if (snap) return snap;
  }
  return null;
}

export function consumeAnyHebrewBookPracticePreset() {
  for (const grade of HEBREW_BOOK_GRADES) {
    const preset = consumeHebrewBookPracticePreset(grade);
    if (preset) return preset;
  }
  return null;
}

export { HEBREW_BOOK_GRADES };
