import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";
import { normalizeMoledetGeographyActivitySubjectId } from "../learning-shared/moledet-geography-subject-id.js";
import { sanitizeGeometryActivityQuestionStem } from "../../utils/geometry-activity-question-stem.js";
import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import { extractAssignedActivityMathMcqChoiceList } from "./assigned-activity-math-mcq.js";
import {
  ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS,
  isActivityPreviewSubjectSupported,
} from "./classroom-activities-preview.js";

export { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS, isActivityPreviewSubjectSupported };

export const ACTIVITY_MODES = new Set([
  "live_lesson",
  "guided_practice",
  "quiz",
  "homework",
  "discussion",
]);

export const ACTIVITY_STATUSES = new Set([
  "draft",
  "active",
  "paused",
  "closed",
  "archived",
]);

export const QUESTION_SELECTION_MODES = new Set(["same_exact", "controlled_variants"]);

export const STUDENT_ACTIVITY_STATUSES = new Set([
  "not_started",
  "in_progress",
  "submitted",
  "timed_out",
]);

export const DIFFICULTY_LEVELS = new Set(["easy", "medium", "hard", "mixed"]);

/**
 * @param {unknown} raw
 */
export function normalizeActivitySubject(raw) {
  const subject = String(raw || "").trim().toLowerCase();
  const moledet = normalizeMoledetGeographyActivitySubjectId(subject);
  if (moledet) return moledet;
  if (!LEARNING_SUBJECT_ALLOWLIST.has(subject)) return null;
  return subject;
}

/**
 * @param {unknown} raw
 */
export function normalizeActivityMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  return ACTIVITY_MODES.has(mode) ? mode : null;
}

/**
 * @param {unknown} raw
 */
export function normalizeQuestionSelection(raw) {
  const sel = String(raw || "same_exact").trim().toLowerCase();
  return QUESTION_SELECTION_MODES.has(sel) ? sel : null;
}

/**
 * @param {unknown} raw
 */
export function normalizeDifficultyLevel(raw) {
  if (raw == null || raw === "") return null;
  const d = String(raw).trim().toLowerCase();
  return DIFFICULTY_LEVELS.has(d) ? d : null;
}

/**
 * Extract canonical correct answer from a frozen question object.
 * @param {Record<string, unknown>} q
 */
export function extractCorrectAnswerFromQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const candidates = [
    q.correct_answer,
    q.correctAnswer,
    q.expectedAnswer,
    q.answer,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

/**
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 */
export function answersMatch(a, b) {
  const left = String(a ?? "").trim().replace(/\s+/g, " ");
  const right = String(b ?? "").trim().replace(/\s+/g, " ");
  if (!left || !right) return false;
  if (left === right) return true;
  const leftNum = Number(left.replace(/,/g, ""));
  const rightNum = Number(right.replace(/,/g, ""));
  if (Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum === rightNum) {
    return true;
  }
  return left.toLowerCase() === right.toLowerCase();
}

/**
 * Deep-clone for jsonb storage: drops undefined keys, converts NaN/Infinity to null.
 * @param {unknown} value
 */
export function jsonSafeCloneForStorage(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "number" && !Number.isFinite(v)) return null;
      return v;
    })
  );
}

/**
 * @param {unknown} questionSet
 * @param {number} expectedCount
 */
export function validateSameExactQuestionSet(questionSet, expectedCount) {
  if (!Array.isArray(questionSet) || questionSet.length === 0) {
    return { ok: false, code: "question_set_empty", message: "question_set must be a non-empty array" };
  }
  if (questionSet.length !== expectedCount) {
    return {
      ok: false,
      code: "question_set_count_mismatch",
      message: `question_set length (${questionSet.length}) must match question_count (${expectedCount})`,
    };
  }
  for (let i = 0; i < questionSet.length; i += 1) {
    const q = questionSet[i];
    if (!q || typeof q !== "object" || Array.isArray(q)) {
      return { ok: false, code: "question_set_invalid", message: `question_set[${i}] must be an object` };
    }
    const prompt =
      String(q.question || q.prompt || q.stem || "").trim() ||
      String(q.params?.kind || "").trim();
    if (!prompt) {
      return { ok: false, code: "question_set_invalid", message: `question_set[${i}] missing question text` };
    }
    const correct = extractCorrectAnswerFromQuestion(q);
    if (!correct) {
      return {
        ok: false,
        code: "question_set_invalid",
        message: `question_set[${i}] missing correct_answer`,
      };
    }
  }
  return { ok: true };
}

/**
 * Strip scoring fields before sending questions to students.
 * Quiz mode must not expose hint or explanation in the payload (not only in UI).
 * @param {unknown} questionSet
 * @param {string} [activityMode]
 * @param {{ hideExplanation?: boolean }} [opts]
 */
