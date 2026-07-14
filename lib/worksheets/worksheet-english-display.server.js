/**
 * English printable question enrichment — LTR spans, translation, writing lines.
 * @module lib/worksheets/worksheet-english-display.server
 */

import { isMostlyLatinText } from "./worksheet-english-allowlist.js";
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
    out += `<span class="english-ltr" dir="ltr">${escapeHtml(span.spanText)}</span>`;
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
 * @param {Record<string, unknown>} raw
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} base
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function enrichEnglishPrintableQuestion(raw, base) {
  const topic = String(raw.topic || raw.operation || "");
  const ltrSpans = extractEnglishLtrSpans(base.stemHe);
  const optionsLatin = base.optionsHe?.map((o) => isMostlyLatinText(o)) || [];

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
        : 5
      : base.writingSpaceLines;

  let printability = base.printability;
  if (raw.requiresAudio === true || raw.pictureRef || raw.requiresImage) {
    printability =
      raw.requiresAudio === true
        ? WORKSHEET_PRINTABILITY.blocked_audio
        : WORKSHEET_PRINTABILITY.blocked_image;
  }

  return {
    ...base,
    questionType,
    ltrSpans: ltrSpans.length ? ltrSpans : base.ltrSpans,
    optionsLatin: optionsLatin.length ? optionsLatin : undefined,
    englishSentenceMode: topic === "sentences" || undefined,
    writingSpaceLines,
    printability,
  };
}
