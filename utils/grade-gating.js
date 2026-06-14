/**
 * Grade gating — hard pool membership by gradeKey (g1–g6).
 * Bands: early = g1–g2, mid = g3–g4, late = g5–g6.
 */

export const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

/**
 * @param {string|number|null|undefined} key
 * @returns {number|null} 1–6 or null
 */
export function parseGradeKey(key) {
  if (key == null) return null;
  if (typeof key === "number" && key >= 1 && key <= 6) return key;
  const s = String(key).toLowerCase().trim();
  const m = s.match(/^g([1-6])$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * @param {string} gradeKey
 * @returns {number} 0-based index or -1
 */
export function gradeIndex(gradeKey) {
  const n = parseGradeKey(gradeKey);
  return n != null ? n - 1 : -1;
}

/**
 * @param {string} gradeKey
 * @returns {"early"|"mid"|"late"|null}
 */
export function gradeBandForKey(gradeKey) {
  const n = parseGradeKey(gradeKey);
  if (n == null) return null;
  if (n <= 2) return "early";
  if (n <= 4) return "mid";
  return "late";
}

/**
 * @param {string} gradeKey
 * @param {number} minG inclusive 1–6
 * @param {number} maxG inclusive 1–6
 */
export function gradeInRange(gradeKey, minG, maxG) {
  const n = parseGradeKey(gradeKey);
  if (n == null) return false;
  return n >= minG && n <= maxG;
}

/**
 * Item may define (first match wins):
 * - gradeBand: "early" | "mid" | "late"
 * - minGrade / maxGrade (inclusive, 1–6)
 * - grades: string[] e.g. ["g3","g4"] (legacy allow-list)
 * If none: allowed for all grades (use sparingly).
 */
export function itemAllowedForGrade(item, gradeKey) {
  if (!item || typeof item !== "object") return false;
  const n = parseGradeKey(gradeKey);
  if (n == null) return false;
  if (item.gradeBand) {
    const b = gradeBandForKey(gradeKey);
    return b === item.gradeBand;
  }
  if (item.minGrade != null || item.maxGrade != null) {
    const lo = item.minGrade ?? 1;
    const hi = item.maxGrade ?? 6;
    return n >= lo && n <= hi;
  }
  if (Array.isArray(item.grades) && item.grades.length > 0) {
    const want = `g${n}`;
    return item.grades.map((g) => String(g).toLowerCase()).includes(want);
  }
  return true;
}

export function assertGradeAllowed(item, gradeKey, label = "item") {
  if (!itemAllowedForGrade(item, gradeKey)) {
    console.warn(`[grade-gating] ${label} not allowed for ${gradeKey}`, item);
  }
}

/** @type {Record<string, { minGrade: number, maxGrade: number }>} */
export const ENGLISH_GRAMMAR_POOL_RANGE = {
  be_basic: { minGrade: 1, maxGrade: 2 },
  question_frames: { minGrade: 2, maxGrade: 3 },
  present_simple: { minGrade: 3, maxGrade: 4 },
  progressive: { minGrade: 4, maxGrade: 4 },
  quantifiers: { minGrade: 4, maxGrade: 5 },
  past_simple: { minGrade: 5, maxGrade: 5 },
  modals: { minGrade: 5, maxGrade: 6 },
  comparatives: { minGrade: 5, maxGrade: 6 },
  future_forms: { minGrade: 5, maxGrade: 5 },
  complex_tenses: { minGrade: 6, maxGrade: 6 },
  conditionals: { minGrade: 6, maxGrade: 6 },
};

/** @type {Record<string, { minGrade: number, maxGrade: number }>} */
export const ENGLISH_TRANSLATION_POOL_RANGE = {
  classroom: { minGrade: 1, maxGrade: 2 },
  routines: { minGrade: 2, maxGrade: 3 },
  hobbies: { minGrade: 3, maxGrade: 4 },
  community: { minGrade: 4, maxGrade: 5 },
  technology: { minGrade: 5, maxGrade: 6 },
  global: { minGrade: 5, maxGrade: 6 },
  global_advanced: { minGrade: 6, maxGrade: 6 },
  phase_b_routines: { minGrade: 2, maxGrade: 3 },
  phase_b_hobbies: { minGrade: 3, maxGrade: 4 },
  phase_b_community: { minGrade: 4, maxGrade: 5 },
  phase_b_technology: { minGrade: 5, maxGrade: 6 },
};

/** @type {Record<string, { minGrade: number, maxGrade: number }>} */
export const ENGLISH_SENTENCE_POOL_RANGE = {
  base: { minGrade: 1, maxGrade: 2 },
  routine: { minGrade: 2, maxGrade: 4 },
  descriptive: { minGrade: 3, maxGrade: 4 },
  narrative: { minGrade: 4, maxGrade: 5 },
  advanced: { minGrade: 5, maxGrade: 6 },
  assigned_sentence_mcq: { minGrade: 3, maxGrade: 6 },
};

/**
 * @param {"grammar"|"translation"|"sentence"} category
 * @param {string} poolKey
 * @param {object} item
 * @param {string} gradeKey
 */
export function englishPoolItemAllowed(category, poolKey, item, gradeKey) {
  const n = parseGradeKey(gradeKey);
  if (n == null) return false;
  const hasItemGate =
    item.gradeBand != null ||
    item.minGrade != null ||
    item.maxGrade != null ||
    (Array.isArray(item.grades) && item.grades.length > 0);
  if (hasItemGate) return itemAllowedForGrade(item, gradeKey);
  const map =
    category === "grammar"
      ? ENGLISH_GRAMMAR_POOL_RANGE
      : category === "translation"
        ? ENGLISH_TRANSLATION_POOL_RANGE
        : ENGLISH_SENTENCE_POOL_RANGE;
  const r = map[poolKey];
  if (!r) return true;
  return n >= r.minGrade && n <= r.maxGrade;
}

export function englishItemHasExplicitGradeGate(item) {
  if (!item || typeof item !== "object") return false;
  return (
    item.gradeBand != null ||
    item.minGrade != null ||
    item.maxGrade != null ||
    (Array.isArray(item.grades) && item.grades.length > 0)
  );
}

function englishContentKeyForClassSplit(category, item) {
  if (category === "grammar") return String(item.question || "");
  if (category === "translation") return String(item.en || item.question || "");
  if (category === "sentence")
    return String(item.template || item.question || "");
  return String(item.question || "");
}

/** פיצול דטרמיניסטי לפי תוכן (FNV-1a) — שימוש חוזר: אנגלית, כתיבה, וכו'. */
export function englishClassSplitBucket(key, mod) {
  let h = 2166136261 >>> 0;
  const s = String(key || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0) % mod;
}

/**
 * שער אנגלית: טווח בריכה + פיצול דטרמיניסטי g3|g4, g4|g5, g5|g6 כשאין שער פריט.
 */
export function englishPoolItemAllowedWithClassSplit(
  category,
  poolKey,
  item,
  gradeKey
) {
  if (!englishPoolItemAllowed(category, poolKey, item, gradeKey)) return false;
  const n = parseGradeKey(gradeKey);
  if (n == null) return false;
  if (englishItemHasExplicitGradeGate(item)) return true;

  const ck = englishContentKeyForClassSplit(category, item);

  if (
    category === "grammar" &&
    poolKey === "be_basic" &&
    n >= 1 &&
    n <= 2
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 1 && b !== 0) return false;
    if (n === 2 && b !== 1) return false;
    return true;
  }

  if (
    category === "grammar" &&
    poolKey === "question_frames" &&
    n >= 2 &&
    n <= 3
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 2 && b !== 0) return false;
    if (n === 3 && b !== 1) return false;
    return true;
  }

  if (
    category === "grammar" &&
    poolKey === "present_simple" &&
    n >= 3 &&
    n <= 4
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 3 && b !== 0) return false;
    if (n === 4 && b !== 1) return false;
    return true;
  }

  if (
    category === "grammar" &&
    poolKey === "quantifiers" &&
    n >= 4 &&
    n <= 5
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 4 && b !== 0) return false;
    if (n === 5 && b !== 1) return false;
    return true;
  }

  if (
    category === "translation" &&
    poolKey === "hobbies" &&
    n >= 3 &&
    n <= 4
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 3 && b !== 0) return false;
    if (n === 4 && b !== 1) return false;
    return true;
  }

  if (
    category === "translation" &&
    poolKey === "routines" &&
    n >= 2 &&
    n <= 3
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 2 && b !== 0) return false;
    if (n === 3 && b !== 1) return false;
    return true;
  }

  if (
    category === "translation" &&
    poolKey === "community" &&
    n >= 4 &&
    n <= 5
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 4 && b !== 0) return false;
    if (n === 5 && b !== 1) return false;
    return true;
  }

  if (
    category === "translation" &&
    (poolKey === "technology" || poolKey === "global") &&
    n >= 5 &&
    n <= 6
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 5 && b !== 0) return false;
    if (n === 6 && b !== 1) return false;
    return true;
  }

  if (
    category === "grammar" &&
    (poolKey === "modals" || poolKey === "comparatives") &&
    n >= 5 &&
    n <= 6
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 5 && b !== 0) return false;
    if (n === 6 && b !== 1) return false;
    return true;
  }

  if (
    category === "sentence" &&
    poolKey === "routine" &&
    n >= 2 &&
    n <= 4
  ) {
    const b = englishClassSplitBucket(ck, 3);
    if (n === 2 && b !== 0) return false;
    if (n === 3 && b !== 1) return false;
    if (n === 4 && b !== 2) return false;
    return true;
  }

  if (
    category === "sentence" &&
    poolKey === "descriptive" &&
    n >= 3 &&
    n <= 4
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 3 && b !== 0) return false;
    if (n === 4 && b !== 1) return false;
    return true;
  }

  if (
    category === "sentence" &&
    poolKey === "narrative" &&
    n >= 4 &&
    n <= 5
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 4 && b !== 0) return false;
    if (n === 5 && b !== 1) return false;
    return true;
  }

  if (
    category === "sentence" &&
    poolKey === "advanced" &&
    n >= 5 &&
    n <= 6
  ) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 5 && b !== 0) return false;
    if (n === 6 && b !== 1) return false;
    return true;
  }

  return true;
}

