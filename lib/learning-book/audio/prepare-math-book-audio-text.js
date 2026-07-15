/**
 * Extract child-facing spoken script from a Math learning book section.
 * Pilot: Math Grade 1 — one visible section at a time.
 *
 * Converts math symbols/expressions to natural spoken Hebrew for TTS.
 * Does NOT alter visible book markdown.
 */

import { flattenBookSectionVisibleLines } from "../book-visible-text-render.js";
import { normalizeHebrewHyphensForTts } from "./prepare-hebrew-book-audio-text.js";
import { applyLearningBookPronunciationCorrections } from "./learning-book-audio-pronunciation.js";

const TECHNICAL_LINE =
  /(?:learning_page_id|skill_id|approval_status|page_type|age_band|docs\/|data\/|\.md\b|\.json\b|math:g\d+:|math:kind:)/i;

const SKIP_LINE_PREFIX = /^(?:רמז\s*:|הערה\s*:|מקור\s*:|Source references)/u;

const SCAFFOLDING_PREFIX =
  /^(?:שלב\s+\d+\s*:|שאלה\s*:|תשובה\s*:|מילה\s*:|הברה\s+\d+\s*:|סה״כ\s*:|סה"כ\s*:)/u;

const DIAGRAM_LINE =
  /^[0-9\s-–−\-→←↑↓[\]()●✕×.,_…?+=<>₪]+$/u;

const ONES = Object.freeze([
  "אפס",
  "אחד",
  "שתיים",
  "שלוש",
  "ארבע",
  "חמש",
  "שש",
  "שבע",
  "שמונה",
  "תשע",
]);

const TENS = Object.freeze([
  "",
  "עשר",
  "עשרים",
  "שלושים",
  "ארבעים",
  "חמישים",
  "שישים",
  "שבעים",
  "שמונים",
  "תשעים",
]);

const TEENS = Object.freeze([
  "עשר",
  "אחת עשרה",
  "שתים עשרה",
  "שלוש עשרה",
  "ארבע עשרה",
  "חמש עשרה",
  "שש עשרה",
  "שבע עשרה",
  "שמונה עשרה",
  "תשע עשרה",
]);

/**
 * @param {number} n
 * @returns {string}
 */
export function cardinalHebrewForTts(n) {
  const num = Math.trunc(Number(n));
  if (!Number.isFinite(num) || num < 0) return String(n);
  if (num < 10) return ONES[num];
  if (num < 20) return TEENS[num - 10];
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    if (ones === 0) return TENS[tens];
    return `${TENS[tens]} ו${ONES[ones]}`;
  }
  if (num === 100) return "מאה";
  return String(num);
}

/**
 * @param {string} token
 * @returns {string}
 */
function speakNumberToken(token) {
  const digits = String(token || "").replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return token;
  return cardinalHebrewForTts(Number(digits));
}

/**
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
 * @param {string} text
 * @param {{ track?: boolean }} [options]
 * @returns {string | { text: string, mathExpressionConversionsApplied: string[] }}
 */
