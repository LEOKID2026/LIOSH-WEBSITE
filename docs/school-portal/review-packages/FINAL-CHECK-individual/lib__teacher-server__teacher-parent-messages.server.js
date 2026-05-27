import { resolveTeacherParentMessageSchoolId } from "../school-server/resolve-teacher-parent-message-school-id.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { teacherHasReportAccessToStudent } from "./teacher-report.server.js";

const MAX_MESSAGE_LEN = 2000;
const DEFAULT_PARENT_VISIBLE_LIMIT = 10;

function normalizeMessage(raw) {
  const text = String(raw || "").trim();
  if (!text) return { ok: false, code: "validation_failed" };
  if (text.length > MAX_MESSAGE_LEN) return { ok: false, code: "message_too_long" };
  return { ok: true, message: text };
}

function mapRow(row) {
  return {
    id: row.id,
    message: row.message,
    createdAt: row.created_at,
    isHidden: row.is_hidden === true,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {{ limit?: number, includeHidden?: boolean, teacherId?: string }} [opts]
 */
export async function listTeacherParentMessages(serviceRole, studentId, opts = {}) {
  const limit = Math.max(1, Math.min(50, Number(opts.limit) || DEFAULT_PARENT_VISIBLE_LIMIT));
  let query = serviceRole
    .from("teacher_parent_messages")
    .select("id, message, is_hidden, created_at, teacher_id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.teacherId) query = query.eq("teacher_id", opts.teacherId);
  if (!opts.includeHidden) query = query.eq("is_hidden", false);

  const { data, error } = await query;
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: true, messages: [], schemaMissing: true };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true, messages: (data || []).map(mapRow) };
}

/**
 * Visible messages for parent/guardian report surfaces.
 */
export async function listVisibleParentMessagesForReport(serviceRole, studentId, limit = 10) {
  return listTeacherParentMessages(serviceRole, studentId, { limit, includeHidden: false });
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   message: string,
 * }} input
 */
export async function createTeacherParentMessage(input) {
  const { serviceRole, teacherId, studentId } = input;
  const parsed = normalizeMessage(input.message);
  if (!parsed.ok) return { ok: false, status: 400, code: parsed.code };

  const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
  if (!access.ok) return access;
  if (!access.allowed) {
    return { ok: false, status: 403, code: "student_not_linked" };
  }

  const schoolId = await resolveTeacherParentMessageSchoolId(serviceRole, teacherId, studentId);

  const now = new Date().toISOString();
  const insertRow = {
    teacher_id: teacherId,
    student_id: studentId,
    message: parsed.message,
    is_hidden: false,
    created_at: now,
    updated_at: now,
  };
  if (schoolId) {
    insertRow.school_id = schoolId;
  }

  const { data, error } = await serviceRole
    .from("teacher_parent_messages")
    .insert(insertRow)
    .select("id, message, is_hidden, created_at")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, data: mapRow(data) };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   messageId: string,
 * }} input
 */
export async function hideTeacherParentMessage(input) {
  const { serviceRole, teacherId, studentId, messageId } = input;

  const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
  if (!access.ok) return access;
  if (!access.allowed) {
    return { ok: false, status: 403, code: "student_not_linked" };
  }

  const { data: row, error: fetchErr } = await serviceRole
    .from("teacher_parent_messages")
    .select("id, teacher_id, student_id, is_hidden")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchErr) {
    if (isDbSchemaNotReadyError(fetchErr)) {
      return { ok: false, status: 503, code: "schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!row?.id || row.teacher_id !== teacherId || row.student_id !== studentId) {
    return { ok: false, status: 404, code: "message_not_found" };
  }
  if (row.is_hidden) {
    return { ok: true, data: { id: row.id, isHidden: true } };
  }

  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("teacher_parent_messages")
    .update({ is_hidden: true, updated_at: now })
    .eq("id", messageId)
    .eq("teacher_id", teacherId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, data: { id: messageId, isHidden: true } };
}

export function parseParentMessageBody(body) {
  const message = body && typeof body === "object" ? body.message : "";
  return normalizeMessage(message);
}
