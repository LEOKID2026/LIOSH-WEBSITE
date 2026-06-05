import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import { stripQuestionSetForStudent } from "./classroom-activities-shared.server.js";

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
  return {
    activityId: row.id,
    scope,
    title: row.title,
    mode: row.mode,
    subject: row.subject != null ? String(row.subject) : null,
    topic: row.topic != null ? String(row.topic) : null,
    subtopic: row.subtopic != null ? String(row.subtopic) : null,
    skillKey: row.skill_key ?? row.skillKey ?? null,
    difficultyLevel: row.difficulty_level ?? row.difficultyLevel ?? null,
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

    return q;
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
  const stripped = stripQuestionSetForStudent(raw, row.mode);
  const questionSet = enrichAssignedActivityQuestionSetForStudent(stripped, raw, activity);
  return { activity, questionSet };
}
