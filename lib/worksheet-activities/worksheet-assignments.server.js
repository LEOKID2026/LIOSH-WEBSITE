import { isUuid } from "../teacher-server/teacher-request.server.js";
import { hasActiveTeacherStudentLink } from "../teacher-server/teacher-students.server.js";
import { worksheetDbError } from "./worksheet-shared.server.js";

/**
 * @param {unknown} raw
 * @returns {string[]|null}
 */
export function parseStudentIdsArray(raw) {
  if (!Array.isArray(raw)) return null;
  const ids = raw.map((v) => String(v || "").trim()).filter(Boolean);
  if (!ids.length || ids.length > 100) return null;
  if (!ids.every((id) => isUuid(id))) return null;
  return [...new Set(ids)];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string[]} studentIds
 */
export async function validateTeacherStudentLinks(serviceRole, teacherId, studentIds) {
  const parsed = parseStudentIdsArray(studentIds);
  if (!parsed) return { ok: false, status: 400, code: "validation_failed" };

  for (const studentId of parsed) {
    const link = await hasActiveTeacherStudentLink(serviceRole, teacherId, studentId);
    if (!link.ok) return link;
    if (!link.linked) {
      return { ok: false, status: 403, code: "forbidden" };
    }
  }

  return { ok: true, studentIds: parsed };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} worksheetId
 * @param {string[]} studentIds
 */
export async function createDirectAssignments(serviceRole, worksheetId, studentIds) {
  if (!studentIds.length) return { ok: true };

  const rows = studentIds.map((studentId) => ({
    worksheet_activity_id: worksheetId,
    student_id: studentId,
  }));

  const { error } = await serviceRole.from("worksheet_student_assignments").insert(rows);
  if (error) return worksheetDbError(error);
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} worksheetId
 */
export async function ensureStudentStatusRowsForAssignments(serviceRole, worksheetId) {
  const { data, error } = await serviceRole
    .from("worksheet_student_assignments")
    .select("student_id")
    .eq("worksheet_activity_id", worksheetId);

  if (error) return worksheetDbError(error);

  const rows = (data || []).map((r) => ({
    worksheet_activity_id: worksheetId,
    student_id: r.student_id,
    grading_status: "not_submitted",
  }));

  if (!rows.length) return { ok: true };

  const { error: upsertError } = await serviceRole.from("worksheet_student_status").upsert(rows, {
    onConflict: "worksheet_activity_id,student_id",
    ignoreDuplicates: true,
  });

  if (upsertError) return worksheetDbError(upsertError);
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function loadStudentWorksheetAssignmentIds(serviceRole, studentId) {
  const { data, error } = await serviceRole
    .from("worksheet_student_assignments")
    .select("worksheet_activity_id")
    .eq("student_id", studentId);

  if (error) return worksheetDbError(error);
  return {
    ok: true,
    worksheetIds: [...new Set((data || []).map((r) => r.worksheet_activity_id))],
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} worksheetId
 */
export async function studentHasWorksheetAssignment(serviceRole, studentId, worksheetId) {
  const { data, error } = await serviceRole
    .from("worksheet_student_assignments")
    .select("id")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) return worksheetDbError(error);
  return { ok: true, assigned: Boolean(data?.id) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {string[]} studentIds
 */
export async function addAssignmentsToWorksheet(serviceRole, teacherId, worksheetId, studentIds) {
  const validated = await validateTeacherStudentLinks(serviceRole, teacherId, studentIds);
  if (!validated.ok) return validated;

  const { data: existing, error: existingError } = await serviceRole
    .from("worksheet_student_assignments")
    .select("student_id")
    .eq("worksheet_activity_id", worksheetId);

  if (existingError) return worksheetDbError(existingError);

  const existingSet = new Set((existing || []).map((r) => r.student_id));
  const toAdd = validated.studentIds.filter((id) => !existingSet.has(id));
  if (!toAdd.length) return { ok: true, added: 0 };

  const created = await createDirectAssignments(serviceRole, worksheetId, toAdd);
  if (!created.ok) return created;

  const { data: worksheet } = await serviceRole
    .from("worksheet_activities")
    .select("status")
    .eq("id", worksheetId)
    .maybeSingle();

  if (worksheet?.status === "active") {
    const rows = toAdd.map((studentId) => ({
      worksheet_activity_id: worksheetId,
      student_id: studentId,
      grading_status: "not_submitted",
    }));
    await serviceRole.from("worksheet_student_status").upsert(rows, {
      onConflict: "worksheet_activity_id,student_id",
      ignoreDuplicates: true,
    });
  }

  return { ok: true, added: toAdd.length };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} worksheetId
 * @param {string} studentId
 */
export async function removeAssignmentFromWorksheet(serviceRole, worksheetId, studentId) {
  if (!isUuid(studentId)) return { ok: false, status: 400, code: "validation_failed" };

  const { error } = await serviceRole
    .from("worksheet_student_assignments")
    .delete()
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId);

  if (error) return worksheetDbError(error);
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} row
 */
export function resolveWorksheetAssignmentScope(row) {
  const scope = String(row?.assignment_scope || "").trim();
  if (scope === "selected_students" || scope === "class") return scope;
  return row?.class_id ? "class" : "selected_students";
}
