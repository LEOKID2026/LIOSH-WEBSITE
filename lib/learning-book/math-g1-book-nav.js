/** Query + session snapshot for returning from the G1 book to an active learning question. */

export const MATH_G1_BOOK_RETURN_QUERY = "returnTo";
export const MATH_G1_BOOK_RETURN_LEARNING = "learning";
export const MATH_G1_BOOK_LEARNING_SNAPSHOT_KEY = "mleo_math_g1_book_learning_resume_v1";
export const MATH_G1_BOOK_PRACTICE_FROM_QUERY = "fromBook";
export const MATH_G1_BOOK_PRACTICE_PRESET_KEY = "mleo_math_g1_book_practice_preset_v1";

function normalizeQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function isMathG1BookLearningReturn(query) {
  return (
    normalizeQueryValue(query?.[MATH_G1_BOOK_RETURN_QUERY]) ===
    MATH_G1_BOOK_RETURN_LEARNING
  );
}

/**
 * @param {string} href
 * @returns {string}
 */
export function withMathG1BookLearningReturn(href) {
  if (!href || typeof href !== "string") return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${MATH_G1_BOOK_RETURN_QUERY}=${MATH_G1_BOOK_RETURN_LEARNING}`;
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 * @returns {string} e.g. "?returnTo=learning" or ""
 */
export function getMathG1BookReturnQuerySuffix(query) {
  return isMathG1BookLearningReturn(query)
    ? `?${MATH_G1_BOOK_RETURN_QUERY}=${MATH_G1_BOOK_RETURN_LEARNING}`
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
export function saveMathG1BookLearningSnapshot(snapshot) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      MATH_G1_BOOK_LEARNING_SNAPSHOT_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @returns {Record<string, unknown>|null}
 */
export function consumeMathG1BookLearningSnapshot() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MATH_G1_BOOK_LEARNING_SNAPSHOT_KEY);
    sessionStorage.removeItem(MATH_G1_BOOK_LEARNING_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Close book overlay flow: prefer history back (restores math-master + snapshot on remount).
 * @param {import("next/router").NextRouter} router
 */
export function handleMathG1BookClose(router) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/learning/math-master");
}

/**
 * @param {{ grade: string, mode: string, operation: string, forceKind: string, pageId?: string }} preset
 */
export function saveMathG1BookPracticePreset(preset) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(MATH_G1_BOOK_PRACTICE_PRESET_KEY, JSON.stringify(preset));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @returns {{ grade: string, mode: string, operation: string, forceKind: string, pageId?: string }|null}
 */
export function consumeMathG1BookPracticePreset() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MATH_G1_BOOK_PRACTICE_PRESET_KEY);
    sessionStorage.removeItem(MATH_G1_BOOK_PRACTICE_PRESET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.grade !== "g1" || parsed.mode !== "learning") return null;
    if (typeof parsed.operation !== "string" || typeof parsed.forceKind !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Math Master URL for book-origin practice (preset must be saved separately on click).
 * @returns {string}
 */
export function getMathG1PracticePath() {
  return `/learning/math-master?${MATH_G1_BOOK_PRACTICE_FROM_QUERY}=1`;
}

/**
 * Save preset and return Math Master href — call from click handler only, not during render.
 * @param {{ grade: string, mode: string, operation: string, forceKind: string, pageId?: string }} preset
 * @returns {string}
 */
export function getMathG1PracticeHref(preset) {
  saveMathG1BookPracticePreset(preset);
  return getMathG1PracticePath();
}

/**
 * @param {import("next/router").NextRouter["query"]|Record<string, string|string[]|undefined>} query
 */
export function isMathG1BookPracticeEntry(query) {
  return normalizeQueryValue(query?.[MATH_G1_BOOK_PRACTICE_FROM_QUERY]) === "1";
}
