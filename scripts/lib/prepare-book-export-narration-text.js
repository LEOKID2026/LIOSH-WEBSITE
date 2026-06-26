/**
 * Clean child-visible learning book section text for offline narration export.
 * Does not alter site content, TTS pronunciation rules, or math-to-speech conversion.
 */

import { flattenBookSectionVisibleLines } from "../../lib/learning-book/book-visible-text-render.js";
import { normalizeHebrewHyphensForTts } from "../../lib/learning-book/audio/prepare-hebrew-book-audio-text.js";

const TECHNICAL_LINE =
  /(?:learning_page_id|skill_id|approval_status|page_type|age_band|docs\/|data\/|\.md\b|\.json\b|(?:math|hebrew|english|science|geometry|moledet|geography):g\d+:)/i;

const SKIP_LINE_PREFIX =
  /^(?:רמז\s*:|הערה\s*:|מקור\s*:|Source references)/u;

const SCAFFOLDING_PREFIX =
  /^(?:שלב\s+\d+\s*:|שאלה\s*:|תשובה\s*:|מילה\s*:|הברה\s+\d+\s*:|סה״כ\s*:|סה"כ\s*:)/u;

const TECHNICAL_LEAK =
  /(?:learning_page_id|skill_id|approval_status|page_type|age_band|docs\/learning-book|data\/curriculum|\.md\b|\.json\b|TODO|TBD|FIXME|placeholder)/i;

/**
 * @param {string} line
 * @returns {string}
 */
function cleanExportLine(line) {
  let t = String(line || "").trim();
  t = t.replace(/^[❌✗]\s*/u, "");
  t = t.replace(/^[✓✔]\s*/u, "");
  if (SCAFFOLDING_PREFIX.test(t)) {
    t = t.replace(SCAFFOLDING_PREFIX, "").trim();
  }
  return normalizeHebrewHyphensForTts(t);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function shouldSkipExportLine(line) {
  const t = cleanExportLine(line);
  if (!t) return true;
  if (TECHNICAL_LINE.test(t)) return true;
  if (SKIP_LINE_PREFIX.test(t)) return true;
  if (/^\|/.test(t)) return true;
  if (/^[-*•]\s*(?:`|\*\*)/.test(t)) return true;
  if (/^#{1,6}\s/.test(t)) return true;
  if (!t.includes("(") && /\)\s*$/u.test(t)) return true;
  return false;
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeExportWhitespace(text) {
  return normalizeHebrewHyphensForTts(
    String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
  ).trim();
}

/**
 * @param {{ body?: string }} section
 * @returns {string}
 */
export function prepareBookSectionExportNarrationText(section) {
  if (!section?.body) return "";

  const { lines, diagramLines } = flattenBookSectionVisibleLines(section.body);
  /** @type {string[]} */
  const spokenLines = [];

  for (const row of lines) {
    const cleaned = cleanExportLine(row.rendered);
    if (!shouldSkipExportLine(cleaned)) {
      spokenLines.push(cleaned);
    }
  }

  for (const dl of diagramLines) {
    const cleaned = cleanExportLine(dl);
    if (!cleaned || shouldSkipExportLine(cleaned)) continue;
    spokenLines.push(cleaned);
  }

  return normalizeExportWhitespace(spokenLines.join("\n"));
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function hasTechnicalLeak(text) {
  return TECHNICAL_LEAK.test(String(text || ""));
}

/**
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
