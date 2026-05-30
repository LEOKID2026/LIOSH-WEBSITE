import { safeApiLog } from "../security/safe-log.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

const DENY_METADATA_KEYS = new Set([
  "pin",
  "pin_plain",
  "pin_hash",
  "token",
  "token_plain",
  "password",
  "email",
  "full_name",
  "ip",
  "ip_address",
]);

/**
 * @param {object|null|undefined} metadata
 */
export function sanitizeStaffAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (DENY_METADATA_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string;
 *   action: string;
 *   actorUserId?: string|null;
 *   targetUserId?: string|null;
 *   metadata?: object|null;
 *   ipHash?: string|null;
 *   userAgent?: string|null;
 * }} input
 */
export async function writeSchoolStaffAuditRow(serviceRole, input) {
  const { error } = await serviceRole.from("school_staff_audit_log").insert({
    school_id: input.schoolId,
    actor_user_id: input.actorUserId || null,
    target_user_id: input.targetUserId || null,
    action: input.action,
    metadata: sanitizeStaffAuditMetadata(input.metadata),
    ip_hash: input.ipHash || null,
    user_agent: input.userAgent || null,
  });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    safeApiLog("school_staff_audit_insert_failed", { action: input.action });
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ userId: string; schoolId?: string|null }} input
 */
export async function logStaffProvisionOrphan(serviceRole, input) {
  return writeSchoolStaffAuditRow(serviceRole, {
    schoolId: input.schoolId || "00000000-0000-0000-0000-000000000000",
    action: "staff_provision_orphan",
    actorUserId: null,
    targetUserId: input.userId,
    metadata: { orphan_user_id: input.userId },
  });
}
