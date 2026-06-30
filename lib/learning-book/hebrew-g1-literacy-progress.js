import { HEBREW_G1_BOOK_BATCHES } from "./hebrew-g1-registry.js";

export const HEBREW_G1_LITERACY_FOUNDATION_BATCH_ID = "a";
export const HEBREW_G1_SOFT_GATE_TOPICS = Object.freeze(["grammar", "comprehension"]);
export const HEBREW_G1_LITERACY_PROGRESS_STORAGE_KEY = "liosh_hebrew_g1_literacy_progress_v1";
export const HEBREW_G1_LITERACY_FOUNDATION_MIN_PAGES = 4;

/**
 * @returns {string[]}
 */
export function getHebrewG1LiteracyFoundationPageIds() {
  const batch = HEBREW_G1_BOOK_BATCHES.find((b) => b.id === HEBREW_G1_LITERACY_FOUNDATION_BATCH_ID);
  return batch ? [...batch.pages] : [];
}

/**
 * @param {unknown} raw
 * @returns {{ viewedPageIds: string[], dismissedTopics: string[] }}
 */
export function normalizeHebrewG1LiteracyProgressState(raw) {
  const viewedPageIds = Array.isArray(raw?.viewedPageIds)
    ? raw.viewedPageIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const dismissedTopics = Array.isArray(raw?.dismissedTopics)
    ? raw.dismissedTopics.map((t) => String(t).trim()).filter(Boolean)
    : [];
  return { viewedPageIds, dismissedTopics };
}

/**
 * @param {{ viewedPageIds?: string[] }} [progressState]
 * @returns {boolean}
 */
export function isHebrewG1LiteracyFoundationComplete(progressState) {
  const foundationIds = new Set(getHebrewG1LiteracyFoundationPageIds());
  const viewed = new Set(
    (progressState?.viewedPageIds || []).map((id) => String(id).trim()).filter(Boolean)
  );
  let count = 0;
  for (const pageId of foundationIds) {
    if (viewed.has(pageId)) count += 1;
  }
  return count >= HEBREW_G1_LITERACY_FOUNDATION_MIN_PAGES;
}

/**
 * @param {{
 *   gradeKey?: string,
 *   topic?: string,
 *   progressState?: { viewedPageIds?: string[], dismissedTopics?: string[] },
 *   dismissedTopics?: Set<string>|string[],
 * }} ctx
 * @returns {boolean}
 */
export function shouldShowHebrewG1BookFirstSoftGate(ctx = {}) {
  const gradeKey = String(ctx.gradeKey || "").toLowerCase();
  const topic = String(ctx.topic || "").toLowerCase();
  if (gradeKey !== "g1") return false;
  if (!HEBREW_G1_SOFT_GATE_TOPICS.includes(topic)) return false;

  const progress = normalizeHebrewG1LiteracyProgressState(ctx.progressState);
  if (isHebrewG1LiteracyFoundationComplete(progress)) return false;

  const dismissed = ctx.dismissedTopics;
  if (dismissed instanceof Set && dismissed.has(topic)) return false;
  if (Array.isArray(dismissed) && dismissed.includes(topic)) return false;
  if (progress.dismissedTopics.includes(topic)) return false;

  return true;
}

/**
 * @returns {{
 *   title: string,
 *   body: string,
 *   hint: string,
 *   openBookLabel: string,
 *   continueLabel: string,
 * }}
 */
export function getHebrewG1BookFirstRecommendationCopy() {
  return {
    title: "כדאי להתחיל מהספר",
    body: "בכיתה א׳ מומלץ להתחיל מפרקי האותיות, הצלילים והניקוד לפני תרגול מתקדם.",
    hint: "אפשר להמשיך לתרגול עכשיו, אבל הספר יעזור לבנות בסיס קריאה חזק יותר.",
    openBookLabel: "פתח את הספר",
    continueLabel: "המשך לתרגול בכל זאת",
  };
}

/**
 * @returns {string|null}
 */
export function getHebrewG1LiteracyFoundationBookHref() {
  const firstPage = getHebrewG1LiteracyFoundationPageIds()[0];
  if (!firstPage) return null;
  return `/student/learning/book/hebrew/g1/${firstPage}`;
}

/**
 * @param {string} pageId
 * @param {{ viewedPageIds?: string[], dismissedTopics?: string[] }} [state]
 * @returns {{ viewedPageIds: string[], dismissedTopics: string[] }}
 */
export function recordHebrewG1LiteracyPageView(pageId, state = {}) {
  const normalized = normalizeHebrewG1LiteracyProgressState(state);
  const id = String(pageId || "").trim();
  if (!id) return normalized;
  const foundationIds = new Set(getHebrewG1LiteracyFoundationPageIds());
  if (!foundationIds.has(id)) return normalized;
  if (normalized.viewedPageIds.includes(id)) return normalized;
  return {
    ...normalized,
    viewedPageIds: [...normalized.viewedPageIds, id],
  };
}

/**
 * @param {string} topic
 * @param {{ viewedPageIds?: string[], dismissedTopics?: string[] }} [state]
 * @returns {{ viewedPageIds: string[], dismissedTopics: string[] }}
 */
export function dismissHebrewG1BookFirstSoftGate(topic, state = {}) {
  const normalized = normalizeHebrewG1LiteracyProgressState(state);
  const t = String(topic || "").trim().toLowerCase();
  if (!t || normalized.dismissedTopics.includes(t)) return normalized;
  return {
    ...normalized,
    dismissedTopics: [...normalized.dismissedTopics, t],
  };
}

/**
 * @returns {{ viewedPageIds: string[], dismissedTopics: string[] }}
 */
export function readHebrewG1LiteracyProgressClient() {
  if (typeof localStorage === "undefined") {
    return { viewedPageIds: [], dismissedTopics: [] };
  }
  try {
    const raw = localStorage.getItem(HEBREW_G1_LITERACY_PROGRESS_STORAGE_KEY);
    if (!raw) return { viewedPageIds: [], dismissedTopics: [] };
    return normalizeHebrewG1LiteracyProgressState(JSON.parse(raw));
  } catch {
    return { viewedPageIds: [], dismissedTopics: [] };
  }
}

/**
 * @param {{ viewedPageIds?: string[], dismissedTopics?: string[] }} state
 */
export function writeHebrewG1LiteracyProgressClient(state) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      HEBREW_G1_LITERACY_PROGRESS_STORAGE_KEY,
      JSON.stringify(normalizeHebrewG1LiteracyProgressState(state))
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string} pageId
 */
export function recordHebrewG1LiteracyPageViewClient(pageId) {
  const next = recordHebrewG1LiteracyPageView(pageId, readHebrewG1LiteracyProgressClient());
  writeHebrewG1LiteracyProgressClient(next);
  return next;
}

/**
 * @param {string} topic
 */
export function dismissHebrewG1BookFirstSoftGateClient(topic) {
  const next = dismissHebrewG1BookFirstSoftGate(topic, readHebrewG1LiteracyProgressClient());
  writeHebrewG1LiteracyProgressClient(next);
  return next;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 */
export function maybeRecordHebrewG1LiteracyBookPageView(subject, grade, pageId) {
  if (String(subject).toLowerCase() !== "hebrew") return;
  if (String(grade).toLowerCase() !== "g1") return;
  recordHebrewG1LiteracyPageViewClient(pageId);
}