/**
 * פיצול משפטי כתיבה (מצב sentence_extended) בין כיתות ה׳/ו׳ כשאין שער פריט.
 */
export function englishWritingSentenceAllowedForGrade(gradeKey, item) {
  const n = parseGradeKey(gradeKey);
  if (n == null) return true;
  const ck = String(item?.he || item?.en || "");
  if (n === 5 || n === 6) {
    const b = englishClassSplitBucket(ck, 2);
    if (n === 5 && b !== 0) return false;
    if (n === 6 && b !== 1) return false;
  }
  return true;
}

/**
 * רמת קושי (easy / medium / hard) — אם יש allowedLevels על הפריט, חייב להתאים.
 * אם אין — מותר לכל הרמות.
 */
export function itemAllowedForLevel(item, levelKey) {
  if (!item || typeof item !== "object") return true;
  const l = String(levelKey || "easy").toLowerCase();
  if (Array.isArray(item.allowedLevels) && item.allowedLevels.length > 0) {
    return item.allowedLevels.map((x) => String(x).toLowerCase()).includes(l);
  }
  return true;
}

export function itemAllowedForGradeAndLevel(item, gradeKey, levelKey) {
  return (
    itemAllowedForGrade(item, gradeKey) &&
    itemAllowedForLevel(item, levelKey)
  );
}

