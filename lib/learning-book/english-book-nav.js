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

export function getEnglishBookPracticePath() {
  return `/learning/english-master?${LEARNING_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string, skillId?: string }} preset
 */
export function saveEnglishBookPracticePreset(grade, preset) {
  saveLearningBookPracticePreset("english", grade, preset);
}

/**
 * @param {string} grade
 */
export function consumeEnglishBookPracticePreset(grade) {
  const parsed = consumeLearningBookPracticePreset("english", grade);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.grade !== grade || parsed.mode !== "learning") return null;
  const topic = parsed.topic || parsed.operation;
  if (typeof topic !== "string" || typeof parsed.forceKind !== "string") {
    return null;
  }
  return parsed;
}

export function isEnglishBookPracticeEntry(query) {
  return isLearningBookPracticeEntry(query);
}

export const getEnglishBookReturnQuerySuffix = getLearningBookReturnQuerySuffix;
export const withEnglishBookLearningReturn = withLearningBookLearningReturn;

/**
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveEnglishBookLearningSnapshot(grade, snapshot) {
  saveLearningBookLearningSnapshot("english", grade, snapshot);
}

/**
 * @param {string} grade
 */
export function consumeEnglishBookLearningSnapshot(grade) {
  return consumeLearningBookLearningSnapshot("english", grade);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} grade
 */
export function handleEnglishBookClose(router, grade) {
  handleLearningBookCloseToMaster(router, "english", grade, "/learning/english-master");
}

const ENGLISH_BOOK_GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

export function consumeAnyEnglishBookLearningSnapshot() {
  for (const grade of ENGLISH_BOOK_GRADES) {
    const snap = consumeEnglishBookLearningSnapshot(grade);
    if (snap) return snap;
  }
  return null;
}

export function consumeAnyEnglishBookPracticePreset() {
  for (const grade of ENGLISH_BOOK_GRADES) {
    const preset = consumeEnglishBookPracticePreset(grade);
    if (preset) return preset;
  }
  return null;
}

export { ENGLISH_BOOK_GRADES };
