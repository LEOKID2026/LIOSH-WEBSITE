import { enrichEnglishPoolMapWithCanonicalMetadata } from "../../lib/learning/english-canonical-metadata.js";
import { WORD_LISTS } from "./word-lists.js";
import { GRAMMAR_POOLS as GRAMMAR_POOLS_RAW } from "./grammar-pools.js";
import { SENTENCE_POOLS as SENTENCE_POOLS_RAW } from "./sentence-pools.js";
import { TRANSLATION_POOLS as TRANSLATION_POOLS_RAW } from "./translation-pools.js";

export { WORD_LISTS };

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

