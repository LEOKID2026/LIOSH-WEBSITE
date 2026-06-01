/**
 * Generic learning-book navigation (return query, session snapshots).
 * Grade 1/2 Math keep dedicated modules for backward compatibility.
 */

export const LEARNING_BOOK_RETURN_QUERY = "returnTo";
export const LEARNING_BOOK_RETURN_LEARNING = "learning";
export const LEARNING_BOOK_PRACTICE_FROM_QUERY = "fromBook";

/**
 * @param {string} subject
 * @param {string} grade
 */
export function learningBookSnapshotKey(subject, grade) {
  return `mleo_${subject}_${grade}_book_learning_resume_v1`;
}

/**
 * @param {string} subject
 * @param {string} grade
 */
export function learningBookPracticePresetKey(subject, grade) {
  return `mleo_${subject}_${grade}_book_practice_preset_v1`;
}

function normalizeQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function isLearningBookLearningReturn(query) {
  return (
    normalizeQueryValue(query?.[LEARNING_BOOK_RETURN_QUERY]) ===
    LEARNING_BOOK_RETURN_LEARNING
  );
}

/**
 * @param {string} href
 */
export function withLearningBookLearningReturn(href) {
  if (!href || typeof href !== "string") return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${LEARNING_BOOK_RETURN_QUERY}=${LEARNING_BOOK_RETURN_LEARNING}`;
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function getLearningBookReturnQuerySuffix(query) {
  return isLearningBookLearningReturn(query)
    ? `?${LEARNING_BOOK_RETURN_QUERY}=${LEARNING_BOOK_RETURN_LEARNING}`
    : "";
}

/**
 * @param {string} href
 * @param {string} returnQuerySuffix
 */
export function appendReturnQueryToHref(href, returnQuerySuffix) {
  if (!returnQuerySuffix) return href;
  if (href.includes("?")) {
    return `${href}&${returnQuerySuffix.slice(1)}`;
  }
  return `${href}${returnQuerySuffix}`;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {Record<string, unknown>} snapshot
 */
export function saveLearningBookLearningSnapshot(subject, grade, snapshot) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      learningBookSnapshotKey(subject, grade),
      JSON.stringify(snapshot)
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} subject
 * @param {string} grade
 * @returns {Record<string, unknown>|null}
 */
export function consumeLearningBookLearningSnapshot(subject, grade) {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const key = learningBookSnapshotKey(subject, grade);
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} subject
 * @param {string} grade
 * @param {string} masterPath
 */
export function handleLearningBookCloseToMaster(router, subject, grade, masterPath) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push(masterPath);
}

/**
 * @param {import("next/router").NextRouter} router
 * @param {string} subject
 * @param {string} grade
 * @param {string} masterPath
 */
export function handleLearningBookClose(router, subject, grade, masterPath) {
  handleLearningBookCloseToMaster(router, subject, grade, masterPath);
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {Record<string, unknown>} preset
 */
export function saveLearningBookPracticePreset(subject, grade, preset) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      learningBookPracticePresetKey(subject, grade),
      JSON.stringify(preset)
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function isLearningBookPracticeEntry(query) {
  return normalizeQueryValue(query?.[LEARNING_BOOK_PRACTICE_FROM_QUERY]) === "1";
}

/**
 * @param {string} subject
 * @param {string} grade
 * @returns {Record<string, unknown>|null}
 */
export function consumeLearningBookPracticePreset(subject, grade) {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const key = learningBookPracticePresetKey(subject, grade);
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} masterPath
 */
export function createLearningBookNav(subject, grade, masterPath) {
  return {
    subject,
    grade,
    masterPath,
    getReturnQuerySuffix: getLearningBookReturnQuerySuffix,
    isLearningReturn: isLearningBookLearningReturn,
    withLearningReturn: withLearningBookLearningReturn,
    appendReturnQueryToHref,
    saveLearningSnapshot: (snapshot) =>
      saveLearningBookLearningSnapshot(subject, grade, snapshot),
    consumeLearningSnapshot: () =>
      consumeLearningBookLearningSnapshot(subject, grade),
    handleClose: (router) =>
      handleLearningBookCloseToMaster(router, subject, grade, masterPath),
    savePracticePreset: (preset) =>
      saveLearningBookPracticePreset(subject, grade, preset),
    consumePracticePreset: () =>
      consumeLearningBookPracticePreset(subject, grade),
    isPracticeEntry: isLearningBookPracticeEntry,
  };
}
