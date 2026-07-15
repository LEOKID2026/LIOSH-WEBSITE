/**
 * Assigned activity question snapshot — normalize, freeze, and reconstruct questions.
 * Shared read/normalize utilities only. Teacher and parent write paths stay separate.
 */

import { randomUUID } from "crypto";
import {
  extractCorrectAnswerFromQuestion,
  jsonSafeCloneForStorage,
} from "./classroom-activities-shared.server.js";
import {
  extractFrozenQuestionChoices,
  extractFrozenQuestionText,
  mergeFrozenQuestionSources,
  mapFrozenQuestionDetail,
} from "./frozen-activity-question.server.js";

export const SNAPSHOT_STATUS_FROZEN = "frozen";
export const SNAPSHOT_STATUS_LEGACY_MISSING = "legacy_missing";

/**
 * @param {number} questionIndex
 */
export function legacyQuestionUnavailableLabel(questionIndex) {
  return `שאלה ${questionIndex + 1} - לא זמינה`;
}

/**
 * @param {Record<string, unknown>} q
 * @param {string|null|undefined} subject
 */
function detectGeneratorSource(q, subject) {
  if (q.generator_source != null && String(q.generator_source).trim()) {
    return String(q.generator_source).trim();
  }
  if (q.generatorSource != null && String(q.generatorSource).trim()) {
    return String(q.generatorSource).trim();
  }
  const params = q.params && typeof q.params === "object" && !Array.isArray(q.params) ? q.params : null;
  if (params?.patternFamily != null && String(params.patternFamily).trim()) {
    return String(params.patternFamily).trim();
  }
  if (params?.generatorSource != null && String(params.generatorSource).trim()) {
    return String(params.generatorSource).trim();
  }
  if (q.id != null && String(q.id).trim()) {
    return `${subject || "unknown"}-static-bank`;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} q
 */
function detectSourceQuestionId(q) {
  if (q.source_question_id != null && String(q.source_question_id).trim()) {
    return String(q.source_question_id).trim();
  }
  if (q.sourceQuestionId != null && String(q.sourceQuestionId).trim()) {
    return String(q.sourceQuestionId).trim();
  }
  if (q.id != null && String(q.id).trim()) {
    return String(q.id).trim();
  }
  return null;
}

/**
 * Normalize raw generator output to canonical frozen snapshot shape and assign stable qk.
 *
 * @param {unknown[]} rawSet
 * @param {{
 *   subject?: string|null,
 *   topic?: string|null,
 *   subtopic?: string|null,
 *   grade?: string|null,
 *   gradeLevel?: string|null,
 *   difficulty?: string|null,
 *   difficultyLevel?: string|null,
 *   skillKey?: string|null,
 * }} [ctx]
 */
export function normalizeAndFreezeQuestionSet(rawSet, ctx = {}) {
  if (!Array.isArray(rawSet)) return [];

  const {
    subject = null,
    topic = null,
    subtopic = null,
    grade = null,
    gradeLevel = null,
    difficulty = null,
    difficultyLevel = null,
    skillKey = null,
  } = ctx;

  const resolvedGrade = grade || gradeLevel || null;
  const resolvedDifficulty = difficulty || difficultyLevel || null;
  const resolvedSkillKey = skillKey || null;

  return rawSet.map((raw, index) => {
    const q = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const questionText =
      extractFrozenQuestionText(q) || String(q.params?.kind || "").trim();
    const choices = extractFrozenQuestionChoices(q);
    const correctAnswer = extractCorrectAnswerFromQuestion(q);

    /** @type {Record<string, unknown>} */
    const normalized = {
      qk:
        typeof q.qk === "string" && String(q.qk).trim()
          ? String(q.qk).trim()
          : randomUUID(),
      question_index: index,
      question: questionText,
      correct_answer: correctAnswer,
      subject: q.subject != null ? String(q.subject) : subject,
      topic: q.topic != null ? String(q.topic) : topic,
      operation:
        q.operation != null
          ? String(q.operation)
          : q.topic != null
            ? String(q.topic)
            : topic != null
              ? String(topic)
              : null,
      subtopic: q.subtopic != null ? String(q.subtopic) : subtopic,
      grade:
        q.grade != null
          ? String(q.grade)
          : q.gradeLevel != null
            ? String(q.gradeLevel)
            : resolvedGrade,
      difficulty:
        q.difficulty != null
          ? String(q.difficulty)
          : q.difficultyLevel != null
            ? String(q.difficultyLevel)
            : q.difficulty_level != null
              ? String(q.difficulty_level)
              : resolvedDifficulty,
      source_difficulty:
        q.source_difficulty != null
          ? String(q.source_difficulty)
          : q.sourceDifficulty != null
            ? String(q.sourceDifficulty)
            : null,
      display_level:
        q.display_level != null
          ? String(q.display_level)
          : q.displayLevel != null
            ? String(q.displayLevel)
            : null,
      skill_key:
        q.skill_key != null
          ? String(q.skill_key)
          : q.skillKey != null
            ? String(q.skillKey)
            : resolvedSkillKey,
      source_question_id: detectSourceQuestionId(q),
      generator_source: detectGeneratorSource(q, subject),
    };

    if (choices?.length) normalized.choices = choices;
    if (q.params && typeof q.params === "object" && !Array.isArray(q.params)) {
      normalized.params = q.params;
    }
    if (q.explanation != null) normalized.explanation = String(q.explanation);
    if (q.hint != null) normalized.hint = String(q.hint);
    if (q.shape != null) normalized.shape = String(q.shape);

    return normalized;
  });
}

/**
 * @param {unknown[]} questionSet
 * @param {Parameters<typeof normalizeAndFreezeQuestionSet>[1]} ctx
 */
export function buildFrozenActivityInsertFields(questionSet, ctx = {}) {
  const normalized = normalizeAndFreezeQuestionSet(questionSet, ctx);
  return {
    question_set: jsonSafeCloneForStorage(normalized),
    snapshot_status: SNAPSHOT_STATUS_FROZEN,
    snapshot_frozen_at: new Date().toISOString(),
  };
}

/**
 * @param {unknown} snapshotStatus
 */
export function normalizeSnapshotStatus(snapshotStatus) {
  const value = String(snapshotStatus || SNAPSHOT_STATUS_LEGACY_MISSING).trim();
  return value === SNAPSHOT_STATUS_FROZEN ? SNAPSHOT_STATUS_FROZEN : SNAPSHOT_STATUS_LEGACY_MISSING;
}

/**
 * @param {unknown[]} qSet
 * @param {number} questionIndex
 */
export function resolveQuestionFromFrozenSet(qSet, questionIndex) {
  const list = Array.isArray(qSet) ? qSet : [];
  const question = list[questionIndex];
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return null;
  }
  return question;
}

