import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { safeApiLog } from "../security/safe-log.js";

/** @type {ReadonlySet<string>} */
export const TEACHER_AUDIT_METADATA_DENY_KEYS = new Set([
  "pin",
  "pin_plain",
  "token",
  "token_plain",
  "magic_link",
  "magic_link_plain",
  "password",
  "email",
  "email_plain",
  "parent_email",
  "guardian_email",
  "full_name",
  "parent_name",
  "student_full_name",
  "ip",
  "ip_address",
]);

/**
 * @param {Record<string, unknown>|null|undefined} metadata
 * @returns {{ ok: true, metadata: Record<string, unknown> } | { ok: false, deniedKey: string }}
 */
export function sanitizeTeacherAuditMetadata(metadata) {
  const input = metadata && typeof metadata === "object" ? metadata : {};
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const normalized = String(key).trim().toLowerCase();
    if (TEACHER_AUDIT_METADATA_DENY_KEYS.has(normalized)) {
      return { ok: false, deniedKey: key };
    }
    out[key] = value;
  }
  return { ok: true, metadata: out };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} [serviceRole]
 */
export function getTeacherAuditServiceRole(serviceRole) {
  return serviceRole || getLearningSupabaseServiceRoleClient();
}

/**
 * Best-effort audit insert; never throws. Returns false when table missing or metadata rejected.
 * @param {{
 *   serviceRole?: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId?: string|null,
 *   studentId?: string|null,
 *   guardianAccessId?: string|null,
 *   action: string,
 *   actorRole: 'teacher'|'guardian'|'system',
 *   actorId?: string|null,
 *   metadata?: Record<string, unknown>,
 *   ipHash?: string|null,
 *   userAgent?: string|null,
 * }} params
 */
export async function writeTeacherAuditRow(params) {
  const {
    teacherId = null,
    studentId = null,
    guardianAccessId = null,
    action,
    actorRole,
    actorId = null,
    metadata = {},
    ipHash = null,
    userAgent = null,
    serviceRole: injectedRole,
  } = params;

  const sanitized = sanitizeTeacherAuditMetadata(metadata);
  if (!sanitized.ok) {
    safeApiLog("teacher_audit_metadata_denied", { deniedKey: sanitized.deniedKey, action });
    return { ok: false, reason: "metadata_denied" };
  }

  if (actorRole === "teacher" && !actorId) {
    return { ok: false, reason: "actor_id_required" };
  }
  if (actorRole === "guardian" && !actorId) {
    return { ok: false, reason: "actor_id_required" };
  }
  if (actorRole === "system" && actorId != null) {
    return { ok: false, reason: "system_actor_must_be_null" };
  }

  const serviceRole = getTeacherAuditServiceRole(injectedRole);
  const { error } = await serviceRole.from("teacher_access_audit").insert({
    teacher_id: teacherId,
    student_id: studentId,
    guardian_access_id: guardianAccessId,
    action,
    actor_role: actorRole,
    actor_id: actorId,
    metadata: sanitized.metadata,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, reason: "db_schema_not_ready" };
    }
    safeApiLog("teacher_audit_insert_error", { action, code: error.code });
    return { ok: false, reason: "insert_failed" };
  }

  return { ok: true };
}

/**
 * @param {{ code?: string, message?: string }|null|undefined} error
 */
export function isDbSchemaNotReadyError(error) {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST106" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}
