/**
 * Phase 8 — question-to-engine metadata contract (additive, no diagnostic conclusion changes).
 */

import { mcqCellLabel, mcqCellValue } from "../../utils/mcq-option-cell.js";
import {
  computeMcqIndicesForQuestion,
  distractorFamilyFromOptionCell,
  extractDiagnosticMetadataFromQuestion,
  strOrNull,
} from "../../utils/diagnostic-mistake-metadata.js";

export const QUESTION_ENGINE_VERSION = "phase-8-mcq-contract-v1";
export const MAX_MCQ_CHOICES = 8;
export const VALUE_MAX_LEN = 1000;

export const DISTRACTOR_UNKNOWN = "unknown";
export const GENERIC_PROXIMITY = "generic_proximity";

export const ANSWER_LEAKAGE_RISKS = Object.freeze([
  "none",
  "step_by_step_shown",
  "explanation_shown",
  "passage_visible",
  "stem_leak",
  "unknown",
]);

/**
 * @param {unknown} value
 */
function truncateEngineValue(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > VALUE_MAX_LEN ? s.slice(0, VALUE_MAX_LEN) : s;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
function resolveChoicesArray(question) {
  if (!question || typeof question !== "object") return null;
  if (Array.isArray(question.answers) && question.answers.length > 0) return question.answers;
  if (Array.isArray(question.options) && question.options.length > 0) return question.options;
  if (Array.isArray(question.choices) && question.choices.length > 0) return question.choices;
  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function detectQuestionTypeFromRecord(question) {
  if (!question || typeof question !== "object") return "unknown";
  const explicit = strOrNull(question.type) || strOrNull(question.questionType);
  if (explicit) {
    const t = explicit.toLowerCase();
    if (["mcq", "multiple_choice", "choice"].includes(t)) return "mcq";
    if (t === "numeric" || t === "number") return "numeric";
    if (t === "open" || t === "text") return "open";
    if (t === "audio") return "audio";
  }
  const choices = resolveChoicesArray(question);
  if (choices && choices.length >= 2) return "mcq";
  if (question.correctAnswer !== undefined || question.correctIndex != null) return "numeric";
  return "unknown";
}

/**
 * @param {string|null|undefined} stem
 * @param {unknown} correctValue
 */
export function detectStemLeak(stem, correctValue) {
  const s = strOrNull(stem);
  const correct = truncateEngineValue(correctValue);
  if (!s || correct == null) return false;
  const correctStr = String(correct);
  if (correctStr.length < 2) return false;
  if (s.includes(correctStr)) return true;
  if (typeof correct === "string" && correct.split(/\s+/).length === 1) {
    return new RegExp(`\\b${correctStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(s);
  }
  return false;
}

/**
 * @param {Record<string, unknown>} [options]
 */
function resolveAnswerLeakageRisk(question, options = {}) {
  if (options.afterStepByStep === true) return "step_by_step_shown";
  if (options.explanationViewed === true) return "explanation_shown";
  if (options.passageVisible === true || question?.passageVisible === true) return "passage_visible";
  const stem =
    strOrNull(question?.exerciseText) ||
    strOrNull(question?.question) ||
    strOrNull(question?.stem) ||
    strOrNull(question?.prompt);
  const correct =
    question?.correctAnswer ??
    (Array.isArray(question?.options) && question?.correctIndex != null
      ? question.options[question.correctIndex]
      : null);
  if (detectStemLeak(stem, correct)) return "stem_leak";
  return "none";
}

/**
 * @param {unknown[]} choices
 */
function buildAllAnswerChoices(choices) {
  if (!Array.isArray(choices) || choices.length < 2) return null;
  return choices.slice(0, MAX_MCQ_CHOICES).map((cell, index) => {
    const value = truncateEngineValue(mcqCellValue(cell));
    const labelRaw = mcqCellLabel(cell);
    const label = labelRaw ? truncateEngineValue(labelRaw) : undefined;
    const family = distractorFamilyFromOptionCell(cell);
    /** @type {Record<string, unknown>} */
    const row = { index, value };
    if (label && label !== value) row.label = label;
    if (family) {
      row.distractorFamily = family;
    }
    return row;
  });
}

/**
 * @param {Record<string, unknown>|null|undefined} qe
 */
function computeMetadataConfidence(qe) {
  if (!qe || typeof qe !== "object") return "unknown";
  if (qe.questionType === "mcq") {
    const choices = qe.allAnswerChoices;
    if (!Array.isArray(choices) || choices.length < 2) return "minimal";
    const selected = qe.selectedAnswer;
    const hasFamily =
      strOrNull(qe.distractorFamily) &&
      qe.distractorFamily !== DISTRACTOR_UNKNOWN &&
      qe.distractorFamily !== GENERIC_PROXIMITY;
    if (hasFamily && selected?.index != null) return "full";
    if (choices.length >= 2 && selected?.value != null) return "partial";
    return "minimal";
  }
  if (qe.skillId || qe.generatorKind) return "partial";
  return "minimal";
}

/**
 * Normalize frozen / assigned / master question records to engine input shape.
 * @param {Record<string, unknown>|null|undefined} record
 */
export function questionRecordToEngineInput(record) {
  if (!record || typeof record !== "object") return {};
  const params =
    record.params && typeof record.params === "object" && !Array.isArray(record.params)
      ? record.params
      : {};
  const richCells = params.mcqOptionCells;
  const choicesFromRecord = resolveChoicesArray(record);
  const choices =
    Array.isArray(richCells) && richCells.length >= 2 ? richCells : choicesFromRecord;
  let correctAnswer =
    record.correctAnswer ??
    record.correct_answer ??
    (Array.isArray(record.options) && record.correctIndex != null
      ? record.options[record.correctIndex]
      : undefined);
  if (correctAnswer == null && record.correct != null && choices?.length) {
    const ci = Number(record.correct);
    if (Number.isFinite(ci) && choices[ci] != null) {
      correctAnswer = mcqCellValue(choices[ci]);
    }
  }
  return {
    ...record,
    exerciseText: record.exerciseText ?? record.question ?? record.stem ?? record.prompt,
    question: record.question ?? record.exerciseText ?? record.stem,
    answers: choices ?? record.answers ?? record.options ?? record.choices,
    options: choices ?? record.options ?? record.answers ?? record.choices,
    correctAnswer,
    params,
    type: record.type ?? record.questionType,
    diagnosticSkillId: record.diagnosticSkillId ?? params.diagnosticSkillId ?? record.skill_key,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @param {{
 *   selectedValue?: unknown,
 *   generatorSource?: string,
 *   afterStepByStep?: boolean,
 *   explanationViewed?: boolean,
 *   passageVisible?: boolean,
 * }} [options]
 */
export function buildQuestionEngineMetadataFromQuestion(question, options = {}) {
  const q = questionRecordToEngineInput(question);
  const diag = extractDiagnosticMetadataFromQuestion(q, {});
  const questionType = detectQuestionTypeFromRecord(q);
  const choices = resolveChoicesArray(q) ?? (Array.isArray(q.answers) ? q.answers : null);
  const allAnswerChoices = questionType === "mcq" ? buildAllAnswerChoices(choices || []) : null;

  const selectedValue = options.selectedValue;
  const indices = computeMcqIndicesForQuestion(q, selectedValue);
  const selectedIndex = indices.selectedOptionIndex;
  const correctIndex = indices.correctOptionIndex;

  let selectedCell = null;
  if (selectedIndex != null && choices && choices[selectedIndex] != null) {
    selectedCell = choices[selectedIndex];
  }

  const selectedAnswer =
    selectedValue !== undefined && selectedValue !== null
      ? {
          value: truncateEngineValue(mcqCellValue(selectedValue)),
          ...(selectedIndex != null ? { index: selectedIndex } : {}),
        }
      : null;

  if (selectedAnswer && selectedCell) {
    const df = distractorFamilyFromOptionCell(selectedCell);
    if (df) {
      selectedAnswer.distractorFamily = df;
      selectedAnswer.misconceptionTag = df;
    }
  }

  let correctAnswerObj = null;
  const correctRaw =
    q.correctAnswer ??
    (correctIndex != null && choices ? mcqCellValue(choices[correctIndex]) : null);
  if (correctRaw !== undefined && correctRaw !== null) {
    correctAnswerObj = {
      value: truncateEngineValue(mcqCellValue(correctRaw)),
      ...(correctIndex != null ? { index: correctIndex } : {}),
    };
  }

  let distractorFamily = null;
  let misconceptionTag = null;
  if (selectedAnswer) {
    if (selectedAnswer.distractorFamily) {
      distractorFamily = selectedAnswer.distractorFamily;
      misconceptionTag = selectedAnswer.misconceptionTag ?? distractorFamily;
    } else if (questionType === "mcq") {
      distractorFamily = DISTRACTOR_UNKNOWN;
    }
  }

  if (!distractorFamily && strOrNull(diag.distractorFamily)) {
    distractorFamily = String(diag.distractorFamily);
  }

  const answerLeakageRisk = resolveAnswerLeakageRisk(q, options);

  /** @type {Record<string, unknown>} */
  const engine = {
    version: QUESTION_ENGINE_VERSION,
    questionType,
    generatorKind: strOrNull(diag.kind) ?? strOrNull(q.kind) ?? null,
    generatorSource: strOrNull(options.generatorSource) ?? null,
    skillId: strOrNull(diag.diagnosticSkillId) ?? strOrNull(q.skill_key) ?? null,
    subtopic: strOrNull(diag.subtype) ?? strOrNull(q.subtopic) ?? null,
    difficulty:
      strOrNull(q.difficulty) ??
      strOrNull(q.level) ??
      strOrNull(q.params?.difficulty) ??
      null,
    allAnswerChoices,
    selectedAnswer,
    correctAnswer: correctAnswerObj,
    distractorFamily,
    misconceptionTag,
    answerLeakageRisk,
    metadataConfidence: "unknown",
  };

  engine.metadataConfidence = computeMetadataConfidence(engine);
  return engine;
}

/**
 * @param {unknown} raw
 */
export function normalizeQuestionEnginePayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const questionType = strOrNull(raw.questionType) || "unknown";
  const leakage = strOrNull(raw.answerLeakageRisk);
  const answerLeakageRisk = ANSWER_LEAKAGE_RISKS.includes(leakage || "")
    ? leakage
    : "unknown";

  /** @type {Array<Record<string, unknown>>|null} */
  let allAnswerChoices = null;
  if (Array.isArray(raw.allAnswerChoices)) {
    allAnswerChoices = raw.allAnswerChoices
      .slice(0, MAX_MCQ_CHOICES)
      .map((row, index) => {
        if (!row || typeof row !== "object") return null;
        const value = truncateEngineValue(row.value ?? row.label);
        if (value == null) return null;
        /** @type {Record<string, unknown>} */
        const out = {
          index: Number.isFinite(Number(row.index)) ? Number(row.index) : index,
          value,
        };
        const label = truncateEngineValue(row.label);
        if (label && label !== value) out.label = label;
        const df = strOrNull(row.distractorFamily);
        if (df) out.distractorFamily = df;
        const mt = strOrNull(row.misconceptionTag);
        if (mt) out.misconceptionTag = mt;
        return out;
      })
      .filter(Boolean);
    if (!allAnswerChoices.length) allAnswerChoices = null;
  }

  const normalizeAnswerRef = (ref) => {
    if (!ref || typeof ref !== "object") return null;
    const value = truncateEngineValue(ref.value);
    if (value == null) return null;
    /** @type {Record<string, unknown>} */
    const out = { value };
    if (Number.isFinite(Number(ref.index))) out.index = Number(ref.index);
    const df = strOrNull(ref.distractorFamily);
    if (df) out.distractorFamily = df;
    const mt = strOrNull(ref.misconceptionTag);
    if (mt) out.misconceptionTag = mt;
    return out;
  };

  let distractorFamily = strOrNull(raw.distractorFamily);
  if (!distractorFamily && questionType === "mcq") {
    distractorFamily = DISTRACTOR_UNKNOWN;
  }

  /** @type {Record<string, unknown>} */
  const out = {
    version: QUESTION_ENGINE_VERSION,
    questionType,
    generatorKind: strOrNull(raw.generatorKind),
    generatorSource: strOrNull(raw.generatorSource),
    skillId: strOrNull(raw.skillId),
    subtopic: strOrNull(raw.subtopic),
    difficulty: strOrNull(raw.difficulty),
    allAnswerChoices,
    selectedAnswer: normalizeAnswerRef(raw.selectedAnswer),
    correctAnswer: normalizeAnswerRef(raw.correctAnswer),
    distractorFamily,
    misconceptionTag: strOrNull(raw.misconceptionTag),
    answerLeakageRisk,
    metadataConfidence: strOrNull(raw.metadataConfidence) || "unknown",
  };

  out.metadataConfidence = computeMetadataConfidence(out);
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} qe
 */
export function auditQuestionEngineMetadata(qe) {
  const issues = [];
  if (!qe) {
    issues.push("missing_question_engine");
    return { ok: false, issues };
  }
  if (qe.questionType === "mcq" && (!Array.isArray(qe.allAnswerChoices) || qe.allAnswerChoices.length < 2)) {
    issues.push("mcq_missing_choices");
  }
  if (qe.answerLeakageRisk === "stem_leak") {
    issues.push("stem_leak_detected");
  }
  if (qe.distractorFamily === GENERIC_PROXIMITY) {
    issues.push("generic_proximity_only");
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown>} question
 * @param {unknown} selectedAnswer
 * @param {{
 *   generatorSource?: string,
 *   afterStepByStep?: boolean,
 *   explanationViewed?: boolean,
 *   passageVisible?: boolean,
 * }} [options]
 */
export function buildAssignedQuestionSnapshotWithEngine(question, selectedAnswer, options = {}) {
  const engine = buildQuestionEngineMetadataFromQuestion(question, {
    selectedValue: selectedAnswer,
    ...options,
  });
  const normalized = normalizeQuestionEnginePayload(engine);
  return {
    ...question,
    ...(normalized ? { questionEngine: normalized } : {}),
  };
}

/**
 * Pass-through fields for recentMistakes storage only.
 * @param {Record<string, unknown>|null|undefined} questionEngine
 */
export function extractRecentMistakeEngineFields(questionEngine) {
  if (!questionEngine || typeof questionEngine !== "object") return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  if (strOrNull(questionEngine.distractorFamily)) {
    out.distractorFamily = questionEngine.distractorFamily;
  }
  if (strOrNull(questionEngine.questionType)) {
    out.questionType = questionEngine.questionType;
  }
  if (strOrNull(questionEngine.skillId)) {
    out.skillId = questionEngine.skillId;
  }
  if (strOrNull(questionEngine.metadataConfidence)) {
    out.metadataConfidence = questionEngine.metadataConfidence;
  }
  return out;
}
