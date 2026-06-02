import { SCIENCE_G1_BOOK_META, isValidScienceG1PageId } from "./science-g1-registry.js";
import { SCIENCE_G2_BOOK_META, isValidScienceG2PageId } from "./science-g2-registry.js";
import { SCIENCE_G3_BOOK_META, isValidScienceG3PageId } from "./science-g3-registry.js";
import { SCIENCE_G4_BOOK_META, isValidScienceG4PageId } from "./science-g4-registry.js";
import { SCIENCE_G5_BOOK_META, isValidScienceG5PageId } from "./science-g5-registry.js";
import { SCIENCE_G6_BOOK_META, isValidScienceG6PageId } from "./science-g6-registry.js";

/** @type {Record<string, { meta: typeof SCIENCE_G1_BOOK_META, isValid: (id: string) => boolean }>} */
const GRADE_BOOK = {
  g1: { meta: SCIENCE_G1_BOOK_META, isValid: isValidScienceG1PageId },
  g2: { meta: SCIENCE_G2_BOOK_META, isValid: isValidScienceG2PageId },
  g3: { meta: SCIENCE_G3_BOOK_META, isValid: isValidScienceG3PageId },
  g4: { meta: SCIENCE_G4_BOOK_META, isValid: isValidScienceG4PageId },
  g5: { meta: SCIENCE_G5_BOOK_META, isValid: isValidScienceG5PageId },
  g6: { meta: SCIENCE_G6_BOOK_META, isValid: isValidScienceG6PageId },
};

/**
 * @param {{ grade?: string, topic?: string, kind?: string|null }} ctx
 * @returns {string|null}
 */
export function resolveScienceBookPageId({ grade, topic, kind }) {
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
export function getScienceBookHref(ctx) {
  const pageId = resolveScienceBookPageId(ctx);
  if (!pageId) return null;
  const gradeKey = String(ctx.grade || "").toLowerCase();
  const cfg = GRADE_BOOK[gradeKey];
  if (!cfg) return null;
  return `${cfg.meta.routeBase}/${pageId}`;
}
