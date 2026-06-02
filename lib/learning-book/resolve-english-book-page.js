import { ENGLISH_G1_BOOK_META, isValidEnglishG1PageId } from "./english-g1-registry.js";
import { ENGLISH_G2_BOOK_META, isValidEnglishG2PageId } from "./english-g2-registry.js";
import { ENGLISH_G3_BOOK_META, isValidEnglishG3PageId } from "./english-g3-registry.js";
import { ENGLISH_G4_BOOK_META, isValidEnglishG4PageId } from "./english-g4-registry.js";
import { ENGLISH_G5_BOOK_META, isValidEnglishG5PageId } from "./english-g5-registry.js";
import { ENGLISH_G6_BOOK_META, isValidEnglishG6PageId } from "./english-g6-registry.js";
import {
  findEnglishBookPageByPoolKey,
  firstEnglishBookPageForTopic,
  englishWordListKeyFromPageId,
} from "./english-book-practice-map.js";

/** @type {Record<string, { meta: typeof ENGLISH_G1_BOOK_META, isValid: (id: string) => boolean }>} */
const GRADE_BOOK = {
  g1: { meta: ENGLISH_G1_BOOK_META, isValid: isValidEnglishG1PageId },
  g2: { meta: ENGLISH_G2_BOOK_META, isValid: isValidEnglishG2PageId },
  g3: { meta: ENGLISH_G3_BOOK_META, isValid: isValidEnglishG3PageId },
  g4: { meta: ENGLISH_G4_BOOK_META, isValid: isValidEnglishG4PageId },
  g5: { meta: ENGLISH_G5_BOOK_META, isValid: isValidEnglishG5PageId },
  g6: { meta: ENGLISH_G6_BOOK_META, isValid: isValidEnglishG6PageId },
};

/**
 * @param {{
 *   grade?: string,
 *   topic?: string,
 *   forceKind?: string|null,
 *   pageId?: string|null,
 *   listKey?: string|null,
 *   englishPoolKey?: string|null,
 * }} ctx
 * @returns {string|null}
 */
export function resolveEnglishBookPageId(ctx) {
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;

  const directKeys = [ctx.pageId, ctx.forceKind]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  for (const key of directKeys) {
    if (cfg.isValid(key)) return key;
  }

  const topic = String(ctx.topic || "").trim();
  const listKey = String(ctx.listKey || "").trim();
  if (topic === "vocabulary" && listKey) {
    const fromList = `vocab_${listKey}`;
    if (cfg.isValid(fromList)) return fromList;
    const fromPool = findEnglishBookPageByPoolKey(gradeKey, "vocabulary", listKey);
    if (fromPool && cfg.isValid(fromPool)) return fromPool;
  }

  const poolKey = String(ctx.englishPoolKey || "").trim();
  if (topic && poolKey) {
    const fromPool = findEnglishBookPageByPoolKey(gradeKey, topic, poolKey);
    if (fromPool && cfg.isValid(fromPool)) return fromPool;
  }

  if (topic && topic !== "mixed") {
    const fromTopic = firstEnglishBookPageForTopic(gradeKey, topic);
    if (fromTopic && cfg.isValid(fromTopic)) return fromTopic;
  }

  return null;
}

/**
 * @param {{
 *   grade?: string,
 *   topic?: string,
 *   forceKind?: string|null,
 *   pageId?: string|null,
 *   listKey?: string|null,
 *   englishPoolKey?: string|null,
 * }} ctx
 * @returns {string|null}
 */
export function getEnglishBookHref(ctx) {
  const pageId = resolveEnglishBookPageId(ctx);
  if (!pageId) return null;
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;
  return `${cfg.meta.routeBase}/${pageId}`;
}

export { englishWordListKeyFromPageId };
