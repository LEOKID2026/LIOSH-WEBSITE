import { MOLEDET_G2_BOOK_META, isValidMoledetG2PageId } from "./moledet-g2-registry.js";
import { MOLEDET_G3_BOOK_META, isValidMoledetG3PageId } from "./moledet-g3-registry.js";
import { MOLEDET_G4_BOOK_META, isValidMoledetG4PageId } from "./moledet-g4-registry.js";
import { GEOGRAPHY_G5_BOOK_META, isValidGeographyG5PageId } from "./geography-g5-registry.js";
import { GEOGRAPHY_G6_BOOK_META, isValidGeographyG6PageId } from "./geography-g6-registry.js";
import { firstMoledetGeographyBookPageForTopic } from "./moledet-geography-book-practice-map.js";

/** @type {Record<string, { meta: typeof MOLEDET_G2_BOOK_META, isValid: (id: string) => boolean }>} */
const GRADE_BOOK = {
  g2: { meta: MOLEDET_G2_BOOK_META, isValid: isValidMoledetG2PageId },
  g3: { meta: MOLEDET_G3_BOOK_META, isValid: isValidMoledetG3PageId },
  g4: { meta: MOLEDET_G4_BOOK_META, isValid: isValidMoledetG4PageId },
  g5: { meta: GEOGRAPHY_G5_BOOK_META, isValid: isValidGeographyG5PageId },
  g6: { meta: GEOGRAPHY_G6_BOOK_META, isValid: isValidGeographyG6PageId },
};

/**
 * @param {string} gradeKey
 * @returns {"moledet"|"geography"|null}
 */
export function getMoledetGeographyBookSubjectForGrade(gradeKey) {
  const g = String(gradeKey || "").toLowerCase();
  if (["g2", "g3", "g4"].includes(g)) return "moledet";
  if (["g5", "g6"].includes(g)) return "geography";
  return null;
}

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null, forceKind?: string|null, pageId?: string|null }} ctx
 * @returns {string|null}
 */
export function resolveMoledetGeographyBookPageId({ grade, topic, kind, forceKind, pageId }) {
  const gradeKey = String(grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;

  const directKeys = [pageId, forceKind, kind]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  for (const key of directKeys) {
    if (cfg.isValid(key)) return key;
  }

  const topicKey = String(topic || "").trim();
  if (!topicKey || topicKey === "mixed") return null;

  const fromTopic = firstMoledetGeographyBookPageForTopic(gradeKey, topicKey);
  if (fromTopic && cfg.isValid(fromTopic)) {
    return fromTopic;
  }

  return null;
}

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null, forceKind?: string|null, pageId?: string|null }} ctx
 * @returns {string|null}
 */
export function getMoledetGeographyBookHref(ctx) {
  const pageId = resolveMoledetGeographyBookPageId(ctx);
  if (!pageId) return null;
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;
  return `${cfg.meta.routeBase}/${pageId}`;
}
