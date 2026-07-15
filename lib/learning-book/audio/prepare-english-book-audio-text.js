/**
 * Extract child-facing spoken script from English phonics learning book sections.
 * Phase 4B Step 4 — Hebrew narration + US English tokens via mixed SSML at generation time.
 *
 * Does NOT alter visible book markdown — TTS preparation only.
 */

import { flattenBookSectionVisibleLines } from "../book-visible-text-render.js";
import { normalizeHebrewHyphensForTts } from "./prepare-hebrew-book-audio-text.js";
import {
  ENGLISH_BOOK_AUDIO_EN_VOICE,
  ENGLISH_BOOK_AUDIO_HE_VOICE,
  LEARNING_BOOK_AUDIO_TTS_RATE,
} from "./learning-book-audio-tts-config.js";

const TECHNICAL_LINE =
  /(?:learning_page_id|skill_id|approval_status|page_type|age_band|docs\/|data\/|\.md\b|\.json\b|english:g\d+:|section:\d+)/i;

const SKIP_LINE_PREFIX =
  /^(?:רמז\s*:|הערה\s*:|מקור\s*:|Source references)/u;

const SCAFFOLDING_PREFIX =
  /^(?:שלב\s+\d+\s*:|שאלה\s*:|תשובה\s*:|מילה\s*:|הברה\s+\d+\s*:|סה״כ\s*:|סה"כ\s*:)/u;

const RECORDING_NOTE_RE = /^\[.*\]$/;

/**
 * @param {string} line
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
 */
function normalizeSpokenLine(line) {
  let t = unwrapScaffoldingLine(line);
  t = t.replace(/^[❌✓✔✗]\s*/u, "");
  return normalizeHebrewHyphensForTts(t);
}

/**
 * @param {string} line
 */
function shouldSkipSpokenLine(line) {
  const t = normalizeSpokenLine(line);
  if (!t) return true;
  if (TECHNICAL_LINE.test(t)) return true;
  if (SKIP_LINE_PREFIX.test(t)) return true;
  if (/^[-*•]\s*(?:`|\*\*)/.test(t)) return true;
  if (/^\(רמז\s*:/u.test(t)) return true;
  if (RECORDING_NOTE_RE.test(t)) return true;
  if (!t.includes("(") && /\)\s*$/u.test(t) && !/[A-Za-z]/.test(t)) return true;
  return false;
}

/**
 * @param {string} text
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
 * @param {string} text
 */
function escapeXml(text) {
  return String(text || "").replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}

/**
 * @param {string} text
 * @returns {{ lang: "he" | "en", text: string }[]}
 */
export function splitMixedLanguageRuns(text) {
  /** @type {{ lang: "he" | "en", text: string }[]} */
  const runs = [];
  let i = 0;
  const src = String(text || "");

  while (i < src.length) {
    const rest = src.slice(i);
    if (/^[\u0590-\u05FF]/.test(rest)) {
      const m = rest.match(/^[\u0590-\u05FF0-9\s.,!?;:()"'«»-–\-\u05BE]+/u);
      if (!m) break;
      const chunk = m[0].trim();
      if (chunk) runs.push({ lang: "he", text: chunk });
      i += m[0].length;
      continue;
    }
    if (/^[A-Za-z0-9]/.test(rest)) {
      const m = rest.match(/^[A-Za-z0-9\s.,!?;:'"\-→…+]+/u);
      if (!m) break;
      const chunk = m[0].trim();
      if (chunk) runs.push({ lang: "en", text: chunk });
      i += m[0].length;
      continue;
    }
    i += 1;
  }

  return runs;
}

/**
 * @param {string} text
 */
function formatEnglishRunForSsml(text) {
  return escapeXml(text)
    .replace(/\s*…\s*/g, '<break time="350ms"/>')
    .replace(/\s*→\s*/g, '<break time="250ms"/>')
    .replace(/\s*\+\s*/g, ", ");
}

/**
 * @param {string} plainScript
 * @param {{ heVoice?: string, enVoice?: string, rate?: string }} [options]
 */
export function buildEnglishMixedLanguageSsml(plainScript, options = {}) {
  const heVoice = options.heVoice || ENGLISH_BOOK_AUDIO_HE_VOICE;
  const enVoice = options.enVoice || ENGLISH_BOOK_AUDIO_EN_VOICE;
  const rate = options.rate || LEARNING_BOOK_AUDIO_TTS_RATE;
  const runs = splitMixedLanguageRuns(plainScript);

  const inner = runs
    .map((run) => {
      if (run.lang === "en") {
        return `<voice name="${enVoice}"><prosody rate="${rate}">${formatEnglishRunForSsml(run.text)}</prosody></voice>`;
      }
      return `<voice name="${heVoice}"><prosody rate="${rate}">${escapeXml(run.text)}</prosody></voice>`;
    })
    .join('<break time="300ms"/>');

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="he-IL">${inner}</speak>`;
}

/**
 * @param {{ number: number, title: string, body: string }} section
 * @returns {string}
 */
function buildEnglishSectionSpokenScriptRaw(section) {
  if (!section?.body) return "";

  const { lines } = flattenBookSectionVisibleLines(section.body);
  const spokenLines = lines
    .map((row) => normalizeSpokenLine(row.rendered))
    .filter((line) => !shouldSkipSpokenLine(line));

  return normalizeSpokenWhitespace(spokenLines.join("\n"));
}

/**
 * @param {{ number: number, title: string, body: string }} section
 */
export function prepareEnglishBookSectionAudioTextDetailed(section) {
  const spokenScript = buildEnglishSectionSpokenScriptRaw(section);
  if (!spokenScript) {
    return {
      spokenScript: "",
      ssml: "",
      pronunciationReplacementsApplied: [],
      mathExpressionConversionsApplied: [],
    };
  }

  return {
    spokenScript,
    ssml: buildEnglishMixedLanguageSsml(spokenScript),
    pronunciationReplacementsApplied: [],
    mathExpressionConversionsApplied: [],
  };
}

/**
 * @param {Parameters<typeof prepareEnglishBookSectionAudioTextDetailed>[0]} section
 */
export function prepareEnglishBookSectionAudioText(section) {
  return prepareEnglishBookSectionAudioTextDetailed(section).spokenScript;
}

/**
 * @param {{
 *   displayTitle?: string,
 *   documentTitle?: string,
 *   pageId?: string,
 *   sections?: { number: number, title: string, body: string }[],
 * }} pageData
 * @param {number} sectionNumber
 */
export function prepareEnglishBookAudioTextForSection(pageData, sectionNumber) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const sec = sections.find((s) => s.number === sectionNumber);
  if (!sec) return "";
  return prepareEnglishBookSectionAudioText(sec);
}

/**
 * @param {Parameters<typeof prepareEnglishBookAudioTextForSection>[0]} pageData
 * @param {number} sectionNumber
 */
export function prepareEnglishBookAudioTextForSectionDetailed(pageData, sectionNumber) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const sec = sections.find((s) => s.number === sectionNumber);
  if (!sec) {
    return {
      spokenScript: "",
      ssml: "",
      pronunciationReplacementsApplied: [],
      mathExpressionConversionsApplied: [],
    };
  }
  return prepareEnglishBookSectionAudioTextDetailed(sec);
}
