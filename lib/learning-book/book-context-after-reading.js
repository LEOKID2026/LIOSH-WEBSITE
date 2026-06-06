/**
 * One-time sessionStorage context for post-book practice annotation.
 */

export const LAST_BOOK_CONTEXT_KEY = "liosh_lastBookContext_v1";
const CONTEXT_TTL_MS = 5 * 60 * 1000;

/**
 * @param {{ subject: string, grade: string, pageId: string, source?: string }} params
 */
export function saveLastBookContext({ subject, grade, pageId, source = "book_cta" }) {
  if (typeof sessionStorage === "undefined") return;
  const timestamp = Date.now();
  try {
    sessionStorage.setItem(
      LAST_BOOK_CONTEXT_KEY,
      JSON.stringify({
        subject: String(subject).toLowerCase(),
        grade: String(grade).toLowerCase(),
        pageId: String(pageId),
        source,
        timestamp,
        expiresAt: timestamp + CONTEXT_TTL_MS,
      })
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string} masterSubject book subject or master alias (e.g. moledet_geography)
 * @param {string} ctxSubject stored context subject
 */
function subjectsMatch(masterSubject, ctxSubject) {
  const m = String(masterSubject || "").toLowerCase();
  const c = String(ctxSubject || "").toLowerCase();
  if (m === c) return true;
  if (m === "moledet_geography" && (c === "moledet" || c === "geography")) return true;
  return false;
}

/**
 * @param {{ subject: string, grade: string }} params
 * @returns {Record<string, unknown>|null}
 */
export function consumeLastBookContext({ subject, grade }) {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_BOOK_CONTEXT_KEY);
    sessionStorage.removeItem(LAST_BOOK_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() > Number(parsed.expiresAt || 0)) return null;
    if (!subjectsMatch(subject, parsed.subject)) return null;
    if (String(parsed.grade).toLowerCase() !== String(grade).toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}