export function convertMathExpressionsForTts(text, options = {}) {
  const track = options.track === true;
  let out = String(text || "");
  /** @type {string[]} */
  const mathExpressionConversionsApplied = [];

  /**
   * @param {RegExp} re
   * @param {(...groups: string[]) => string} replacer
   * @param {string} label
   */
  function replaceTracked(re, replacer, label) {
    out = out.replace(re, (...args) => {
      const groups = args.slice(1, -2);
      if (track) mathExpressionConversionsApplied.push(label);
      return replacer(...groups);
    });
  }

  replaceTracked(
    /(\d+)\s*\+\s*__\s*=\s*(\d+)/g,
    (a, b) => `${speakNumberToken(a)} ועוד מקום ריק שווה ${speakNumberToken(b)}`,
    "addition_blank"
  );
  replaceTracked(
    /(\d+)\s*\+\s*(\d+)\s*=\s*__/g,
    (a, b) => `${speakNumberToken(a)} ועוד ${speakNumberToken(b)} שווה מקום ריק`,
    "addition_result_blank"
  );
  replaceTracked(
    /(\d+)\s*\+\s*(\d+)\s*=\s*\?/g,
    (a, b) => `${speakNumberToken(a)} ועוד ${speakNumberToken(b)} שווה מה התשובה`,
    "addition_unknown"
  );
  replaceTracked(
    /(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/g,
    (a, b, c) => `${speakNumberToken(a)} ועוד ${speakNumberToken(b)} שווה ${speakNumberToken(c)}`,
    "addition_equality"
  );

  replaceTracked(
    /(\d+)\s*([-−])\s*(\d+)\s*=\s*\?/g,
    (a, _op, b) => `${speakNumberToken(a)} פחות ${speakNumberToken(b)} שווה מה התשובה`,
    "subtraction_unknown"
  );
  replaceTracked(
    /(\d+)\s*([-−])\s*(\d+)\s*=\s*(\d+)/g,
    (a, _op, b, c) =>
      `${speakNumberToken(a)} פחות ${speakNumberToken(b)} שווה ${speakNumberToken(c)}`,
    "subtraction_equality"
  );

  replaceTracked(
    /(\d+)\s*([×xX*])\s*(\d+)/g,
    (a, _op, b) => `${speakNumberToken(a)} כפול ${speakNumberToken(b)}`,
    "multiplication"
  );
  replaceTracked(
    /(\d+)\s*([÷/])\s*(\d+)/g,
    (a, _op, b) => `${speakNumberToken(a)} חלקי ${speakNumberToken(b)}`,
    "division"
  );

  replaceTracked(
    /(\d+)\s*<\s*(\d+)/g,
    (a, b) => `${speakNumberToken(a)} קטן מ ${speakNumberToken(b)}`,
    "less_than"
  );
  replaceTracked(
    /(\d+)\s*>\s*(\d+)/g,
    (a, b) => `${speakNumberToken(a)} גדול מ ${speakNumberToken(b)}`,
    "greater_than"
  );

  replaceTracked(
    /(\d+)\s*\+\s*(\d+)(?!\s*=)/g,
    (a, b) => `${speakNumberToken(a)} ועוד ${speakNumberToken(b)}`,
    "addition_phrase"
  );

  replaceTracked(
    /(\d+)\s*[-−–]\s*(\d+)(?!\s*[=<>?])/g,
    (a, b) => `${speakNumberToken(a)} עד ${speakNumberToken(b)}`,
    "number_range"
  );

  replaceTracked(/מ-(\d+)/g, (n) => `מ ${speakNumberToken(n)}`, "from_number");
  replaceTracked(/עד-(\d+)/g, (n) => `עד ${speakNumberToken(n)}`, "until_number");

  const beforeDigits = out;
  out = out.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => speakNumberToken(m));
  out = out.replace(/\b\d+\b/g, (m) => speakNumberToken(m));
  if (track && out !== beforeDigits) mathExpressionConversionsApplied.push("cardinal_digits");

  out = out.replace(/\bפלוס\b/g, "פלוס");
  out = out.replace(/^\+\s*/gm, "פלוס ");
  out = out.replace(/^\=\s*/gm, "שווה ");
  out = out.replace(/__+/g, "מקום ריק");
  out = out.replace(/\s\+\s/g, " ועוד ");
  out = out.replace(/\?/g, "");

  if (track) {
    return { text: out, mathExpressionConversionsApplied };
  }
  return out;
}

/**
 * @param {string} line
 * @returns {string}
 */
/**
 * @param {string} line
 * @param {{ trackMath?: boolean }} [options]
 * @returns {string | { text: string, mathExpressionConversionsApplied: string[] }}
 */
