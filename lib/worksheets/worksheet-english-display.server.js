/**
 * English printable question enrichment — LTR spans, translation, writing lines.
 * @module lib/worksheets/worksheet-english-display.server
 */

import {
  classifyEnglishWorksheetPrintBlock,
  isMostlyLatinText,
} from "./worksheet-english-allowlist.js";
import { WORKSHEET_PRINTABILITY } from "./worksheet-question-types.js";

const LATIN_RUN_RE = /[A-Za-z][A-Za-z0-9'.,!?;:\- ]*/g;

/**
 * @param {string} text
 * @returns {import("./worksheet-question-types.js").WorksheetLtrSpan[]}
 */
export function extractEnglishLtrSpans(text) {
  const hay = String(text || "");
  /** @type {import("./worksheet-question-types.js").WorksheetLtrSpan[]} */
  const spans = [];
  for (const m of hay.matchAll(LATIN_RUN_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const spanText = m[0].trim().replace(/^['"]+|['"]+$/g, "");
    if (!spanText) continue;
    spans.push({ start, end, spanText });
  }
  return spans;
}

/**
 * @param {string} stem
 * @param {import("./worksheet-question-types.js").WorksheetLtrSpan[]} spans
 * @returns {string}
 */
export function renderStemWithLtrSpansHtml(stem, spans, escapeHtml) {
  const text = String(stem || "");
  if (!spans?.length) return escapeHtml(text);
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const span of sorted) {
    if (span.start < cursor) continue;
    out += escapeHtml(text.slice(cursor, span.start));
    out += `<span class="english-ltr" dir="ltr">${escapeHtml(text.slice(span.start, span.end))}</span>`;
    cursor = span.end;
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function isEnglishWritingOpenQuestion(raw) {
  const topic = String(raw.topic || raw.operation || "");
  const answerMode = String(raw.params?.answerMode || raw.answerMode || raw.qType || "");
  if (topic === "writing") return true;
  if (answerMode === "typing") return true;
  return false;
}

/**
 * Letter-case contrast for upper/lower phonics match items.
 * @param {string} stimulus
 * @param {string[]|undefined} options
 * @returns {{ stimulusCase: "upper" | "lower" | "word", optionCase: "upper" | "lower" | null }}
 */
export function resolvePhonicsCaseContrast(stimulus, options) {
  const stim = String(stimulus || "").trim();
  const opts = (options || []).map((o) => String(o || "").trim()).filter(Boolean);
  if (/^[a-z]$/.test(stim) && opts.length && opts.every((o) => /^[A-Z]$/.test(o))) {
    return { stimulusCase: "lower", optionCase: "upper" };
  }
  if (/^[A-Z]$/.test(stim) && opts.length && opts.every((o) => /^[a-z]$/.test(o))) {
    return { stimulusCase: "upper", optionCase: "lower" };
  }
  if (/^[A-Za-z]$/.test(stim)) {
    return {
      stimulusCase: /^[A-Z]$/.test(stim) ? "upper" : "lower",
      optionCase: null,
    };
  }
  return { stimulusCase: "word", optionCase: null };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} base
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function enrichEnglishPrintableQuestion(raw, base) {
  const topic = String(raw.topic || raw.operation || "");
  const questionLabel = String(
    raw.questionLabel || raw.params?.questionLabel || ""
  ).trim();
  const exerciseText = String(
    raw.exerciseText || raw.params?.exerciseText || raw.params?.phonicsStimulus || ""
  ).trim();
  const phonicsItemType = String(
    raw.params?.itemType || raw.itemType || ""
  ).trim();
  const isPhonics =
    topic === "phonics" && Boolean(exerciseText) && Boolean(questionLabel || base.stemHe);

  const stemHe = isPhonics
    ? questionLabel || base.stemHe
    : base.stemHe;
  const ltrSpans = isPhonics ? [] : extractEnglishLtrSpans(stemHe);
  const optionsLatin = base.optionsHe?.map((o) => isMostlyLatinText(o)) || [];
  const caseContrast = isPhonics
    ? resolvePhonicsCaseContrast(exerciseText, base.optionsHe)
    : null;

  let questionType = base.questionType;
  if (topic === "translation") {
    questionType = "translation";
  } else if (topic === "sentences" && base.optionsHe?.length) {
    questionType = "mcq";
  } else if (isEnglishWritingOpenQuestion(raw)) {
    questionType = "open";
  } else if (base.optionsHe?.length) {
    questionType = "mcq";
  }

  const writingSpaceLines =
    questionType === "open"
      ? typeof raw.writingSpaceLines === "number"
        ? raw.writingSpaceLines
        : 6
      : base.writingSpaceLines;

  let printability = base.printability;
  const block = classifyEnglishWorksheetPrintBlock(raw);
  if (block.blocked) {
    printability = /audio|listening|requiresAudio/i.test(String(block.reason || ""))
      ? WORKSHEET_PRINTABILITY.blocked_audio
      : WORKSHEET_PRINTABILITY.blocked_image;
  } else if (raw.requiresAudio === true || raw.pictureRef || raw.requiresImage) {
    printability =
      raw.requiresAudio === true
        ? WORKSHEET_PRINTABILITY.blocked_audio
        : WORKSHEET_PRINTABILITY.blocked_image;
  }

  return {
    ...base,
    stemHe,
    questionType,
    ltrSpans: ltrSpans.length ? ltrSpans : isPhonics ? undefined : base.ltrSpans,
    optionsLatin: optionsLatin.length ? optionsLatin : undefined,
    englishSentenceMode: topic === "sentences" || undefined,
    englishPhonicsMode: isPhonics || undefined,
    phonicsStimulus: isPhonics ? exerciseText : undefined,
    phonicsItemType: isPhonics && phonicsItemType ? phonicsItemType : undefined,
    phonicsStimulusCase: caseContrast?.stimulusCase,
    phonicsOptionCase: caseContrast?.optionCase || undefined,
    writingSpaceLines,
    printability,
  };
}
