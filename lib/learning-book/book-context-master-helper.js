import { consumeLastBookContext } from "./book-context-after-reading.js";
import { isLearningBookPracticeEntry } from "./learning-book-nav.js";

/**
 * Consume book context when master opens with ?fromBook=1.
 * @param {import("next/router").NextRouter} router
 * @param {{ subject: string, grade: string }} bookScope
 * @param {{ bookContextRef: import("react").MutableRefObject<unknown>, bookContextConsumedRef: import("react").MutableRefObject<boolean> }} refs
 */
export function tryConsumeBookContextOnPracticeEntry(router, bookScope, refs) {
  if (!router?.isReady) return;
  if (!isLearningBookPracticeEntry(router.query)) return;
  refs.bookContextRef.current = consumeLastBookContext({
    subject: bookScope.subject,
    grade: bookScope.grade,
  });
}

/**
 * First practice-mode answer only.
 * @param {string} mode
 * @param {{ bookContextRef: import("react").MutableRefObject<unknown>, bookContextConsumedRef: import("react").MutableRefObject<boolean> }} refs
 */
export function resolveContextAfterBookReadingForAnswer(mode, refs) {
  if (mode !== "practice") return false;
  if (refs.bookContextConsumedRef.current) return false;
  if (!refs.bookContextRef.current) return false;
  return true;
}

/**
 * @param {{ bookContextConsumedRef: import("react").MutableRefObject<boolean> }} refs
 */
export function markBookContextAfterReadingConsumed(refs) {
  refs.bookContextConsumedRef.current = true;
}

/**
 * @param {string} mode
 * @param {{ bookContextRef: import("react").MutableRefObject<unknown>, bookContextConsumedRef: import("react").MutableRefObject<boolean> }} refs
 * @returns {Record<string, unknown>}
 */
export function buildBookContextClientMetaExtras(mode, refs) {
  if (!resolveContextAfterBookReadingForAnswer(mode, refs)) {
    return {};
  }
  markBookContextAfterReadingConsumed(refs);
  return { contextAfterBookReading: true };
}
