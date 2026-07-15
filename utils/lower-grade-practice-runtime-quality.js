/**
 * Runtime quality guards for Hebrew and English G1/G2 practice questions.
 * Filters copy-leak MCQs, internal generator labels, and items missing valid audio.
 */

import { validateAudioStemV1, validateAudioStemV2 } from "./audio-task-contract.js";
import { resolveStudentQuestionDisplayParts } from "./student-question-display.js";
import { mcqCellValue } from "./mcq-option-cell.js";

/** Item types where stimulus and answer may differ by case (e.g. C → c). */
export const LOWER_GRADE_APPROVED_NON_LEAK_ITEM_TYPES = Object.freeze(
  new Set(["match_uppercase_lowercase", "choose_matching_letter"])
);

/**
 * Item types where the displayed stimulus IS the correct answer by design.
 * E.g. early_word_reading: student sees "cat", must decode it and select "cat"
 * from distractors. stimulus === correct is intentional — not a copy-leak.
 */
export const LOWER_GRADE_WORD_READING_ITEM_TYPES = Object.freeze(
  new Set(["early_word_reading"])
);

const INTERNAL_CHILD_LABEL_PATTERNS = [
  /משפט\s+\d+/u,
  /בחנה.{0,8}פונולוגית/u,
  /בנק\s+[א-ת׳"']/u,
  /כיתה\s+[א-ת׳"']+\s*-/u,
  /patternFamily|subtype|diagnosticSkillId/i,
  /english_empty_pool/u,
];

const INTERNAL_SUFFIX_RE = /\s*·\s*משפט\s+\d+\s*$/u;

/**
 * @param {string|null|undefined} gradeKey
 */
export function isLowerGradeG1G2Key(gradeKey) {
  const g = String(gradeKey || "").trim().toLowerCase();
  return g === "g1" || g === "g2";
}

/**
 * @param {string} text
 */
export function stripInternalRuntimeSuffix(text) {
  return String(text || "")
    .replace(INTERNAL_SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} text
 */
export function hasInternalChildFacingLabel(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return INTERNAL_CHILD_LABEL_PATTERNS.some((re) => re.test(t));
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function collectChildVisibleSurfaces(question) {
  if (!question || typeof question !== "object") return [];

  const parts = resolveStudentQuestionDisplayParts({
    question: question.question,
    questionLabel: question.questionLabel,
    exerciseText: question.exerciseText,
  });

  const surfaces = [
    parts.leadText,
    parts.bodyText,
    question.question,
    question.questionLabel,
    question.exerciseText,
    question.params?.phonicsStimulus,
    question.params?.displayWord,
    question.params?.displayRef,
  ];

  return surfaces
    .filter((s) => typeof s === "string" && s.trim())
    .map((s) => stripInternalRuntimeSuffix(s));
}

/**
 * @param {string} haystack
 * @param {string} needle
 */
function literalIncludes(haystack, needle) {
  const h = String(haystack || "");
  const n = String(needle || "").trim();
  if (!h || !n || n.length < 1) return false;

  if (/^[a-z0-9]+$/i.test(n)) {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(h);
  }

  if (/[\u0590-\u05FF]/.test(n)) {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(^|[\\s,.;:!?'"(\\[\\{\\-–])${escaped}($|[\\s,.;:!?'")\\]\\}\\-–])`,
      "u"
    ).test(h);
  }

  return h.includes(n);
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function resolveMcqCorrectValue(question) {
  if (!question || typeof question !== "object") return null;
  const direct = question.correctAnswer;
  if (direct != null && String(direct).trim()) return String(direct).trim();

  const answers = Array.isArray(question.answers) ? question.answers : [];
  const idx = Number(question.correctIndex);
  if (Number.isInteger(idx) && idx >= 0 && idx < answers.length) {
    return String(mcqCellValue(answers[idx]) ?? "").trim();
  }
  return null;
}

/**
 * Strict copy-leak check for G1/G2 MCQs.
 * @param {Record<string, unknown>|null|undefined} question
 */
export function hasMcqCopyAnswerLeak(question) {
  if (!question || typeof question !== "object") return false;
  const answers = Array.isArray(question.answers) ? question.answers : [];
  if (answers.length < 2) return false;

  const correct = resolveMcqCorrectValue(question);
  if (!correct || correct.length < 1) return false;

  const itemType = String(
    question.params?.itemType || question.params?.subtype || ""
  ).trim();

  // Word-reading exercises: stimulus IS the target word by design; not a copy-leak.
  if (LOWER_GRADE_WORD_READING_ITEM_TYPES.has(itemType)) return false;

  if (LOWER_GRADE_APPROVED_NON_LEAK_ITEM_TYPES.has(itemType)) {
    const stimulus = String(
      question.params?.phonicsStimulus ||
        question.params?.displayRef ||
        question.params?.displayWord ||
        ""
    ).trim();
    if (!stimulus) return false;
    return stimulus === correct;
  }

  const surfaces = collectChildVisibleSurfaces(question);
  return surfaces.some((surface) => literalIncludes(surface, correct));
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function hasInternalLabelsInChildSurfaces(question) {
  return collectChildVisibleSurfaces(question).some(hasInternalChildFacingLabel);
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function hasValidLowerGradePracticeAudio(question) {
  const stem = question?.params?.audioStem;
  if (!stem || typeof stem !== "object") return false;
  if (stem.recording_required === true) return false;
  const schema = stem.schema_version;
  if (schema === 2) return validateAudioStemV2(stem);
  return validateAudioStemV1(stem);
}

/**
 * Hebrew G1/G2 reading rows where the stem quotes the same sentence/word as the correct MCQ option.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isHebrewReadAloudCopyLeakRaw(row) {
  if (!row || typeof row !== "object") return false;
  const answers = Array.isArray(row.answers) ? row.answers : [];
  if (answers.length < 2) return false;
  const idx = Number(row.correct) || 0;
  const correct = String(mcqCellValue(answers[idx]) ?? "").trim();
  if (!correct) return false;
  const stem = String(row.question || "").trim();
  if (!stem) return false;
  if (!/קרא את המ(?:שפט|ילה)/i.test(stem)) return false;
  return hasMcqCopyAnswerLeak({
    question: stem,
    exerciseText: stem,
    answers,
    correctAnswer: correct,
    correctIndex: idx,
  });
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isEnglishPhonicsCopyLeakRow(row) {
  // early_word_reading: displayWord === correct is the intended design (word recognition).
  // Students decode the displayed word and select it — not a copy-leak.
  if (!row || typeof row !== "object") return false;
  if (LOWER_GRADE_WORD_READING_ITEM_TYPES.has(String(row.itemType || ""))) return false;
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @param {{ gradeKey?: string, subject?: string }} [ctx]
 */
export function isG1G2RuntimePracticeEligible(question, ctx = {}) {
  const gradeKey = ctx.gradeKey;
  if (!isLowerGradeG1G2Key(gradeKey)) return true;
  if (!question || typeof question !== "object") return false;

  if (question.params?.pictureRef) return false;
  if (question.params?.requiresAudio === true) return false;

  if (hasInternalLabelsInChildSurfaces(question)) return false;
  if (hasMcqCopyAnswerLeak(question)) return false;
  if (!hasValidLowerGradePracticeAudio(question)) return false;

  return true;
}

/**
 * Strip internal suffixes and replace technical audio hints on child-facing fields.
 * @param {Record<string, unknown>} question
 */
export function sanitizeLowerGradeChildFacingText(question) {
  if (!question || typeof question !== "object") return question;

  const clean = (text) => {
    let t = stripInternalRuntimeSuffix(String(text || ""));
    t = t.replace(/הבחנה\s+פונולוגית/gu, "הצליל");
    t = t.replace(/לפי\s+ההבחנה\s+הפונולוגית/gu, "לפי הצליל");
    return t.trim();
  };

  if (typeof question.questionLabel === "string") {
    const label = clean(question.questionLabel);
    question.questionLabel =
      label === "שמע" || label === "הקלטה קצרה" ? "האזינו ובחרו" : label;
  }
  if (typeof question.exerciseText === "string") {
    question.exerciseText = clean(question.exerciseText);
  }
  if (typeof question.question === "string") {
    question.question = clean(question.question);
  }
  return question;
}
