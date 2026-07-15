/**
 * Frozen classroom-activity question extraction from stored question_set / snapshots.
 * Supports all real stored field shapes (including SIM stub sets with questionText/options).
 * Never regenerates from question banks.
 */

import { sanitizeGeometryActivityQuestionStem } from "../../utils/geometry-activity-question-stem.js";
import { sanitizeStudentQuestionStem } from "../../utils/student-question-stem-sanitizer.js";
import { extractCorrectAnswerFromQuestion } from "./classroom-activities-shared.server.js";

/** Hebrew multiple-choice letter order used in stored sets. */
export const FROZEN_OPTION_LETTERS_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];

/**
 * @param {unknown} value
 * @returns {number}
 */
export function hebrewOptionLetterToIndex(value) {
  const s = String(value ?? "").trim();
  if (!s) return -1;
  return FROZEN_OPTION_LETTERS_HE.indexOf(s);
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>|null}
 */
function asQuestionObject(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw;
}

/**
 * Extract question stem from a frozen question object.
 * @param {unknown} raw
 * @returns {string}
 */
export function extractFrozenQuestionText(raw) {
  const q = asQuestionObject(raw);
  if (!q) return "";

  /** @type {unknown[]} */
  const candidates = [
    q.question,
    q.prompt,
    q.stem,
    q.questionText,
    q.text,
    q.body,
  ];

  const nested = q.content;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    candidates.push(nested.question, nested.prompt, nested.text, nested.body);
  }

  const stemObj = q.stem;
  if (stemObj && typeof stemObj === "object" && !Array.isArray(stemObj)) {
    candidates.push(stemObj.text, stemObj.question, stemObj.prompt);
  }

  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }

  return "";
}

/**
 * Normalize a single choice entry to display text.
 * @param {unknown} entry
 */
function normalizeChoiceEntry(entry) {
  if (entry == null) return "";
  if (typeof entry === "object" && !Array.isArray(entry)) {
    const obj = entry;
    const s = String(
      obj.text ?? obj.label ?? obj.value ?? obj.answer ?? obj.content ?? ""
    ).trim();
    return s;
  }
  return String(entry).trim();
}

/**
 * Extract answer options from a frozen question object.
 * @param {unknown} raw
 * @returns {string[]|null}
 */
export function extractFrozenQuestionChoices(raw) {
  const q = asQuestionObject(raw);
  if (!q) return null;

  const rawList =
    q.choices ??
    q.options ??
    q.answers ??
    q.answerOptions ??
    (q.params && typeof q.params === "object" && !Array.isArray(q.params)
      ? q.params.answers ??
        (Array.isArray(q.params.mcqOptionCells)
          ? q.params.mcqOptionCells.map((c) =>
              c && typeof c === "object" ? c.value : c
            )
          : null)
      : null) ??
    null;
  if (!Array.isArray(rawList) || !rawList.length) return null;

  const choices = rawList.map(normalizeChoiceEntry).filter(Boolean);
  return choices.length ? choices : null;
}

/**
 * Extract raw correct-answer token from a frozen question object.
 * @param {unknown} raw
 * @returns {string}
 */
export function extractFrozenCorrectAnswerRaw(raw) {
  const q = asQuestionObject(raw);
  if (!q) return "";
  const fromHelper = extractCorrectAnswerFromQuestion(q);
  if (fromHelper) return fromHelper;

  for (const key of ["correct", "solution"]) {
    if (q[key] == null) continue;
    const s = String(q[key]).trim();
    if (s) return s;
  }
  return "";
}

/**
 * Resolve a stored answer token (letter, index, or literal text) against choices.
 * @param {string[]|null|undefined} choices
 * @param {unknown} rawAnswer
 * @returns {{ display: string, resolvedText: string, letter: string|null }}
 */
export function resolveFrozenAnswerAgainstChoices(choices, rawAnswer) {
  const raw = String(rawAnswer ?? "").trim();
  if (!raw) {
    return { display: "", resolvedText: "", letter: null };
  }

  const list = Array.isArray(choices) ? choices : null;
  if (!list?.length) {
    return { display: raw, resolvedText: raw, letter: null };
  }

  // Direct literal match against a choice value
  const directIdx = list.findIndex((c) => c === raw);
  if (directIdx >= 0) {
    const letter = FROZEN_OPTION_LETTERS_HE[directIdx] || null;
    if (letter && raw === letter) {
      return { display: raw, resolvedText: raw, letter };
    }
    if (letter && raw !== letter) {
      return { display: `${letter} - ${raw}`, resolvedText: raw, letter };
    }
    return { display: raw, resolvedText: raw, letter };
  }

  // Hebrew letter index (א=0, ב=1, …)
  const heIdx = hebrewOptionLetterToIndex(raw);
  if (heIdx >= 0 && heIdx < list.length) {
    const text = list[heIdx];
    const letter = FROZEN_OPTION_LETTERS_HE[heIdx];
    if (text === raw || text === letter) {
      return { display: text, resolvedText: text, letter };
    }
    return { display: `${letter} - ${text}`, resolvedText: text, letter };
  }

  // Latin letter index (A=0, B=1, …)
  if (/^[A-Da-d]$/.test(raw)) {
    const latIdx = raw.toUpperCase().charCodeAt(0) - 65;
    if (latIdx >= 0 && latIdx < list.length) {
      const text = list[latIdx];
      const letter = FROZEN_OPTION_LETTERS_HE[latIdx] || raw.toUpperCase();
      if (text === raw) return { display: text, resolvedText: text, letter };
      return { display: `${letter} - ${text}`, resolvedText: text, letter };
    }
  }

  // Numeric index
  const num = Number(raw);
  if (Number.isInteger(num) && num >= 0 && num < list.length) {
    const text = list[num];
    const letter = FROZEN_OPTION_LETTERS_HE[num] || String(num + 1);
    return { display: `${letter} - ${text}`, resolvedText: text, letter };
  }

  return { display: raw, resolvedText: raw, letter: null };
}

