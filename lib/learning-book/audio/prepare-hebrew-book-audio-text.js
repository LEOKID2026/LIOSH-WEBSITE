/**
 * Extract child-facing spoken script from a Hebrew learning book section.
 * Pilot: Hebrew Grade 1 — one visible section at a time.
 *
 * Does NOT alter visible book markdown — TTS preparation only.
 */

import { flattenBookSectionVisibleLines } from "../book-visible-text-render.js";
import { applyLearningBookPronunciationCorrections } from "./learning-book-audio-pronunciation.js";

const HEBREW_HYPHEN_CHARS = "\u002D\u2010\u2011\u2012\u2013\u2014\u05BE\uFE58\uFE63\uFF0D";
const HEBREW_HYPHEN_RE = new RegExp(
  `([\\u0590-\\u05FF])[${HEBREW_HYPHEN_CHARS}]([\\u0590-\\u05FF])`,
  "g"
);
const ALF_BET_PHRASE_RE = new RegExp(`אלף[${HEBREW_HYPHEN_CHARS}]+בית`, "g");

const TECHNICAL_LINE =
  /(?:learning_page_id|skill_id|approval_status|page_type|age_band|docs\/|data\/|\.md\b|\.json\b|hebrew:g\d+:|g\d+\.[a-z_]+(?:\s|$))/i;

const SKIP_LINE_PREFIX =
  /^(?:רמז\s*:|הערה\s*:|מקור\s*:|Source references)/u;

const SCAFFOLDING_PREFIX =
  /^(?:שלב\s+\d+\s*:|שאלה\s*:|תשובה\s*:|מילה\s*:|הברה\s+\d+\s*:|סה״כ\s*:|סה"כ\s*:)/u;

/**
 * Normalize Hebrew maqaf / hyphen between letters for TTS (e.g. אלף בית → אלף בית).
 * @param {string} text
 * @returns {string}
 */
export function normalizeHebrewHyphensForTts(text) {
  let out = String(text || "").replace(ALF_BET_PHRASE_RE, "אלף בית");
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(HEBREW_HYPHEN_RE, "$1 $2");
  }
  return out.replace(ALF_BET_PHRASE_RE, "אלף בית");
}

/**
 * Strip scaffolding labels (שלב / שאלה / תשובה) but keep child-facing content.
 * @param {string} line
 * @returns {string}
 */
function unwrapScaffoldingLine(line) {
  let t = String(line || "").trim();
  if (SCAFFOLDING_PREFIX.test(t)) {
    t = t.replace(SCAFFOLDING_PREFIX, "").trim();
  }
  return t;
}

/**
 * @param {string} line
 * @returns {string}
 */
function normalizeSpokenLine(line) {
  return normalizeHebrewHyphensForTts(unwrapScaffoldingLine(line));
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function shouldSkipSpokenLine(line) {
  const t = normalizeSpokenLine(line);
  if (!t) return true;
  if (TECHNICAL_LINE.test(t)) return true;
  if (SKIP_LINE_PREFIX.test(t)) return true;
  if (/^[-*•]\s*(?:`|\*\*)/.test(t)) return true;
  if (/^[❌✓✔✗]\s*/u.test(t)) return true;
  if (/^\(רמז\s*:/u.test(t)) return true;
  if (!t.includes("(") && /\)\s*$/u.test(t)) return true;
  return false;
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeSpokenWhitespace(text) {
  return normalizeHebrewHyphensForTts(
    String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
  ).trim();
}

/**
 * @param {{ number: number, title: string, body: string }} section
 * @returns {string}
 */
function buildHebrewSectionSpokenScriptRaw(section) {
  if (!section?.body) return "";

  const { lines } = flattenBookSectionVisibleLines(section.body);
  const spokenLines = lines
    .map((row) => normalizeSpokenLine(row.rendered))
    .filter((line) => !shouldSkipSpokenLine(line));

  return normalizeSpokenWhitespace(spokenLines.join("\n"));
}

/**
 * @param {{ number: number, title: string, body: string }} section
 * @returns {string}
 */
export function prepareHebrewBookSectionAudioText(section) {
  const raw = buildHebrewSectionSpokenScriptRaw(section);
  if (!raw) return "";
  return applyLearningBookPronunciationCorrections(raw).text;
}

/**
 * @param {{ number: number, title: string, body: string }} section
 * @returns {{
 *   spokenScript: string,
 *   pronunciationReplacementsApplied: import("./learning-book-audio-pronunciation.js").LearningBookPronunciationReplacement[],
 *   mathExpressionConversionsApplied: string[],
 * }}
 */
export function prepareHebrewBookSectionAudioTextDetailed(section) {
  const raw = buildHebrewSectionSpokenScriptRaw(section);
  if (!raw) {
    return {
      spokenScript: "",
      pronunciationReplacementsApplied: [],
      mathExpressionConversionsApplied: [],
    };
  }
  const { text, pronunciationReplacementsApplied } = applyLearningBookPronunciationCorrections(raw);
  return {
    spokenScript: text,
    pronunciationReplacementsApplied,
    mathExpressionConversionsApplied: [],
  };
}

/**
 * @param {{
 *   displayTitle?: string,
 *   documentTitle?: string,
 *   pageId?: string,
 *   sections?: { number: number, title: string, body: string }[],
 * }} pageData
 * @param {number} sectionNumber
 * @returns {string}
 */
export function prepareHebrewBookAudioTextForSection(pageData, sectionNumber) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const sec = sections.find((s) => s.number === sectionNumber);
  if (!sec) return "";
  return prepareHebrewBookSectionAudioText(sec);
}

/**
 * @param {Parameters<typeof prepareHebrewBookAudioTextForSection>[0]} pageData
 * @param {number} sectionNumber
 * @returns {ReturnType<typeof prepareHebrewBookSectionAudioTextDetailed>}
 */
export function prepareHebrewBookAudioTextForSectionDetailed(pageData, sectionNumber) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const sec = sections.find((s) => s.number === sectionNumber);
  if (!sec) {
    return {
      spokenScript: "",
      pronunciationReplacementsApplied: [],
      mathExpressionConversionsApplied: [],
    };
  }
  return prepareHebrewBookSectionAudioTextDetailed(sec);
}

/**
 * @deprecated Use prepareHebrewBookAudioTextForSection for section-level audio.
 * @param {Parameters<typeof prepareHebrewBookAudioTextForSection>[0]} pageData
 * @returns {string}
 */
export function prepareHebrewBookAudioText(pageData) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const parts = sections
    .map((section) => prepareHebrewBookSectionAudioText(section))
    .filter(Boolean);
  return normalizeSpokenWhitespace(parts.join("\n\n"));
}
