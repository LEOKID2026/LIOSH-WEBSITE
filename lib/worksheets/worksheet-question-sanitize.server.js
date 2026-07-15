/**
 * Sanitize raw bank/generator questions into printable worksheet-safe shapes.
 * Strips internal metadata, diagnostic keys, seeds, and answer fields.
 * @module lib/worksheets/worksheet-question-sanitize.server
 */

import { INTERNAL_PARENT_REPORT_KEYS } from "../parent-server/report-payload-public-sanitize.js";
import {
  sanitizeQuestionForStudentDisplay,
  sanitizeStudentQuestionStem,
  STUDENT_STEM_METADATA_LEAK_CHECKS,
} from "../../utils/student-question-stem-sanitizer.js";
import { resolvePrintability } from "./worksheet-print-allowlist.js";
import { enrichMathPrintableQuestion } from "./worksheet-math-display.server.js";
import { enrichGeometryPrintableQuestion } from "./worksheet-geometry-display.server.js";
import { enrichHebrewPrintableQuestion, splitHebrewPassageFromStem } from "./worksheet-hebrew-display.server.js";
import { enrichEnglishPrintableQuestion } from "./worksheet-english-display.server.js";
import { resolvePracticeFormatForMathQuestion } from "./worksheet-math-practice-format.js";

/** Keys never allowed on PrintableWorksheetQuestion or WorksheetPayload. */
export const INTERNAL_WORKSHEET_KEYS = new Set([
  ...INTERNAL_PARENT_REPORT_KEYS,
  "id",
  "bankId",
  "questionId",
  "seed",
  "seedId",
  "_seed",
  "params",
  "correct",
  "correctAnswer",
  "correctIndex",
  "correct_answer",
  "typingAcceptedAnswers",
  "explanation",
  "explanationHe",
  "theoryLines",
  "answers",
  "patternFamily",
  "conceptTag",
  "probePower",
  "expectedErrorTypes",
  "expectedErrorTags",
  "subtopicId",
  "topicKey",
  "gradeKey",
  "levelKey",
  "mathPracticeFormat",
  "generatorKind",
  "_probeMeta",
  "itemType",
  "requiresAudio",
  "pictureRef",
  "imageUrl",
  "requiresImage",
  "grades",
  "minLevel",
  "maxLevel",
  "displayLevel",
  "displayLevelKey",
  "sourceDifficulty",
  "questionTypes",
  "stem",
  "question",
  "exerciseText",
  "questionLabel",
  "prompt",
  "title",
  "subtitle",
  "instruction",
  "hint",
  "feedback",
  "caption",
  "questionText",
  "text",
  "body",
]);

/** Patterns that must not appear in worksheet HTML / JSON payloads. */
export const WORKSHEET_METADATA_LEAK_PATTERNS = [
  { id: "skillId", re: /\bskillId\b/ },
  { id: "diagnosticSkillId", re: /\bdiagnosticSkillId\b/ },
  { id: "patternFamily", re: /\bpatternFamily\b/ },
  { id: "conceptTag", re: /\bconceptTag\b/ },
  { id: "seedId", re: /\bseedId\b/ },
  { id: "generatorKind", re: /\bgeneratorKind\b/ },
  { id: "subSkill", re: /\bsubSkill\b/ },
  { id: "bySubSkill", re: /\bbySubSkill\b/ },
  { id: "gatingDecisions", re: /\bgatingDecisions\b/ },
  { id: "english_phonics_taxonomy", re: /\benglish:phonics:[a-z0-9_:]+\b/i },
  { id: "math_taxonomy", re: /\bmath_[a-z0-9_]+\b/i },
];

/**
 * Final stem cleanup for printable worksheets (after student-display sanitizer).
 * @param {string} stem
 * @returns {string}
 */