/**
 * Format correct answer for teacher export display.
 * @param {string[]|null|undefined} choices
 * @param {unknown} rawCorrect
 */
export function formatFrozenCorrectAnswerForExport(choices, rawCorrect) {
  return resolveFrozenAnswerAgainstChoices(choices, rawCorrect).display;
}

/**
 * Format a student selected answer for teacher export display.
 * @param {string[]|null|undefined} choices
 * @param {unknown} rawSelected
 */
export function formatFrozenSelectedAnswerForExport(choices, rawSelected) {
  return resolveFrozenAnswerAgainstChoices(choices, rawSelected).display;
}

/**
 * Merge frozen question_set item with optional per-attempt snapshot (richer wins).
 * @param {unknown} frozen
 * @param {unknown} [snapshot]
 */
export function mergeFrozenQuestionSources(frozen, snapshot) {
  const base = asQuestionObject(frozen) || {};
  const snap = asQuestionObject(snapshot) || {};

  /** @type {Record<string, unknown>} */
  const merged = { ...base, ...snap };

  // Prefer non-empty text/choices from either source
  const text =
    extractFrozenQuestionText(snap) || extractFrozenQuestionText(base);
  if (text) {
    merged.question = text;
  }

  const choices =
    extractFrozenQuestionChoices(snap) || extractFrozenQuestionChoices(base);
  if (choices) {
    merged.choices = choices;
  }

  const correct =
    extractFrozenCorrectAnswerRaw(snap) || extractFrozenCorrectAnswerRaw(base);
  if (correct) {
    merged.correctAnswer = correct;
  }

  return merged;
}

/**
 * Map a frozen question object to the normalized QuestionDetail shape.
 *
 * @param {unknown} raw
 * @param {number} index
 * @param {{ subject?: string|null, topic?: string|null, resolveSkillLabelHe?: (skillKey: string|null, ctx: { subject?: string|null, topic?: string|null }) => string|null }} ctx
 */
export function mapFrozenQuestionDetail(raw, index, ctx = {}) {
  const q = asQuestionObject(raw) || {};
  const subject = q.subject != null ? String(q.subject) : ctx.subject ?? null;
  const topic = q.topic != null ? String(q.topic) : ctx.topic ?? null;

  const params =
    q.params && typeof q.params === "object" && !Array.isArray(q.params)
      ? q.params
      : null;

  let questionText = extractFrozenQuestionText(q);
  if (questionText) {
    questionText = sanitizeStudentQuestionStem(questionText);
    questionText = sanitizeGeometryActivityQuestionStem(questionText, {
      kind: params?.kind != null ? String(params.kind) : undefined,
      topic: topic ?? undefined,
      subject: subject ?? undefined,
    });
  }

  const choices = extractFrozenQuestionChoices(q);
  const correctRaw = extractFrozenCorrectAnswerRaw(q);
  const correctAnswerDisplay = formatFrozenCorrectAnswerForExport(choices, correctRaw);

  const skillKey =
    q.skillKey != null
      ? String(q.skillKey)
      : q.skill_key != null
        ? String(q.skill_key)
        : null;

  const skillLabelHe = ctx.resolveSkillLabelHe
    ? ctx.resolveSkillLabelHe(skillKey, { subject, topic })
    : null;

  return {
    questionIndex: index,
    questionText,
    choices,
    correctAnswer: correctRaw,
    correctAnswerDisplay,
    skillKey,
    skillLabelHe,
    subject,
    topic,
    difficultyLevel:
      q.difficulty_level != null
        ? String(q.difficulty_level)
        : q.difficultyLevel != null
          ? String(q.difficultyLevel)
          : q.difficulty != null
            ? String(q.difficulty)
            : null,
    hint: q.hint != null ? String(q.hint) : null,
    explanation: q.explanation != null ? String(q.explanation) : null,
    params,
    shape: q.shape != null ? String(q.shape) : null,
  };
}