/**
 * @param {number} questionIndex
 * @param {number} questionCount
 * @param {unknown[]} qSet
 */
export function validateAssignedActivityQuestionIndex(questionIndex, questionCount, qSet) {
  if (!Number.isFinite(questionIndex) || questionIndex < 0 || questionIndex >= questionCount) {
    return {
      ok: false,
      status: 400,
      code: "validation_failed",
      message: "invalid question_index",
    };
  }

  const list = Array.isArray(qSet) ? qSet : [];
  if (questionIndex >= list.length) {
    return {
      ok: false,
      status: 400,
      code: "question_index_out_of_range",
      message: "question_index exceeds question_set length",
    };
  }

  return { ok: true };
}

/**
 * @param {Record<string, unknown>} question
 * @param {Record<string, unknown>} activityRow
 */
export function buildAttemptSnapshotFields(question, activityRow) {
  const skillKey =
    activityRow.skill_key ||
    (question.skillKey != null ? String(question.skillKey) : null) ||
    (question.skill_key != null ? String(question.skill_key) : null);

  const questionKey =
    question.qk != null && String(question.qk).trim() ? String(question.qk).trim() : null;

  return {
    question_snapshot: { ...question },
    question_key: questionKey,
    skill_key: skillKey,
  };
}

/**
 * @param {"class"|"student"|"parent"} scope
 * @param {string} activityId
 * @param {number} questionIndex
 */
export function warnLegacyQuestionKeyMissing(scope, activityId, questionIndex) {
  console.warn(
    `[assigned-activity-snapshot] missing question_key scope=${scope} activityId=${activityId} questionIndex=${questionIndex}`
  );
}

/**
 * Build ordered question rows for authorized review (teacher / parent / school).
 *
 * @param {{
 *   questionSet: unknown[],
 *   attempts: Array<Record<string, unknown>>,
 *   questionCount: number,
 *   snapshotStatus?: string|null,
 *   subject?: string|null,
 *   topic?: string|null,
 * }} input
 */
export function mapAssignedActivityQuestionAnswerDetail(input) {
  const qSet = Array.isArray(input.questionSet) ? input.questionSet : [];
  const count = Math.max(0, Number(input.questionCount) || 0);
  const snapshotStatus = normalizeSnapshotStatus(input.snapshotStatus);

  /** @type {Map<number, Record<string, unknown>>} */
  const attemptByIdx = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const attemptByKey = new Map();

  for (const row of input.attempts || []) {
    const idx = Number(row.question_index);
    if (Number.isFinite(idx) && idx >= 0) attemptByIdx.set(idx, row);
    const key =
      row.question_key != null && String(row.question_key).trim()
        ? String(row.question_key).trim()
        : null;
    if (key) attemptByKey.set(key, row);
  }

  /** @type {Array<Record<string, unknown>>} */
  const questions = [];

  for (let i = 0; i < count; i += 1) {
    const frozen = qSet[i] && typeof qSet[i] === "object" ? qSet[i] : {};
    const frozenKey =
      frozen.qk != null && String(frozen.qk).trim() ? String(frozen.qk).trim() : null;
    const att = (frozenKey && attemptByKey.get(frozenKey)) || attemptByIdx.get(i) || null;
    const merged = mergeFrozenQuestionSources(frozen, att?.question_snapshot);
    const detail = mapFrozenQuestionDetail(merged, i, {
      subject: input.subject,
      topic: input.topic,
    });

    let questionText = detail.questionText;
    if (!questionText && snapshotStatus === SNAPSHOT_STATUS_LEGACY_MISSING) {
      questionText = legacyQuestionUnavailableLabel(i);
    }

    questions.push({
      questionIndex: i,
      questionKey: frozenKey || (att?.question_key != null ? String(att.question_key) : null),
      question: questionText,
      choices: detail.choices,
      selectedAnswer:
        att?.selected_answer != null && String(att.selected_answer).trim() !== ""
          ? String(att.selected_answer)
          : null,
      correctAnswer:
        att?.correct_answer != null && String(att.correct_answer).trim() !== ""
          ? String(att.correct_answer)
          : detail.correctAnswer || null,
      isCorrect: att?.is_correct ?? null,
      answeredAt: att?.answered_at ?? null,
      subject: detail.subject,
      topic: detail.topic,
      params: detail.params,
      shape: detail.shape,
      snapshotStatus,
      legacyFallback:
        snapshotStatus === SNAPSHOT_STATUS_LEGACY_MISSING &&
        !extractFrozenQuestionText(frozen) &&
        !(att?.question_snapshot && extractFrozenQuestionText(att.question_snapshot)),
    });
  }

  return questions;
}
