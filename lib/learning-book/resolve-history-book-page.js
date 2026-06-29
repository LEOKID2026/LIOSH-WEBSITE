import { HISTORY_G6_BOOK_META, isValidHistoryG6PageId } from "./history-g6-registry.js";

/** @type {Record<string, { meta: typeof HISTORY_G6_BOOK_META, isValid: (id: string) => boolean }>} */
const GRADE_BOOK = {
  g6: { meta: HISTORY_G6_BOOK_META, isValid: isValidHistoryG6PageId },
};

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function resolveHistoryBookPageId({ grade, topic, kind }) {
  const gradeKey = String(grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;

  const kindKey = String(kind || "").trim();
  if (kindKey && cfg.isValid(kindKey)) {
    return kindKey;
  }

  const topicKey = String(topic || "").trim();
  if (!topicKey || topicKey === "mixed") return null;

  if (cfg.isValid(topicKey)) {
    return topicKey;
  }

  return null;
}

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function getHistoryBookHref(ctx) {
  const pageId = resolveHistoryBookPageId(ctx);
  if (!pageId) return null;
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;
  return `${cfg.meta.routeBase}/${pageId}`;
}
