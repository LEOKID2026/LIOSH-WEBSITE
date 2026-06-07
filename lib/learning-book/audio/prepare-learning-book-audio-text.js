/**
 * Subject dispatcher for learning book spoken-script preparation.
 */

import { prepareHebrewBookAudioTextForSection } from "./prepare-hebrew-book-audio-text.js";

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
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();

  if (s === "hebrew" && g === "g1") {
    const script = prepareHebrewBookAudioTextForSection(pageData, sectionNumber);
    return script || null;
  }

  void pageId;
  return null;
}