export function stripQuestionSetForStudent(questionSet, activityMode, opts = {}) {
  if (!Array.isArray(questionSet)) return [];
  const isQuiz = activityMode === "quiz";
  const hideExplanation = isQuiz || opts.hideExplanation === true;
  return questionSet.map((raw, index) => {
    const q = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
    delete q.correct_answer;
    delete q.correctAnswer;
    delete q.expectedAnswer;
    delete q.answer;
    const mathMcqChoices = extractAssignedActivityMathMcqChoiceList(q);
    const out = {
      index,
      question: sanitizeGeometryActivityQuestionStem(
        String(q.question || q.prompt || q.stem || "").trim(),
        {
          kind:
            q.params && typeof q.params === "object" && !Array.isArray(q.params)
              ? q.params.kind
              : undefined,
          topic: q.topic != null ? String(q.topic) : undefined,
          subject: q.subject != null ? String(q.subject) : undefined,
        }
      ),
      params: q.params && typeof q.params === "object" ? q.params : undefined,
      choices: mathMcqChoices
        ? mathMcqChoices
        : Array.isArray(q.choices)
          ? q.choices
          : Array.isArray(q.answers)
            ? q.answers
            : Array.isArray(q.options)
              ? q.options
              : undefined,
      subject: q.subject != null ? String(q.subject) : undefined,
      topic: q.topic != null ? String(q.topic) : undefined,
      operation:
        q.operation != null
          ? String(q.operation)
          : q.topic != null
            ? String(q.topic)
            : undefined,
      skillKey: q.skillKey != null ? String(q.skillKey) : q.skill_key != null ? String(q.skill_key) : undefined,
      shape: q.shape != null ? String(q.shape) : undefined,
    };
    const gradeLevel = resolveCanonicalGradeKey(q.grade || q.gradeLevel);
    if (gradeLevel) {
      out.grade = gradeLevel;
      out.gradeLevel = gradeLevel;
    }
    if (q.difficulty != null) out.difficulty = String(q.difficulty);
    if (q.qk != null) out.qk = String(q.qk);
    if (!isQuiz) {
      if (q.hint != null) out.hint = String(q.hint);
    }
    if (!hideExplanation) {
      if (q.explanation != null) out.explanation = String(q.explanation);
    }
    return out;
  });
}

/**
 * Whether student may receive correct_answer in answer response for this mode.
 * @param {string} mode
 * @param {{ submitted?: boolean }} [opts]
 */
export function shouldRevealCorrectAnswerToStudent(_mode, _opts = {}) {
  return false;
}

import {
  activityModeLabelHe,
  activityStatusLabelHe,
  studentActivityStatusLabelHe,
} from "../platform-ui/hebrew-display-labels.js";

export { activityModeLabelHe, activityStatusLabelHe, studentActivityStatusLabelHe };

/**
 * Map DB row to API shape for teacher list/detail.
 * @param {Record<string, unknown>} row
 */
export function mapActivityRow(row) {
  return {
    activityId: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    title: row.title,
    subject: row.subject,
    topic: row.topic,
    subtopic: row.subtopic ?? null,
    skillKey: row.skill_key ?? null,
    difficultyLevel: row.difficulty_level ?? null,
    questionCount: row.question_count,
    mode: row.mode,
    questionSelection: row.question_selection,
    timeLimitSeconds: row.time_limit_seconds ?? null,
    dueAt: row.due_at ?? null,
    status: row.status,
    currentQuestionIdx: row.current_question_idx ?? null,
    activatedAt: row.activated_at ?? null,
    pausedAt: row.paused_at ?? null,
    closedAt: row.closed_at ?? null,
    archivedAt: row.archived_at ?? null,
    recipientScope: row.recipient_scope ?? null,
    assignedStudentIds: Array.isArray(row.assigned_student_ids)
      ? row.assigned_student_ids
      : null,
    snapshotStatus: row.snapshot_status ?? "legacy_missing",
    snapshotFrozenAt: row.snapshot_frozen_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const RECIPIENT_SCOPES = new Set(["whole_class", "selected_students"]);

/**
 * @param {unknown} value
 */
export function normalizeRecipientScope(value) {
  const key = String(value || "whole_class").trim();
  return RECIPIENT_SCOPES.has(key) ? key : null;
}

/**
 * Mirrors classroom_activities_discussion_recipients_check (migration 037).
 * @param {{ mode: string, recipientScope?: string|null, assignedStudentIds?: string[]|null }} row
 */
export function classroomActivityRecipientsSatisfyDbCheck(row) {
  const scope = row.recipientScope ?? null;
  const ids = row.assignedStudentIds ?? null;

  if (scope === null && ids === null) {
    return true;
  }

  if (scope === "whole_class") {
    return ids === null || (Array.isArray(ids) && ids.length === 0);
  }

  if (scope === "selected_students") {
    return Array.isArray(ids) && ids.length > 0;
  }

  return false;
}