export function finalizeWorksheetStemHe(stem) {
  let t = sanitizeStudentQuestionStem(stem);
  t = t.replace(/^(?:נושא|תחום)\s+[a-z0-9_-]+\s*[–-]\s*/iu, "");
  t = t.replace(/^(?:נושא|תחום)\s+[a-z0-9_-]+\s*[·•]\s*/iu, "");
  t = t.replace(/^(?:נושא|תחום)\s+[a-z0-9_-]+\s*:\s*/iu, "");
  return t.trim();
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function isPlaceholderStem(text) {
  const t = String(text || "").trim();
  return !t || t === "__" || t === "= __" || /^_{2,}$/.test(t);
}

/**
 * @param {Record<string, unknown>} raw
 * @param {{ subject?: string }} [opts]
 * @returns {string}
 */
function extractStemHe(raw, opts = {}) {
  // Classroom display splits geometry "data. instruction." into exerciseText + questionLabel.
  // Printable worksheets need the full exercise in one stem.
  if (opts.subject === "geometry") {
    const label =
      typeof raw.questionLabel === "string" ? raw.questionLabel.trim() : "";
    const exercise =
      typeof raw.exerciseText === "string" ? raw.exerciseText.trim() : "";
    if (label && exercise) {
      return finalizeWorksheetStemHe(`${exercise} ${label}`.replace(/\s{2,}/g, " ").trim());
    }
  }

  const candidates = [
    raw.stemHe,
    raw.questionLabel,
    raw.stem,
    raw.question,
    raw.exerciseText,
    raw.questionText,
    raw.prompt,
    raw.text,
    raw.body,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() && !isPlaceholderStem(c)) {
      return finalizeWorksheetStemHe(c.trim());
    }
  }
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return finalizeWorksheetStemHe(c.trim());
  }
  return "";
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {string[]|undefined}
 */
