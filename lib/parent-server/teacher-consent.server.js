import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import {
  TEACHER_CONSENT_PURPOSE,
  TEACHER_CONSENT_TTL_MS,
  generateTeacherConsentPlaintext,
  hashTeacherConsentToken,
} from "../teacher-server/teacher-consent.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 * @param {string} studentId
 */
export async function assertParentOwnsStudent(serviceRole, parentUserId, studentId) {
  const { data, error } = await serviceRole
    .from("students")
    .select("id, parent_id")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data || data.parent_id !== parentUserId) {
    return { ok: false, status: 403, code: "not_authorized" };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function assertTeacherProfileExists(serviceRole, teacherId) {
  const { data, error } = await serviceRole
    .from("teacher_profiles")
    .select("id, is_active, archived_at")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data || !data.is_active || data.archived_at != null) {
    return { ok: false, status: 404, code: "teacher_not_found" };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ parentUserId: string, teacherId: string, studentId: string }} input
 */
export async function issueTeacherStudentConsentToken(serviceRole, input) {
  const { parentUserId, teacherId, studentId } = input;

  const owns = await assertParentOwnsStudent(serviceRole, parentUserId, studentId);
  if (!owns.ok) return owns;

  const teacherOk = await assertTeacherProfileExists(serviceRole, teacherId);
  if (!teacherOk.ok) return teacherOk;

  const plaintext = generateTeacherConsentPlaintext();
  const tokenHash = hashTeacherConsentToken(plaintext);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + TEACHER_CONSENT_TTL_MS);

  const { data, error } = await serviceRole
    .from("teacher_student_consent_tokens")
    .insert({
      token_hash: tokenHash,
      teacher_id: teacherId,
      student_id: studentId,
      issued_by_parent_id: parentUserId,
      purpose: TEACHER_CONSENT_PURPOSE,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, expires_at")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    consentTokenId: data.id,
    consentTokenPlaintext: plaintext,
    expiresAt: data.expires_at,
    teacherId,
    studentId,
  };
}

/**
 * Revoke unconsumed tokens for a parent/teacher/student scope.
 */
export async function revokeTeacherStudentConsentTokens(serviceRole, input) {
  const { parentUserId, teacherId, studentId } = input;
  const owns = await assertParentOwnsStudent(serviceRole, parentUserId, studentId);
  if (!owns.ok) return owns;

  const now = new Date().toISOString();
  const { data, error } = await serviceRole
    .from("teacher_student_consent_tokens")
    .update({ consumed_at: now })
    .eq("issued_by_parent_id", parentUserId)
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("purpose", TEACHER_CONSENT_PURPOSE)
    .is("consumed_at", null)
    .select("id");

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, revokedCount: (data || []).length };
}

export function getParentConsentServiceRole() {
  return getLearningSupabaseServiceRoleClient();
}

export function parseParentConsentIssueBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const teacherId = raw.teacherId;
  const studentId = raw.studentId;
  if (!isUuid(teacherId) || !isUuid(studentId)) {
    return { ok: false, code: "validation_failed" };
  }
  return { ok: true, teacherId: teacherId.trim(), studentId: studentId.trim() };
}
