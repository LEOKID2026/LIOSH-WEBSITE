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

export function getScienceBookPracticePath() {
  return `/learning/science-master?${LEARNING_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }} preset
 */
export function saveScienceBookPracticePreset(grade, preset) {
  saveLearningBookPracticePreset("science", grade, preset);
}

/**
 * @param {string} grade
 * @returns {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }|null}
 */
export function consumeScienceBookPracticePreset(grade) {
  const parsed = consumeLearningBookPracticePreset("science", grade);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.grade !== grade || parsed.mode !== "learning") return null;
  if (typeof parsed.topic !== "string" || typeof parsed.forceKind !== "string") {
    return null;
  }
  return parsed;
}

export function isScienceBookPracticeEntry(query) {
  return isLearningBookPracticeEntry(query);
}

export const getScienceBookReturnQuerySuffix = getLearningBookReturnQuerySuffix;
export const withScienceBookLearningReturn = withLearningBookLearningReturn;

/**
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveScienceBookLearningSnapshot(grade, snapshot) {
  saveLearningBookLearningSnapshot("science", grade, snapshot);
}

/**
 * @param {string} grade
 */
export function consumeScienceBookLearningSnapshot(grade) {
  return consumeLearningBookLearningSnapshot("science", grade);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} grade
 */
export function handleScienceBookClose(router, grade) {
  handleLearningBookCloseToMaster(router, "science", grade, "/learning/science-master");
}

const SCIENCE_BOOK_GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

export function consumeAnyScienceBookLearningSnapshot() {
  for (const grade of SCIENCE_BOOK_GRADES) {
    const snap = consumeScienceBookLearningSnapshot(grade);
    if (snap) return snap;
  }
  return null;
}

export function consumeAnyScienceBookPracticePreset() {
  for (const grade of SCIENCE_BOOK_GRADES) {
    const preset = consumeScienceBookPracticePreset(grade);
    if (preset) return preset;
  }
  return null;
}

export { SCIENCE_BOOK_GRADES };
