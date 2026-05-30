import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { buildStudentActivityResumePayload } from "./student-activity-resume.shared.js";

/** @type {Record<'class'|'student'|'parent', string>} */
const ATTEMPT_TABLE_BY_SCOPE = {
  class: "classroom_activity_attempts",
  student: "student_activity_attempts",
  parent: "parent_activity_attempts",
};

/**
 * @param {'class'|'student'|'parent'} scope
 */
export function studentActivityAttemptTableForScope(scope) {
  return ATTEMPT_TABLE_BY_SCOPE[scope] || null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {'class'|'student'|'parent'} scope
 * @param {string} activityId
 * @param {string} studentId
 * @param {number} questionCount
 */
export async function loadStudentActivityResumePayload(
  serviceRole,
  scope,
  activityId,
  studentId,
  questionCount
) {
  const table = studentActivityAttemptTableForScope(scope);
  if (!table) {
    return buildStudentActivityResumePayload([], questionCount);
  }

  const { data, error } = await serviceRole
    .from(table)
    .select("question_index, selected_answer, is_correct")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .order("question_index", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      throw Object.assign(new Error("db_schema_not_ready"), { code: "db_schema_not_ready" });
    }
    throw error;
  }

  return buildStudentActivityResumePayload(data, questionCount);
}

/**
 * Reject duplicate answers — prevents refresh/reopen exploit.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {'class'|'student'|'parent'} scope
 * @param {string} activityId
 * @param {string} studentId
 * @param {number} questionIndex
 */
export async function assertStudentActivityQuestionNotAlreadyAnswered(
  serviceRole,
  scope,
  activityId,
  studentId,
  questionIndex
) {
  const table = studentActivityAttemptTableForScope(scope);
  if (!table) {
    return { ok: true };
  }

  const { data: existingAttempt, error } = await serviceRole
    .from(table)
    .select("id, selected_answer")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .eq("question_index", questionIndex)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (existingAttempt && existingAttempt.selected_answer != null) {
    return { ok: false, status: 409, code: "question_already_answered" };
  }

  return { ok: true };
}
