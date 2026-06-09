/**
 * Subject dispatcher for learning book spoken-script preparation.
 */

import {
  prepareHebrewBookAudioTextForSection,
  prepareHebrewBookAudioTextForSectionDetailed,
} from "./prepare-hebrew-book-audio-text.js";
import {
  prepareMathBookAudioTextForSection,
  prepareMathBookAudioTextForSectionDetailed,
} from "./prepare-math-book-audio-text.js";
import {
  prepareEnglishBookAudioTextForSection,
  prepareEnglishBookAudioTextForSectionDetailed,
} from "./prepare-english-book-audio-text.js";

/**
 * @typedef {{
 *   spokenScript: string,
 *   ssml?: string,
 *   pronunciationReplacementsApplied: import("./learning-book-audio-pronunciation.js").LearningBookPronunciationReplacement[],
 *   mathExpressionConversionsApplied: string[],
 * }} BookSectionAudioTextDetail
 */

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {{
 *   displayTitle?: string,
 *   documentTitle?: string,
 *   pageId?: string,
 *   sections?: { number: number, title: string, body: string }[],
 * }} pageData
 * @param {number} sectionNumber 1-based section.number
 * @returns {string|null}
 */
export function prepareBookSectionAudioText(subject, grade, pageId, pageData, sectionNumber) {
  const detail = prepareBookSectionAudioTextDetailed(subject, grade, pageId, pageData, sectionNumber);
  return detail.spokenScript || null;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {Parameters<typeof prepareBookSectionAudioText>[3]} pageData
 * @param {number} sectionNumber
 * @returns {BookSectionAudioTextDetail}
 */
export function prepareBookSectionAudioTextDetailed(subject, grade, pageId, pageData, sectionNumber) {
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();

  if (s === "hebrew" && g === "g1") {
    return prepareHebrewBookAudioTextForSectionDetailed(pageData, sectionNumber);
  }

  if (s === "math" && g === "g1") {
    return prepareMathBookAudioTextForSectionDetailed(pageData, sectionNumber);
  }

  if (s === "english" && (g === "g1" || g === "g2")) {
    return prepareEnglishBookAudioTextForSectionDetailed(pageData, sectionNumber);
  }

  void pageId;
  return {
    spokenScript: "",
    ssml: "",
    pronunciationReplacementsApplied: [],
    mathExpressionConversionsApplied: [],
  };
}
