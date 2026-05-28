import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadTeacherSchoolMembership } from "../school-server/school-membership.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function listPrivateTeacherSubjects(serviceRole, teacherId) {
  if (!isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }
  if (membershipResult.membership) {
    return { ok: false, status: 400, code: "not_private_teacher" };
  }

  const { data, error } = await serviceRole
    .from("private_teacher_subjects")
    .select("id, teacher_id, subject, granted_by, created_at")
    .eq("teacher_id", teacherId)
    .order("subject", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    subjects: (data || []).map((row) => ({
      id: row.id,
      subject: row.subject,
      grantedBy: row.granted_by,
      createdAt: row.created_at,
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ teacherId: string, subject: string, grantedBy: string }} input
 */
export async function grantPrivateTeacherSubject(serviceRole, input) {
  const teacherId = String(input.teacherId || "").trim();
  if (!isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed", field: "teacherId" };
  }

  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }
  if (membershipResult.membership) {
    return { ok: false, status: 400, code: "not_private_teacher" };
  }

  const subject = typeof input.subject === "string" ? input.subject.trim().toLowerCase() : "";
  if (!subject || !LEARNING_SUBJECT_ALLOWLIST.has(subject)) {
    return { ok: false, status: 400, code: "validation_failed", field: "subject" };
  }

  const { data, error } = await serviceRole
    .from("private_teacher_subjects")
    .insert({
      teacher_id: teacherId,
      subject,
      granted_by: input.grantedBy,
    })
    .select("id, subject, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 409, code: "subject_already_granted" };
    }
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, row: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} grantId
 */
export async function revokePrivateTeacherSubject(serviceRole, teacherId, grantId) {
  if (!isUuid(teacherId) || !isUuid(grantId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: row, error: fetchErr } = await serviceRole
    .from("private_teacher_subjects")
    .select("id, teacher_id, subject")
    .eq("id", grantId)
    .maybeSingle();

  if (fetchErr) {
    if (isDbSchemaNotReadyError(fetchErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!row || row.teacher_id !== teacherId) {
    return { ok: false, status: 404, code: "grant_not_found" };
  }

  const { error } = await serviceRole.from("private_teacher_subjects").delete().eq("id", grantId);
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, row };
}