/** מפתחות רשימות מילים מותרות לכיתה (ללא חשיפה לכל WORD_LISTS) */
export function englishVocabListKeysForGrade(gradeKey, wordListsObject) {
  const n = parseGradeKey(gradeKey);
  if (n == null) return ["colors"];
  // Dynamic import avoided — נשען על מפת ברירת מחדל תואמת data/english-curriculum.js
  const byGrade = {
    g1: ["colors", "numbers", "family", "animals", "emotions", "actions", "school"],
    g2: [
      "colors",
      "numbers",
      "family",
      "animals",
      "emotions",
      "school",
      "food",
      "actions",
      "house",
    ],
    g3: [
      "animals",
      "colors",
      "numbers",
      "family",
      "body",
      "food",
      "school",
      "weather",
      "sports",
      "actions",
      "house",
    ],
    g4: [
      "animals",
      "family",
      "body",
      "food",
      "school",
      "weather",
      "sports",
      "travel",
      "community",
      "environment",
      "emotions",
    ],
    g5: [
      "animals",
      "family",
      "food",
      "school",
      "sports",
      "travel",
      "environment",
      "health",
      "technology",
      "emotions",
    ],
    g6: [
      "technology",
      "environment",
      "health",
      "travel",
      "global_issues",
      "emotions",
      "school",
      "sports",
    ],
  };
  const want = `g${n}`;
  const keys = byGrade[want] || byGrade.g3;
  if (!wordListsObject || typeof wordListsObject !== "object") return keys;
  return keys.filter((k) => wordListsObject[k]);
}

/** מצב כתיבה: מינימום כיתה (אנגלית) */
export function englishWritingModeAllowed(mode, gradeKey) {
  const n = parseGradeKey(gradeKey) || 3;
  if (mode === "sentence_master") return n >= 6;
  if (mode === "sentence_extended") return n >= 4;
  if (mode === "sentence_basic") return n >= 2;
  return true;
}