function extractOptionsHe(raw) {
  if (Array.isArray(raw.optionsHe)) {
    return raw.optionsHe
      .filter((o) => typeof o === "string" && o.trim())
      .map((o) => o.trim());
  }
  if (Array.isArray(raw.answers)) {
    return raw.answers
      .filter((a) => typeof a === "string" && a.trim())
      .map((a) => a.trim());
  }
  if (Array.isArray(raw.options)) {
    return raw.options
      .filter((o) => typeof o === "string" && o.trim())
      .map((o) => o.trim());
  }
  return undefined;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {import("./worksheet-question-types.js").WorksheetQuestionType}
 */
function inferQuestionType(raw) {
  if (raw.questionType && typeof raw.questionType === "string") {
    return /** @type {import("./worksheet-question-types.js").WorksheetQuestionType} */ (
      raw.questionType
    );
  }
  if (raw.params?.layout === "vertical" || raw.verticalLayout) return "vertical_math";
  if (raw.params?.fractionMode || raw.fractionSpec) return "fraction";
  if (typeof raw.passageHe === "string" && raw.passageHe.trim()) return "passage_mcq";
  // Geometry open compute may include a diagram without becoming MCQ.
  const answerMode = String(raw.answerMode || raw.params?.answerMode || "").toLowerCase();
  if (answerMode === "open" || raw.geometryAnswerLine === true) return "open";
  if (raw.diagramSpec) return "diagram_mcq";
  if (raw.itemType === "translation" || raw.translationMode) return "translation";
  if (Array.isArray(raw.optionsHe) || Array.isArray(raw.answers)) return "mcq";
  if (raw.writingSpaceLines || raw.itemType === "writing") return "open";
  return "open";
}

/**
 * @param {unknown} spec
 * @returns {import("./worksheet-question-types.js").WorksheetDiagramSpec | null}
 */
function sanitizeDiagramSpec(spec) {
  if (!spec || typeof spec !== "object") return null;
  const s = /** @type {Record<string, unknown>} */ (spec);
  const kind = typeof s.kind === "string" ? s.kind : "unknown";
  if (kind === "pending") return null;
  /** @type {Record<string, string | number>} */
  const labels = {};
  if (s.labels && typeof s.labels === "object") {
    for (const [k, v] of Object.entries(s.labels)) {
      if (typeof v === "string" || typeof v === "number") labels[k] = v;
    }
  }
  return { kind, labels: Object.keys(labels).length ? labels : undefined };
}

/**
 * Sanitize a raw question into a printable worksheet question (no answers).
 * @param {Record<string, unknown>} raw
 * @param {{ displayIndex: number, subject: import("./worksheet-question-types.js").WorksheetSubjectId, mathPracticeFormat?: string | null, gradeKey?: string, topicKey?: string, preferMcq?: boolean }} ctx
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function toPrintableWorksheetQuestion(raw, ctx) {
  const rawStem = extractStemHe(raw, { subject: ctx.subject });
  const optionsFromRaw = extractOptionsHe(raw);
  const sanitized = sanitizeQuestionForStudentDisplay(raw) || raw;
  const printability = resolvePrintability(sanitized);
  let stemHe = extractStemHe(sanitized, { subject: ctx.subject });
  let passageHe =
    typeof sanitized.passageHe === "string" && sanitized.passageHe.trim()
      ? sanitized.passageHe.trim()
      : undefined;

  if (ctx.subject === "hebrew" && rawStem) {
    const preSanitizedStem = finalizeWorksheetStemHe(rawStem);
    const split = splitHebrewPassageFromStem(preSanitizedStem);
    if (split.passageHe) {
      passageHe = split.passageHe;
      stemHe = finalizeWorksheetStemHe(split.stemHe);
    } else if (preSanitizedStem.length > stemHe.length) {
      stemHe = preSanitizedStem;
    }
  }

  // Prefer full pre-split geometry stem when sanitizer labels the instruction separately.
  if (ctx.subject === "geometry" && rawStem && rawStem.length > stemHe.length) {
    stemHe = finalizeWorksheetStemHe(rawStem);
  }

  const optionsHe = optionsFromRaw ?? extractOptionsHe(sanitized);
  const writingSpaceLines =
    typeof sanitized.writingSpaceLines === "number"
      ? sanitized.writingSpaceLines
      : undefined;
  const ltrSpans = Array.isArray(sanitized.ltrSpans)
    ? sanitized.ltrSpans
        .filter(
          (s) =>
            s &&
            typeof s === "object" &&
            (typeof s.spanText === "string" || typeof s.text === "string") &&
            typeof s.start === "number" &&
            typeof s.end === "number"
        )
        .map((s) => ({
          start: s.start,
          end: s.end,
          spanText: String(s.spanText ?? s.text),
        }))
    : undefined;
  const diagramSpec = sanitizeDiagramSpec(sanitized.diagramSpec);

  const base = {
    displayIndex: ctx.displayIndex,
    subject: ctx.subject,
    questionType: inferQuestionType(sanitized),
    stemHe,
    passageHe,
    optionsHe,
    diagramSpec,
    writingSpaceLines,
    ltrSpans,
    printability,
  };

  if (ctx.subject === "math") {
    const gradeKey = ctx.gradeKey || String(sanitized.gradeLevel || raw.gradeLevel || "");
    const sheetFormat = ctx.mathPracticeFormat || "";
    const isMixedSheet =
      sheetFormat === "mixed" || String(ctx.topicKey || "").toLowerCase() === "mixed";
    const perQuestionFormat = isMixedSheet
      ? resolvePracticeFormatForMathQuestion(raw, gradeKey, sheetFormat)
      : sheetFormat;
    const questionTopic = isMixedSheet
      ? String(raw.operation || raw.topic || sanitized.operation || sanitized.topic || "")
      : String(
          ctx.topicKey || sanitized.operation || sanitized.topic || raw.operation || ""
        );

    return enrichMathPrintableQuestion(sanitized, base, {
      mathPracticeFormat: perQuestionFormat || sheetFormat,
      gradeKey,
      topicKey: questionTopic,
      preferMcq: ctx.preferMcq,
    });
  }

  if (ctx.subject === "geometry") {
    return enrichGeometryPrintableQuestion(sanitized, base, {
      preferMcq: ctx.preferMcq,
    });
  }

  if (ctx.subject === "hebrew") {
    return enrichHebrewPrintableQuestion(sanitized, base);
  }

  if (ctx.subject === "english") {
    return enrichEnglishPrintableQuestion(sanitized, base);
  }

  return base;
}

/**
 * Build a single answer-key entry — only for AnswerKeyPayload.
 * @param {Record<string, unknown>} raw
 * @param {{ displayIndex: number, subject?: import("./worksheet-question-types.js").WorksheetSubjectId, mathPracticeFormat?: string | null, gradeKey?: string, topicKey?: string, preferMcq?: boolean }} ctx
 * @returns {import("./worksheet-question-types.js").AnswerKeyEntry}
 */
export function toAnswerKeyEntry(raw, ctx) {
  const sanitized = sanitizeQuestionForStudentDisplay(raw) || raw;
  let correctAnswerHe = "";
  if (typeof sanitized.correctAnswer === "string") {
    correctAnswerHe = sanitized.correctAnswer.trim();
  } else if (typeof sanitized.correct === "string") {
    correctAnswerHe = sanitized.correct.trim();
  } else if (
    typeof sanitized.correctIndex === "number" &&
    Array.isArray(sanitized.answers)
  ) {
    const idx = sanitized.correctIndex;
    const ans = sanitized.answers[idx];
    if (typeof ans === "string") correctAnswerHe = ans.trim();
  }
  const explanationHe =
    typeof sanitized.explanation === "string" && sanitized.explanation.trim()
      ? sanitized.explanation.trim()
      : typeof sanitized.explanationHe === "string" && sanitized.explanationHe.trim()
        ? sanitized.explanationHe.trim()
        : undefined;

  const printable =
    ctx.subject != null
      ? toPrintableWorksheetQuestion(raw, {
          displayIndex: ctx.displayIndex,
          subject: ctx.subject,
          mathPracticeFormat: ctx.mathPracticeFormat,
          gradeKey: ctx.gradeKey,
          topicKey: ctx.topicKey,
          ...(ctx.preferMcq !== undefined ? { preferMcq: ctx.preferMcq } : {}),
        })
      : null;

  return {
    displayIndex: ctx.displayIndex,
    correctAnswerHe,
    explanationHe,
    stemHe: printable?.stemHe,
    questionType: printable?.questionType,
    mathExpressionLtr: printable?.mathExpressionLtr,
  };
}

/**
 * Assert printable question object has no forbidden keys (deep).
 * @param {unknown} node
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function scanPrintableQuestionForForbiddenKeys(node) {
  /** @type {string[]} */
  const hits = [];
  function walk(value, path) {
    if (value == null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const full = path ? `${path}.${key}` : key;
      if (INTERNAL_WORKSHEET_KEYS.has(key)) hits.push(full);
      walk(child, full);
    }
  }
  walk(node, "");
  return { pass: hits.length === 0, hits };
}

