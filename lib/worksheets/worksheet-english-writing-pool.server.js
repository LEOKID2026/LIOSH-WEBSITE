/**
 * English writing pool for worksheet generation — existing sentences + vocab words.
 * @module lib/worksheets/worksheet-english-writing-pool.server
 */

import { WORD_LISTS } from "../../data/english-questions/word-lists.js";
import { ENGLISH_GRADES } from "../../data/english-curriculum.js";
import {
  englishVocabListKeysForGrade,
  englishWritingModeAllowed,
  englishWritingSentenceAllowedForGrade,
} from "../../utils/grade-gating.js";

/** Mirrors utils/english-question-generator.js GRADE_PROFILES writing/vocab pools. */
const ENGLISH_WORKSHEET_GRADE_PROFILES = {
  g1: { translationPools: ["classroom"], writingPools: ["word"] },
  g2: {
    translationPools: ["classroom", "routines", "phase_b_routines"],
    writingPools: ["word", "sentence_basic"],
  },
  g3: {
    translationPools: ["routines", "hobbies", "phase_b_routines", "phase_b_hobbies"],
    writingPools: ["word", "sentence_basic"],
  },
  g4: {
    translationPools: ["hobbies", "community", "phase_b_hobbies", "phase_b_community"],
    writingPools: ["word", "sentence_basic", "sentence_extended"],
  },
  g5: {
    translationPools: ["community", "technology", "phase_b_community", "phase_b_technology"],
    writingPools: ["sentence_extended", "word"],
  },
  g6: {
    translationPools: ["technology", "global", "global_advanced", "phase_b_technology"],
    writingPools: ["sentence_extended", "sentence_master"],
  },
};

const WRITING_SENTENCES_BASIC = [
  { en: "Good morning", he: "בוקר טוב" },
  { en: "Good night", he: "לילה טוב" },
  { en: "I love my dog", he: "אני אוהב את הכלב שלי" },
  { en: "I am happy", he: "אני שמח" },
];

const WRITING_SENTENCES_ADVANCED = [
  { en: "I will visit my grandparents tomorrow", he: "אני אבקר את סבא וסבתא מחר" },
  { en: "We are going to start a science project", he: "אנחנו הולכים להתחיל פרויקט מדעים" },
  { en: "If it rains, we will stay at home", he: "אם ירד גשם, נישאר בבית" },
  { en: "I have already finished my homework", he: "כבר סיימתי את שיעורי הבית שלי" },
];

const WRITING_SENTENCES_MASTER = [
  { en: "We should protect the forest to keep animals safe", he: "אנחנו צריכים להגן על היער כדי לשמור על החיות" },
  { en: "By working together, we can solve difficult problems", he: "בעבודה משותפת נוכל לפתור בעיות קשות" },
  { en: "I have never forgotten the trip to the science park", he: "מעולם לא שכחתי את הטיול לפארק המדע" },
  { en: "If we recycle plastic, the beach stays beautiful", he: "אם נמחזר פלסטיק, החוף יישאר יפה" },
];

/**
 * @param {string} gradeKey
 * @returns {string[]}
 */
function gradeWritingPoolKeys(gradeKey) {
  const profile = ENGLISH_WORKSHEET_GRADE_PROFILES[gradeKey] || ENGLISH_WORKSHEET_GRADE_PROFILES.g3;
  const pools = profile.writingPools || ["word", "sentence_basic"];
  return pools.filter((m) => englishWritingModeAllowed(m, gradeKey));
}

/**
 * @param {string} gradeKey
 * @returns {Array<{ en: string, he: string, patternFamily: string, subtype: string }>}
 */
export function listEnglishWritingSentencePoolForGrade(gradeKey) {
  const modes = new Set(gradeWritingPoolKeys(gradeKey));
  /** @type {Array<{ en: string, he: string, patternFamily: string, subtype: string }>} */
  const out = [];
  const push = (rows, patternFamily, subtype) => {
    for (const row of rows) {
      if (!englishWritingSentenceAllowedForGrade(gradeKey, row)) continue;
      out.push({ ...row, patternFamily, subtype });
    }
  };
  if (modes.has("sentence_basic")) {
    push(WRITING_SENTENCES_BASIC, "writing_sentence_basic", "sentence_basic");
  }
  if (modes.has("sentence_extended")) {
    push(WRITING_SENTENCES_ADVANCED, "writing_sentence_extended", "sentence_extended");
  }
  if (modes.has("sentence_master")) {
    push(WRITING_SENTENCES_MASTER, "writing_sentence_master", "sentence_master");
  }
  return out;
}

/**
 * @param {string} gradeKey
 * @returns {Array<{ en: string, he: string, patternFamily: string, subtype: string, listKey: string }>}
 */
export function listEnglishWritingWordPoolForGrade(gradeKey) {
  const gradeWordLists = ENGLISH_GRADES[gradeKey]?.wordLists || [];
  const curriculumLists = englishVocabListKeysForGrade(gradeKey, WORD_LISTS);
  const listKeys = (gradeWordLists.length ? gradeWordLists : curriculumLists).filter(
    (key) => WORD_LISTS[key]
  );
  /** @type {Array<{ en: string, he: string, patternFamily: string, subtype: string, listKey: string }>} */
  const out = [];
  for (const key of listKeys) {
    const listObj = WORD_LISTS[key] || {};
    if (Array.isArray(listObj)) {
      for (const pair of listObj) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const [en, he] = pair;
        out.push({
          en: String(en),
          he: String(he),
          patternFamily: "writing_word",
          subtype: "word",
          listKey: key,
        });
      }
      continue;
    }
    for (const [en, he] of Object.entries(listObj)) {
      if (!en || he == null) continue;
      out.push({
        en: String(en),
        he: String(he),
        patternFamily: "writing_word",
        subtype: "word",
        listKey: key,
      });
    }
  }
  return out;
}

/**
 * Full printable writing pool for worksheets (sentences first, then words if needed).
 * @param {string} gradeKey
 */
export function listEnglishWorksheetWritingPool(gradeKey) {
  const sentences = listEnglishWritingSentencePoolForGrade(gradeKey);
  const words = listEnglishWritingWordPoolForGrade(gradeKey);
  const seen = new Set(sentences.map((s) => `${s.he}|${s.en}`));
  for (const w of words) {
    const fp = `${w.he}|${w.en}`;
    if (seen.has(fp)) continue;
    seen.add(fp);
    sentences.push(w);
    if (sentences.length >= 24) break;
  }
  return sentences;
}

/**
 * @param {Object} row
 * @param {string} gradeKey
 * @param {string} levelKey
 * @returns {Record<string, unknown>}
 */
export function englishWritingItemFromPoolRow(row, gradeKey, levelKey) {
  const isWord = row.subtype === "word";
  const question = isWord
    ? `כתוב באנגלית: "${row.he}"`
    : `כתוב באנגלית: "${row.he}"`;
  return {
    question,
    correctAnswer: row.en,
    answerMode: "typing",
    subject: "english",
    topic: "writing",
    operation: "writing",
    gradeLevel: gradeKey,
    writingSpaceLines: 6,
    params: {
      answerMode: "typing",
      gradeKey,
      levelKey,
      direction: "he_to_en",
      patternFamily: row.patternFamily,
      subtype: row.subtype,
      ...(isWord
        ? { type: "word", wordHe: row.he, wordEn: row.en }
        : { type: "sentence", sentenceHe: row.he, sentenceEn: row.en }),
    },
  };
}
