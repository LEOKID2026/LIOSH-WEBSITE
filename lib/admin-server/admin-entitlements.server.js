import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
const ENTITLEMENT_STATUSES = new Set(["pending", "active", "suspended", "rejected", "revoked"]);

/**
 * @param {object} row
 */
export function formatAdminEntitlement(row) {
  return {
    entitlementId: row.id,
    userId: row.user_id,
    persona: row.persona,
    status: row.status,
    approvalSource: row.approval_source,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    suspendedBy: row.suspended_by,
    suspendedAt: row.suspended_at,
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function listAdminEntitlementsForUser(serviceRole, userId) {
  if (!isUuid(userId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("account_persona_entitlements")
    .select("*")
    .eq("user_id", userId)
    .order("persona", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, entitlements: (data || []).map(formatAdminEntitlement) };
}

/**
 * @param {unknown} body
 */
export function parseEntitlementStatusPatchBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const status = typeof b.status === "string" ? b.status.trim().toLowerCase() : "";
  if (!ENTITLEMENT_STATUSES.has(status)) {
    return { ok: false, code: "validation_failed", field: "status" };
  }

  let reason = null;
  if (Object.prototype.hasOwnProperty.call(b, "reason")) {
    if (b.reason != null && typeof b.reason !== "string") {
      return { ok: false, code: "validation_failed", field: "reason" };
    }
    reason = b.reason == null ? null : String(b.reason).trim().slice(0, 500) || null;
  }

  return { ok: true, status, reason };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} entitlementId
 * @param {string} adminUserId
 * @param {{ status: string, reason?: string|null }} input
 */
export async function patchAdminEntitlementStatus(serviceRole, entitlementId, adminUserId, input) {
  if (!isUuid(entitlementId) || !isUuid(adminUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: before, error: loadErr } = await serviceRole
    .from("account_persona_entitlements")
    .select("*")
    .eq("id", entitlementId)
    .maybeSingle();

  if (loadErr) {
    if (isDbSchemaNotReadyError(loadErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!before) {
    return { ok: false, status: 404, code: "entitlement_not_found" };
  }

  const now = new Date().toISOString();
  const patch = {
    status: input.status,
    reason: input.reason !== undefined ? input.reason : before.reason,
    updated_at: now,
  };

  if (input.status === "active") {
    patch.approval_source = "admin";
    patch.approved_by = adminUserId;
    patch.approved_at = now;
    patch.rejected_by = null;
    patch.rejected_at = null;
    patch.suspended_by = null;
    patch.suspended_at = null;
    patch.revoked_by = null;
    patch.revoked_at = null;
  } else if (input.status === "suspended") {
    patch.suspended_by = adminUserId;
    patch.suspended_at = now;
  } else if (input.status === "revoked") {
    patch.revoked_by = adminUserId;
    patch.revoked_at = now;
  } else if (input.status === "rejected") {
    patch.rejected_by = adminUserId;
    patch.rejected_at = now;
  }

  const { data: after, error: updErr } = await serviceRole
    .from("account_persona_entitlements")
    .update(patch)
    .eq("id", entitlementId)
    .select("*")
    .single();

  if (updErr) {
    if (isDbSchemaNotReadyError(updErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, before, after };
}
