import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import { stripQuestionSetForStudent } from "./classroom-activities-shared.server.js";
import {
  buildAssignedActivityPlayLevelFields,
  enrichActivityQuestionLevelFieldsForPlay,
} from "../learning/activity-display-level.js";
import { hydrateAssignedActivityMathMcqQuestion } from "./assigned-activity-math-mcq-hydrate.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function loadStudentGradeLevelFallback(serviceRole, studentId) {
  if (!studentId) return null;

  const { data, error } = await serviceRole
    .from("students")
    .select("grade_level")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data.grade_level ?? null;
}

/**
 * @param {unknown} rawQuestionSet
 * @param {Record<string, unknown>|null|undefined} activityRow
 * @param {string|null|undefined} [studentGradeFallback]
 */
export function inferAssignedActivityGradeKey(rawQuestionSet, activityRow, studentGradeFallback) {
  const arr = Array.isArray(rawQuestionSet) ? rawQuestionSet : [];
  for (const q of arr) {
    const fromQuestion = resolveCanonicalGradeKey(
      q && typeof q === "object" ? q.grade || q.gradeLevel : null
    );
    if (fromQuestion) return fromQuestion;
  }

  const fromActivity = resolveCanonicalGradeKey(
    activityRow?.grade_level || activityRow?.gradeLevel || activityRow?.grade
  );
  if (fromActivity) return fromActivity;

  return resolveCanonicalGradeKey(studentGradeFallback) || null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {unknown} rawQuestionSet
 * @param {string|null|undefined} scope
 * @param {string|null|undefined} [studentGradeFallback]
 */
export function buildAssignedActivityStudentMeta(row, rawQuestionSet, scope, studentGradeFallback) {
  const subject = row.subject != null ? String(row.subject) : null;
  const levelFields = buildAssignedActivityPlayLevelFields(row, subject);

  return {
    activityId: row.id,
    scope,
    title: row.title,
    mode: row.mode,
    subject,
    topic: row.topic != null ? String(row.topic) : null,
    subtopic: row.subtopic != null ? String(row.subtopic) : null,
    skillKey: row.skill_key ?? row.skillKey ?? null,
    difficultyLevel: levelFields.difficultyLevel ?? row.difficulty_level ?? row.difficultyLevel ?? null,
    displayLevel: levelFields.displayLevel,
    sourceDifficulty: levelFields.sourceDifficulty ?? null,
    regularInternalState: levelFields.regularInternalState ?? null,
    scienceInternalState: levelFields.scienceInternalState ?? null,
    gradeLevel: inferAssignedActivityGradeKey(rawQuestionSet, row, studentGradeFallback),
    questionCount: row.question_count,
    timeLimitSeconds: row.time_limit_seconds ?? null,
    activityStatus: row.status,
    currentQuestionIdx: row.current_question_idx ?? null,
    dueAt: row.due_at ?? null,
    answerRequired: row.answer_required !== false,
  };
}

/**
 * Restore play metadata stripped for students (grade/difficulty/qk — not scoring secrets).
 *
 * @param {unknown[]} strippedSet
 * @param {unknown[]} rawQuestionSet
 * @param {ReturnType<typeof buildAssignedActivityStudentMeta>} activityMeta
 */
export function enrichAssignedActivityQuestionSetForStudent(
  strippedSet,
  rawQuestionSet,
  activityMeta
) {
  if (!Array.isArray(strippedSet)) return [];
  const raw = Array.isArray(rawQuestionSet) ? rawQuestionSet : [];
  const gradeFallback = activityMeta?.gradeLevel || null;
  const diffFallback = activityMeta?.difficultyLevel || null;
  const activityLevelCtx = {
    subject: activityMeta?.subject ?? null,
    difficultyLevel: diffFallback,
  };

  return strippedSet.map((item, index) => {
    const q = item && typeof item === "object" && !Array.isArray(item) ? { ...item } : { index };
    const rawQ =
      raw[index] && typeof raw[index] === "object" && !Array.isArray(raw[index]) ? raw[index] : {};

    const gradeLevel =
      resolveCanonicalGradeKey(q.grade || q.gradeLevel) ||
      resolveCanonicalGradeKey(rawQ.grade || rawQ.gradeLevel) ||
      gradeFallback ||
      null;

    const difficulty =
      (q.difficulty != null ? String(q.difficulty) : null) ||
      (rawQ.difficulty != null ? String(rawQ.difficulty) : null) ||
      (diffFallback != null ? String(diffFallback) : null) ||
      null;

    const qk =
      (q.qk != null ? String(q.qk) : null) ||
      (rawQ.qk != null ? String(rawQ.qk) : null) ||
      null;

    if (gradeLevel) {
      q.gradeLevel = gradeLevel;
      q.grade = gradeLevel;
    }
    if (difficulty) q.difficulty = difficulty;
    if (qk) q.qk = qk;

    const displayLevel =
      (q.displayLevel != null ? String(q.displayLevel) : null) ||
      (q.display_level != null ? String(q.display_level) : null) ||
      (rawQ.displayLevel != null ? String(rawQ.displayLevel) : null) ||
      (rawQ.display_level != null ? String(rawQ.display_level) : null) ||
      null;
    if (displayLevel) q.displayLevel = displayLevel;

    const sourceDifficulty =
      (q.sourceDifficulty != null ? String(q.sourceDifficulty) : null) ||
      (q.source_difficulty != null ? String(q.source_difficulty) : null) ||
      (rawQ.sourceDifficulty != null ? String(rawQ.sourceDifficulty) : null) ||
      (rawQ.source_difficulty != null ? String(rawQ.source_difficulty) : null) ||
      null;
    if (sourceDifficulty) q.sourceDifficulty = sourceDifficulty;

    return hydrateAssignedActivityMathMcqQuestion(
      enrichActivityQuestionLevelFieldsForPlay(q, rawQ, activityLevelCtx),
      {
        correctAnswer: rawQ.correct_answer ?? rawQ.correctAnswer ?? null,
      }
    );
  });
}

/**
 * Strip scoring secrets and restore play metadata (grade/difficulty/qk) for student UI.
 *
 * @param {Record<string, unknown>} row
 * @param {unknown} rawQuestionSet
 * @param {string} scope
 * @param {string|null|undefined} studentGradeFallback
 */
export function prepareAssignedActivityStudentPlayData(
  row,
  rawQuestionSet,
  scope,
  studentGradeFallback
) {
  const raw = Array.isArray(rawQuestionSet) ? rawQuestionSet : [];
  const activity = buildAssignedActivityStudentMeta(row, raw, scope, studentGradeFallback);
  const stripped = stripQuestionSetForStudent(raw, row.mode, {
    hideExplanation: scope === "parent",
  });
  const questionSet = enrichAssignedActivityQuestionSetForStudent(stripped, raw, activity);
  return { activity, questionSet };
}
