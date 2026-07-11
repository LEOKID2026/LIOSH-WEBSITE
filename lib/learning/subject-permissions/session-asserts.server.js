import { resolvePermissionSubjectKey } from "./subject-key-map.js";
import {
  assertStudentCanAccessSubject,
  assertStudentGradePickerAllowed,
} from "./subject-access.server.js";

/**
 * Combined subject + grade asserts for learning write APIs.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   studentRow?: Record<string, unknown>|null,
 *   subject: string,
 *   visualStrand?: string|null,
 *   requestedGrade?: string|null,
 *   activityContext?: { assignedGrade: string }|null,
 * }} params
 */
export async function assertLearningSubjectSessionAllowed(supabase, params) {
  const permissionKey = resolvePermissionSubjectKey({
    subject: params.subject,
    visualStrand: params.visualStrand,
  });

  const subjectGate = await assertStudentCanAccessSubject(supabase, {
    studentId: params.studentId,
    studentRow: params.studentRow,
    subject: params.subject,
    visualStrand: params.visualStrand,
    permissionKey,
  });
  if (!subjectGate.ok) return subjectGate;

  if (!permissionKey || subjectGate.skipped) return { ok: true, permissionKey };

  const gradeGate = await assertStudentGradePickerAllowed(supabase, {
    studentId: params.studentId,
    studentRow: params.studentRow,
    subjectKey: permissionKey,
    requestedGrade: params.requestedGrade,
    activityContext: params.activityContext,
  });
  if (!gradeGate.ok) return gradeGate;

  return { ok: true, permissionKey, effectiveGrade: gradeGate.effectiveGrade };
}
