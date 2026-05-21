/**
 * Shared extraction of diagnostic fields for mistake records (additive; no UI changes).
 * Aligns with `normalizeMistakeEvent` (`utils/mistake-event.js`): responseMs, hintUsed, retryCount, firstTryCorrect.
 */

import { mcqCellValue } from "./mcq-option-cell.js";

/**
 * Match MCQ cell (string or `{ value }`) to learner selection (same shape or plain value).
 *
 * @param {unknown} cell
 * @param {unknown} selectedUserAnswer
 */
function answerCellMatchesSelected(cell, selectedUserAnswer) {
  if (cell === selectedUserAnswer) return true;
  const cv = mcqCellValue(cell);
  const sv =
    selectedUserAnswer != null &&
    typeof selectedUserAnswer === "object" &&
    !Array.isArray(selectedUserAnswer) &&
    "value" in /** @type {Record<string, unknown>} */ (selectedUserAnswer)
      ? mcqCellValue(selectedUserAnswer)
      : selectedUserAnswer;
  if (cv === sv) return true;
  return String(cv ?? "") === String(sv ?? "");
}

/** @param {unknown} v */
export function strOrNull(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @param {object} [runtime]
 * @param {number|null|undefined} [runtime.responseMs]
 * @param {boolean|null|undefined} [runtime.hintUsed]
 * @param {number|null|undefined} [runtime.retryCount]
 * @param {boolean|null|undefined} [runtime.firstTryCorrect]
 * @returns {Record<string, unknown>}
 */
export function extractDiagnosticMetadataFromQuestion(question, runtime = {}) {
  const rt = runtime && typeof runtime === "object" ? runtime : {};
  const base = extractParamsLikeFields(question);
  const q = question && typeof question === "object" ? question : null;
  const questionId =
    q?.id != null
      ? String(q.id)
      : q?.questionLabel != null
        ? String(q.questionLabel)
        : null;

  /** @type {Record<string, unknown>} */
  const out = {
    ...base,
    questionId,
    correctAnswer:
      q && q.correctAnswer !== undefined
        ? q.correctAnswer
        : q && Array.isArray(q.options) && q.correctIndex != null
          ? q.options[q.correctIndex]
          : undefined,
  };

  if (rt.responseMs != null && Number.isFinite(Number(rt.responseMs))) {
    out.responseMs = Math.max(0, Math.round(Number(rt.responseMs)));
  }
  if (typeof rt.hintUsed === "boolean") {
    out.hintUsed = rt.hintUsed;
  }
  if (rt.retryCount != null && Number.isFinite(Number(rt.retryCount))) {
    out.retryCount = Math.max(0, Math.round(Number(rt.retryCount)));
  }
  if (typeof rt.firstTryCorrect === "boolean") {
    out.firstTryCorrect = rt.firstTryCorrect;
  }

  return omitUndefined(out);
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
function extractParamsLikeFields(question) {
  if (!question || typeof question !== "object") {
    return {
      patternFamily: undefined,
      semanticFamily: undefined,
      conceptTag: undefined,
      kind: undefined,
      subtype: undefined,
      distractorFamily: undefined,
      diagnosticSkillId: undefined,
    };
  }
  const params =
    question.params && typeof question.params === "object" ? question.params : {};
  const pick = (pk, qk) =>
    strOrNull(params[pk]) ?? strOrNull(question[qk]);
  const patternFamily =
    pick("patternFamily", "patternFamily") ??
    pick("semanticFamily", "semanticFamily");
  const rawTags = params.expectedErrorTags ?? question.expectedErrorTags;
  /** @type {string[]|undefined} */
  let expectedErrorTags;
  if (Array.isArray(rawTags)) {
    const arr = rawTags.map((t) => String(t).trim()).filter(Boolean);
    if (arr.length) expectedErrorTags = arr;
  }
  return {
    patternFamily: patternFamily ?? undefined,
    semanticFamily: strOrNull(params.semanticFamily ?? question.semanticFamily) ?? undefined,
    conceptTag: pick("conceptTag", "conceptTag") ?? undefined,
    kind: pick("kind", "kind") ?? undefined,
    subtype: pick("subtype", "subtype") ?? undefined,
    distractorFamily: pick("distractorFamily", "distractorFamily") ?? undefined,
    diagnosticSkillId:
      strOrNull(question.diagnosticSkillId) ??
      strOrNull(params.diagnosticSkillId) ??
      undefined,
    expectedErrorTags,
    probePower: pick("probePower", "probePower") ?? undefined,
    nextProbeSkillId: pick("nextProbeSkillId", "nextProbeSkillId") ?? undefined,
  };
}

/** @param {Record<string, unknown>} obj */
function omitUndefined(obj) {
  /** @type {Record<string, unknown>} */
  const o = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) o[k] = v;
  }
  return o;
}

/**
 * Merge extracted diagnostic fields into a mistake entry without removing existing keys.
 * Skips `undefined` only; preserves `false` and `0`.
 *
 * @param {Record<string, unknown>} entry
 * @param {Record<string, unknown>} diagnosticPatch
 */
export function mergeDiagnosticIntoMistakeEntry(entry, diagnosticPatch) {
  const base = entry && typeof entry === "object" ? entry : {};
  const patch = diagnosticPatch && typeof diagnosticPatch === "object" ? diagnosticPatch : {};
  /** @type {Record<string, unknown>} */
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * For MCQ-style questions with `answers` array: resolve selected and correct indices when the learner
 * picked one of the listed option values (strict equality).
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @param {unknown} selectedUserAnswer — value passed to handleAnswer (same as option cell)
 * @returns {{ selectedOptionIndex?: number, correctOptionIndex?: number }}
 */
export function computeMcqIndicesForQuestion(question, selectedUserAnswer) {
  if (!question || typeof question !== "object") return {};
  const answers = question.answers;
  if (!Array.isArray(answers) || answers.length < 2) return {};

  let selectedOptionIndex = -1;
  for (let i = 0; i < answers.length; i++) {
    if (answerCellMatchesSelected(answers[i], selectedUserAnswer)) {
      selectedOptionIndex = i;
      break;
    }
  }
  if (selectedOptionIndex < 0) return {};

  let correctOptionIndex = -1;
  const correct = question.correctAnswer;
  if (correct !== undefined) {
    const ci = answers.findIndex((a) => answerCellMatchesSelected(a, correct));
    if (ci >= 0) correctOptionIndex = ci;
  }

  /** @type {{ selectedOptionIndex?: number, correctOptionIndex?: number }} */
  const out = { selectedOptionIndex };
  if (correctOptionIndex >= 0) out.correctOptionIndex = correctOptionIndex;
  return out;
}

/**
 * Optional distractor label when options are objects with `value` + `distractorFamily`.
 *
 * @param {unknown} optionCell
 */
export function distractorFamilyFromOptionCell(optionCell) {
  if (!optionCell || typeof optionCell !== "object") return undefined;
  const o = /** @type {Record<string, unknown>} */ (optionCell);
  const df = strOrNull(o.distractorFamily);
  if (df) return df;
  return strOrNull(o.errorTag) ?? undefined;
}
