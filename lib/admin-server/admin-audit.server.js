import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   adminUserId: string,
 *   targetType: string,
 *   targetId: string,
 *   action: string,
 *   beforeState?: object|null,
 *   afterState?: object|null,
 *   notes?: string|null,
 * }} input
 */
export async function writeAdminAuditRow(serviceRole, input) {
  const { error } = await serviceRole.from("admin_audit_log").insert({
    admin_user_id: input.adminUserId,
    target_type: input.targetType,
    target_id: input.targetId,
    action: input.action,
    before_state: input.beforeState ?? null,
    after_state: input.afterState ?? null,
    notes: input.notes ?? null,
  });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ limit?: number }} [opts]
 */
export async function listAdminAuditForTeacher(serviceRole, teacherId, opts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const { data, error } = await serviceRole
    .from("admin_audit_log")
    .select("id, admin_user_id, target_type, target_id, action, before_state, after_state, notes, created_at")
    .eq("target_type", "teacher")
    .eq("target_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, entries: data || [] };
}
