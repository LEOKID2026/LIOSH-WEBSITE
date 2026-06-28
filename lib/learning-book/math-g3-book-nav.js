/** Query + session snapshot for returning from the G3 book to an active learning question. */

export const MATH_G3_BOOK_RETURN_QUERY = "returnTo";
export const MATH_G3_BOOK_RETURN_LEARNING = "learning";
export const MATH_G3_BOOK_LEARNING_SNAPSHOT_KEY = "mleo_math_g3_book_learning_resume_v1";
export const MATH_G3_BOOK_PRACTICE_FROM_QUERY = "fromBook";
export const MATH_G3_BOOK_PRACTICE_PRESET_KEY = "mleo_math_g3_book_practice_preset_v1";

function normalizeQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function isMathG3BookLearningReturn(query) {
  return (
    normalizeQueryValue(query?.[MATH_G3_BOOK_RETURN_QUERY]) ===
    MATH_G3_BOOK_RETURN_LEARNING
  );
}

/**
 * @param {string} href
 * @returns {string}
 */
export function withMathG3BookLearningReturn(href) {
  if (!href || typeof href !== "string") return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${MATH_G3_BOOK_RETURN_QUERY}=${MATH_G3_BOOK_RETURN_LEARNING}`;
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 * @returns {string} e.g. "?returnTo=learning" or ""
 */
export function getMathG3BookReturnQuerySuffix(query) {
  return isMathG3BookLearningReturn(query)
    ? `?${MATH_G3_BOOK_RETURN_QUERY}=${MATH_G3_BOOK_RETURN_LEARNING}`
    : "";
}

/**
 * @param {string} href
 * @param {string} returnQuerySuffix
 * @returns {string}
 */
export function appendReturnQueryToHref(href, returnQuerySuffix) {
  if (!returnQuerySuffix) return href;
  if (href.includes("?")) {
    return `${href}&${returnQuerySuffix.slice(1)}`;
  }
  return `${href}${returnQuerySuffix}`;
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function saveMathG3BookLearningSnapshot(snapshot) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      MATH_G3_BOOK_LEARNING_SNAPSHOT_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @returns {Record<string, unknown>|null}
 */
export function consumeMathG3BookLearningSnapshot() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MATH_G3_BOOK_LEARNING_SNAPSHOT_KEY);
    sessionStorage.removeItem(MATH_G3_BOOK_LEARNING_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {import("next/router").NextRouter} router
 */
export function handleMathG3BookClose(router) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/learning/math-master");
}

/**
 * @param {{ grade: string, mode: string, operation: string, forceKind: string, pageId?: string }} preset
 */
export function saveMathG3BookPracticePreset(preset) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(MATH_G3_BOOK_PRACTICE_PRESET_KEY, JSON.stringify(preset));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {{ grade: string, mode: string, operation: string, forceKind: string, pageId?: string }|null}
 */
export function consumeMathG3BookPracticePreset() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MATH_G3_BOOK_PRACTICE_PRESET_KEY);
    sessionStorage.removeItem(MATH_G3_BOOK_PRACTICE_PRESET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.grade !== "g3" || parsed.mode !== "learning") return null;
    if (typeof parsed.operation !== "string" || typeof parsed.forceKind !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getMathG3PracticePath() {
  return `/learning/math-master?${MATH_G3_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * @param {{ grade: string, mode: string, operation: string, forceKind: string, pageId?: string }} preset
 * @returns {string}
 */
export function getMathG3PracticeHref(preset) {
  saveMathG3BookPracticePreset(preset);
  return getMathG3PracticePath();
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function isMathG3BookPracticeEntry(query) {
  return normalizeQueryValue(query?.[MATH_G3_BOOK_PRACTICE_FROM_QUERY]) === "1";
}
