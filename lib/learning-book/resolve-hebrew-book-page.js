import { HEBREW_G1_BOOK_META, isValidHebrewG1PageId } from "./hebrew-g1-registry.js";
import { HEBREW_G2_BOOK_META, isValidHebrewG2PageId } from "./hebrew-g2-registry.js";
import { HEBREW_G3_BOOK_META, isValidHebrewG3PageId } from "./hebrew-g3-registry.js";
import { HEBREW_G4_BOOK_META, isValidHebrewG4PageId } from "./hebrew-g4-registry.js";
import { HEBREW_G5_BOOK_META, isValidHebrewG5PageId } from "./hebrew-g5-registry.js";
import { HEBREW_G6_BOOK_META, isValidHebrewG6PageId } from "./hebrew-g6-registry.js";
import {
  findHebrewBookPageByRichPattern,
  firstHebrewBookPageForTopic,
} from "./hebrew-book-practice-map.js";

/** @type {Record<string, { meta: typeof HEBREW_G1_BOOK_META, isValid: (id: string) => boolean }>} */
const GRADE_BOOK = {
  g1: { meta: HEBREW_G1_BOOK_META, isValid: isValidHebrewG1PageId },
  g2: { meta: HEBREW_G2_BOOK_META, isValid: isValidHebrewG2PageId },
  g3: { meta: HEBREW_G3_BOOK_META, isValid: isValidHebrewG3PageId },
  g4: { meta: HEBREW_G4_BOOK_META, isValid: isValidHebrewG4PageId },
  g5: { meta: HEBREW_G5_BOOK_META, isValid: isValidHebrewG5PageId },
  g6: { meta: HEBREW_G6_BOOK_META, isValid: isValidHebrewG6PageId },
};

/**
 * @param {{
 *   grade?: string,
 *   operation?: string,
 *   topic?: string,
 *   kind?: string|null,
 *   subtopicId?: string|null,
 *   patternFamily?: string|null,
 *   subtype?: string|null,
 * }} ctx
 * @returns {string|null}
 */
export function resolveHebrewBookPageId(ctx) {
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;

  const directKeys = [
    ctx.kind,
    ctx.subtopicId,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  for (const key of directKeys) {
    if (cfg.isValid(key)) return key;
  }

  const patternFamily = String(ctx.patternFamily || "").trim();
  const subtype = String(ctx.subtype || "").trim();
  if (patternFamily && subtype) {
    const fromRich = findHebrewBookPageByRichPattern(
      gradeKey,
      patternFamily,
      subtype
    );
    if (fromRich && cfg.isValid(fromRich)) return fromRich;
  }

  const op = String(ctx.operation || ctx.topic || "").trim();
  if (!op || op === "mixed") return null;

  const fromTopic = firstHebrewBookPageForTopic(gradeKey, op);
  if (fromTopic && cfg.isValid(fromTopic)) return fromTopic;

  return null;
}

/**
 * @param {{
 *   grade?: string,
 *   operation?: string,
 *   topic?: string,
 *   kind?: string|null,
 *   subtopicId?: string|null,
 *   patternFamily?: string|null,
 *   subtype?: string|null,
 * }} ctx
 * @returns {string|null}
 */
export function getHebrewBookHref(ctx) {
  const pageId = resolveHebrewBookPageId(ctx);
  if (!pageId) return null;
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;
  return `${cfg.meta.routeBase}/${pageId}`;
}