function normalizeSpokenLine(line, options = {}) {
  let t = unwrapScaffoldingLine(line);
  const converted = convertMathExpressionsForTts(t, { track: options.trackMath === true });
  if (options.trackMath) {
    t = /** @type {{ text: string }} */ (converted).text;
    t = normalizeHebrewHyphensForTts(t);
    t = t.replace(/\s{2,}/g, " ").trim();
    return {
      text: t,
      mathExpressionConversionsApplied:
        /** @type {{ mathExpressionConversionsApplied: string[] }} */ (converted)
          .mathExpressionConversionsApplied,
    };
  }
  t = /** @type {string} */ (converted);
  t = normalizeHebrewHyphensForTts(t);
  return t.replace(/\s{2,}/g, " ").trim();
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
  if (DIAGRAM_LINE.test(t)) return true;
  if (/^●/.test(t)) return true;
  if (/↑.*קפיצה/u.test(t)) return true;
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
 * @param {{ trackMath?: boolean }} [options]
 * @returns {string | { rawScript: string, mathExpressionConversionsApplied: string[] }}
 */
function buildMathSectionSpokenScriptRaw(section, options = {}) {
  if (!section?.body) {
    return options.trackMath ? { rawScript: "", mathExpressionConversionsApplied: [] } : "";
  }

  const { lines } = flattenBookSectionVisibleLines(section.body);
  /** @type {string[]} */
  const spokenLines = [];
  /** @type {string[]} */
  const mathExpressionConversionsApplied = [];

  for (const row of lines) {
    if (options.trackMath) {
      const normalized = /** @type {{ text: string, mathExpressionConversionsApplied: string[] }} */ (
        normalizeSpokenLine(row.rendered, { trackMath: true })
      );
      if (shouldSkipSpokenLine(normalized.text)) continue;
      spokenLines.push(normalized.text);
      mathExpressionConversionsApplied.push(...normalized.mathExpressionConversionsApplied);
      continue;
    }
    const line = /** @type {string} */ (normalizeSpokenLine(row.rendered));
    if (shouldSkipSpokenLine(line)) continue;
    spokenLines.push(line);
  }

  const rawScript = normalizeSpokenWhitespace(spokenLines.join("\n"));
  if (options.trackMath) {
    return { rawScript, mathExpressionConversionsApplied };
  }
  return rawScript;
}

/**
 * @param {{ number: number, title: string, body: string }} section
 * @returns {string}
 */
export function prepareMathBookSectionAudioText(section) {
  const raw = /** @type {string} */ (buildMathSectionSpokenScriptRaw(section));
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
export function prepareMathBookSectionAudioTextDetailed(section) {
  const built = /** @type {{ rawScript: string, mathExpressionConversionsApplied: string[] }} */ (
    buildMathSectionSpokenScriptRaw(section, { trackMath: true })
  );
  if (!built.rawScript) {
    return {
      spokenScript: "",
      pronunciationReplacementsApplied: [],
      mathExpressionConversionsApplied: [],
    };
  }
  const { text, pronunciationReplacementsApplied } = applyLearningBookPronunciationCorrections(
    built.rawScript
  );
  return {
    spokenScript: text,
    pronunciationReplacementsApplied,
    mathExpressionConversionsApplied: built.mathExpressionConversionsApplied,
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
export function prepareMathBookAudioTextForSection(pageData, sectionNumber) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const sec = sections.find((s) => s.number === sectionNumber);
  if (!sec) return "";
  return prepareMathBookSectionAudioText(sec);
}

/**
 * @param {Parameters<typeof prepareMathBookAudioTextForSection>[0]} pageData
 * @param {number} sectionNumber
 * @returns {ReturnType<typeof prepareMathBookSectionAudioTextDetailed>}
 */
export function prepareMathBookAudioTextForSectionDetailed(pageData, sectionNumber) {
  const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];
  const sec = sections.find((s) => s.number === sectionNumber);
  if (!sec) {
    return {
      spokenScript: "",
      pronunciationReplacementsApplied: [],
      mathExpressionConversionsApplied: [],
    };
  }
  return prepareMathBookSectionAudioTextDetailed(sec);
}
