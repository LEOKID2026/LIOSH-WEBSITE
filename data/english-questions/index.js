import { enrichEnglishPoolMapWithCanonicalMetadata } from "../../lib/learning/english-canonical-metadata.js";
import { isEnglishPhonicsCopyLeakRow } from "../../utils/lower-grade-practice-runtime-quality.js";
import { WORD_LISTS } from "./word-lists.js";
import { GRAMMAR_POOLS as GRAMMAR_POOLS_RAW } from "./grammar-pools.js";
import { SENTENCE_POOLS as SENTENCE_POOLS_RAW } from "./sentence-pools.js";
import { TRANSLATION_POOLS as TRANSLATION_POOLS_RAW } from "./translation-pools.js";
import { PHONICS_G1_POOL as PHONICS_G1_POOL_RAW } from "./phonics-g1.js";
import { PHONICS_G2_POOL as PHONICS_G2_POOL_RAW } from "./phonics-g2.js";

export { WORD_LISTS };
export { PHONICS_G1_POOL_RAW as PHONICS_G1_POOL };
export { PHONICS_G2_POOL_RAW as PHONICS_G2_POOL };

export const GRAMMAR_POOLS = enrichEnglishPoolMapWithCanonicalMetadata(
  GRAMMAR_POOLS_RAW,
  "grammar"
);
export const SENTENCE_POOLS = enrichEnglishPoolMapWithCanonicalMetadata(
  SENTENCE_POOLS_RAW,
  "sentences"
);
export const TRANSLATION_POOLS = enrichEnglishPoolMapWithCanonicalMetadata(
  TRANSLATION_POOLS_RAW,
  "translation"
);

/** G1/G2 phonics pools — Phase 4B integration (runtime excludes requiresAudio rows). */
export const PHONICS_POOLS = Object.freeze({
  g1: enrichEnglishPoolMapWithCanonicalMetadata({ g1: PHONICS_G1_POOL_RAW }, "phonics").g1,
  g2: enrichEnglishPoolMapWithCanonicalMetadata({ g2: PHONICS_G2_POOL_RAW }, "phonics").g2,
});

/** Self-practice blocked until picture/listening UI exists (static bank may still contain rows). */
export const PHONICS_RUNTIME_BLOCKED_ITEM_TYPES = Object.freeze(
  new Set([
    "picture_word_matching",
    "hear_word_choose_picture_word",
    "simple_listening_instruction",
    "simple_sentence_exposure",
  ])
);

const PHONICS_STIMULUS_REQUIRED_ITEM_TYPES = new Set([
  "choose_matching_letter",
  "match_uppercase_lowercase",
  "early_word_reading",
]);

/**
 * Visible letter/word stimulus for MCQ stem body (not picture assets).
 * @param {Record<string, unknown>|null|undefined} row
 */
export function getPhonicsPracticeStimulus(row) {
  const displayWord = String(row?.displayWord ?? "").trim();
  if (displayWord) return displayWord;
  return String(row?.displayRef ?? "").trim();
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isPhonicsRowRuntimeDisplayable(row) {
  if (!row || row.requiresAudio === true) return false;
  if (PHONICS_RUNTIME_BLOCKED_ITEM_TYPES.has(row.itemType)) return false;
  if (isEnglishPhonicsCopyLeakRow(row)) return false;
  if (row.pictureRef) return false;
  if (/תמונה/u.test(String(row.question || ""))) return false;
  if (PHONICS_STIMULUS_REQUIRED_ITEM_TYPES.has(row.itemType)) {
    return Boolean(getPhonicsPracticeStimulus(row));
  }
  return true;
}

/**
 * Practice rows safe for runtime without practice-item audio or missing UI stimulus.
 * @param {readonly import("./phonics-g1.js").PHONICS_G1_POOL[number][]} pool
 */
export function filterRuntimeEligiblePhonicsRows(pool) {
  return (pool || []).filter(isPhonicsRowRuntimeDisplayable);
}

/**
 * @param {"g1"|"g2"|string} gradeKey
 * @param {string} [forceKind] book pageId
 */
export function getRuntimeEligiblePhonicsPool(gradeKey, forceKind = "") {
  const key = String(gradeKey || "").toLowerCase();
  if (key !== "g1" && key !== "g2") return [];
  const gNum = parseInt(key.replace(/\D/g, ""), 10) || 0;
  const raw = key === "g1" ? PHONICS_G1_POOL_RAW : PHONICS_G2_POOL_RAW;
  let pool = filterRuntimeEligiblePhonicsRows(raw).filter(
    (row) => row.minGrade <= gNum && row.maxGrade >= gNum
  );
  if (forceKind) {
    const ref = `english:${key}:${String(forceKind).trim()}`;
    pool = pool.filter((row) => row.bookPageRef === ref);
  }
  return pool;
}

export function countRuntimeEligiblePhonicsItems() {
  return {
    g1: getRuntimeEligiblePhonicsPool("g1").length,
    g2: getRuntimeEligiblePhonicsPool("g2").length,
    total:
      getRuntimeEligiblePhonicsPool("g1").length +
      getRuntimeEligiblePhonicsPool("g2").length,
  };
}
