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
import { getMoledetGeographyBookSubjectForGrade } from "./resolve-moledet-geography-book-page.js";
import { MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES } from "./moledet-geography-book-practice-map.js";
import {
  GEOGRAPHY_MASTER_HREF,
  MOLEDET_MASTER_HREF,
} from "../learning-shared/moledet-geography-display.js";

/**
 * @param {string} [grade]
 */
export function getMoledetGeographyBookPracticePath(grade) {
  const subject = grade ? getMoledetGeographyBookSubjectForGrade(grade) : "moledet";
  const base = subject === "geography" ? GEOGRAPHY_MASTER_HREF : MOLEDET_MASTER_HREF;
  return `${base}?${LEARNING_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {string} grade
 * @param {{ grade: string, mode: string, topic: string, forceKind: string, pageId?: string, skillId?: string }} preset
 */
export function saveMoledetGeographyBookPracticePreset(grade, preset) {
  const subject = getMoledetGeographyBookSubjectForGrade(grade);
  if (!subject) return;
  saveLearningBookPracticePreset(subject, grade, preset);
}

/**
 * @param {string} grade
 */
export function consumeMoledetGeographyBookPracticePreset(grade) {
  const subject = getMoledetGeographyBookSubjectForGrade(grade);
  if (!subject) return null;
  const parsed = consumeLearningBookPracticePreset(subject, grade);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.grade !== grade || parsed.mode !== "learning") return null;
  const topic = parsed.topic || parsed.operation;
  if (typeof topic !== "string" || typeof parsed.forceKind !== "string") {
    return null;
  }
  return parsed;
}

export function isMoledetGeographyBookPracticeEntry(query) {
  return isLearningBookPracticeEntry(query);
}

export const getMoledetGeographyBookReturnQuerySuffix = getLearningBookReturnQuerySuffix;
export const withMoledetGeographyBookLearningReturn = withLearningBookLearningReturn;

/**
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveMoledetGeographyBookLearningSnapshot(grade, snapshot) {
  const subject = getMoledetGeographyBookSubjectForGrade(grade);
  if (!subject) return;
  saveLearningBookLearningSnapshot(subject, grade, snapshot);
}

/**
 * @param {string} grade
 */
export function consumeMoledetGeographyBookLearningSnapshot(grade) {
  const subject = getMoledetGeographyBookSubjectForGrade(grade);
  if (!subject) return null;
  return consumeLearningBookLearningSnapshot(subject, grade);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} grade
 */
export function handleMoledetGeographyBookClose(router, grade) {
  const subject = getMoledetGeographyBookSubjectForGrade(grade) || "moledet";
  handleLearningBookCloseToMaster(
    router,
    subject,
    grade,
    subject === "geography" ? GEOGRAPHY_MASTER_HREF : MOLEDET_MASTER_HREF
  );
}

export function consumeAnyMoledetGeographyBookLearningSnapshot() {
  for (const grade of MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES) {
    const snap = consumeMoledetGeographyBookLearningSnapshot(grade);
    if (snap) return snap;
  }
  return null;
}

export function consumeAnyMoledetGeographyBookPracticePreset() {
  for (const grade of MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES) {
    const preset = consumeMoledetGeographyBookPracticePreset(grade);
    if (preset) return preset;
  }
  return null;
}

export { MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES as MOLEDET_GEOGRAPHY_BOOK_GRADES };