/**
 * Scan worksheet question stems for student-facing metadata leaks.
 * @param {string} text
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function scanWorksheetStemForMetadataLeaks(text) {
  const hay = String(text || "");
  /** @type {string[]} */
  const hits = [];
  for (const check of STUDENT_STEM_METADATA_LEAK_CHECKS) {
    if (check.re.test(hay)) hits.push(check.id);
  }
  return { pass: hits.length === 0, hits };
}

/**
 * Scan serialized worksheet text for internal key / taxonomy leaks (not stem header rules).
 * @param {string} text
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function scanWorksheetTextForMetadataLeaks(text) {
  const hay = String(text || "");
  /** @type {string[]} */
  const hits = [];
  for (const { id, re } of WORKSHEET_METADATA_LEAK_PATTERNS) {
    if (re.test(hay)) hits.push(id);
  }
  return { pass: hits.length === 0, hits };
}

/**
 * Scan serialized worksheet text for answer leak patterns.
 * @param {string} text
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function scanWorksheetTextForAnswerLeaks(text) {
  const hay = String(text || "");
  /** @type {string[]} */
  const hits = [];
  const answerPatterns = [
    { id: "correctAnswer", re: /\bcorrectAnswer\b/i },
    { id: "correctIndex", re: /\bcorrectIndex\b/i },
    { id: "typingAcceptedAnswers", re: /\btypingAcceptedAnswers\b/i },
    { id: "answer_key_marker", re: /data-answer-key|class="answer-key"/i },
    { id: "explanation_field", re: /\bexplanationHe\b/i },
  ];
  for (const { id, re } of answerPatterns) {
    if (re.test(hay)) hits.push(id);
  }
  return { pass: hits.length === 0, hits };
}
