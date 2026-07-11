import { normalizePracticeGradeKey } from "../../learning-supabase/practice-grade-resolution.js";
import { assertLearningSubjectSessionAllowed } from "./session-asserts.server.js";
import { loadParentAssignedActivityContext } from "./subject-access.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   studentRow?: Record<string, unknown>|null,
 *   activityId: string,
 *   requestedGrade?: string|null,
 * }} params
 */
export async function assertStudentActivityAccessAllowed(supabase, params) {
  const activityContext = await loadParentAssignedActivityContext(
    supabase,
    params.activityId,
    params.studentId
  );

  const { data: activity } = await supabase
    .from("parent_assigned_activities")
    .select("id, subject, snapshot_metadata, metadata")
    .eq("id", params.activityId)
    .eq("student_id", params.studentId)
    .maybeSingle();

  const subject = activity?.subject;
  if (!subject) {
    return { ok: true, skipped: true };
  }

  const meta = activity.snapshot_metadata || activity.metadata || {};
  const grade =
    normalizePracticeGradeKey(params.requestedGrade) ||
    normalizePracticeGradeKey(meta.gradeLevel) ||
    normalizePracticeGradeKey(meta.grade_level);

  return assertLearningSubjectSessionAllowed(supabase, {
    studentId: params.studentId,
    studentRow: params.studentRow,
    subject,
    requestedGrade: grade,
    activityContext: activityContext || undefined,
  });
}
