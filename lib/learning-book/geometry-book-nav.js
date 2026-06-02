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

export function getGeometryBookPracticePath() {
  return `/learning/geometry-master?${LEARNING_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }} preset
 */
export function saveGeometryBookPracticePreset(grade, preset) {
  saveLearningBookPracticePreset("geometry", grade, preset);
}

/**
 * @param {string} grade
 * @returns {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }|null}
 */
export function consumeGeometryBookPracticePreset(grade) {
  const parsed = consumeLearningBookPracticePreset("geometry", grade);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.grade !== grade || parsed.mode !== "learning") return null;
  if (typeof parsed.topic !== "string" || typeof parsed.forceKind !== "string") {
    return null;
  }
  return parsed;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string }} preset
 */
export function getGeometryBookPracticeHref(grade, preset) {
  saveGeometryBookPracticePreset(grade, preset);
  return getGeometryBookPracticePath();
}

export function isGeometryBookPracticeEntry(query) {
  return isLearningBookPracticeEntry(query);
}

export const getGeometryBookReturnQuerySuffix = getLearningBookReturnQuerySuffix;
export const withGeometryBookLearningReturn = withLearningBookLearningReturn;

/**
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveGeometryBookLearningSnapshot(grade, snapshot) {
  saveLearningBookLearningSnapshot("geometry", grade, snapshot);
}

/**
 * @param {string} grade
 */
export function consumeGeometryBookLearningSnapshot(grade) {
  return consumeLearningBookLearningSnapshot("geometry", grade);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} grade
 */
export function handleGeometryBookClose(router, grade) {
  handleLearningBookCloseToMaster(router, "geometry", grade, "/learning/geometry-master");
}

const GEOMETRY_BOOK_GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

export function consumeAnyGeometryBookLearningSnapshot() {
  for (const grade of GEOMETRY_BOOK_GRADES) {
    const snap = consumeGeometryBookLearningSnapshot(grade);
    if (snap) return snap;
  }
  return null;
}

export function consumeAnyGeometryBookPracticePreset() {
  for (const grade of GEOMETRY_BOOK_GRADES) {
    const preset = consumeGeometryBookPracticePreset(grade);
    if (preset) return preset;
  }
  return null;
}
