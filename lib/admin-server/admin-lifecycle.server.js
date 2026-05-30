import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { sendUserPasswordSetupEmail } from "../auth/auth-password-setup.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadPersonaEntitlement } from "../auth/persona-entitlement.server.js";
import {
  formatAdminEntitlement,
  patchAdminEntitlementStatus,
} from "./admin-entitlements.server.js";
import {
  formatAdminParentSettings,
  getAdminParentSettings,
  patchAdminParentSettings,
} from "./admin-parent-settings.server.js";
import { loadTeacherLimitsRow } from "../teacher-server/teacher-session.server.js";

/** @typedef {'parent'|'private_teacher'|'school_teacher'|'school_manager'|'school_operator'} LifecyclePersona */

export const LIFECYCLE_ACTIONS = new Set(["suspend", "reactivate", "revoke", "reject"]);
export const LIFECYCLE_PERSONAS = new Set([
  "parent",
  "private_teacher",
  "school_teacher",
  "school_manager",
  "school_operator",
]);

/**
 * @param {unknown} body
 */
export function parseAdminLifecycleBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const action = typeof b.action === "string" ? b.action.trim().toLowerCase() : "";
  const persona = typeof b.persona === "string" ? b.persona.trim().toLowerCase() : "";
  if (!LIFECYCLE_ACTIONS.has(action)) {
    return { ok: false, code: "validation_failed", field: "action" };
  }
  if (!LIFECYCLE_PERSONAS.has(persona)) {
    return { ok: false, code: "validation_failed", field: "persona" };
  }
  let reason = null;
  if (Object.prototype.hasOwnProperty.call(b, "reason")) {
    if (b.reason != null && typeof b.reason !== "string") {
      return { ok: false, code: "validation_failed", field: "reason" };
    }
    reason = b.reason == null ? null : String(b.reason).trim().slice(0, 500) || null;
  }
  return { ok: true, action, persona, reason };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 * @param {LifecyclePersona} persona
 */
export async function getUserPersonaEntitlementRecord(serviceRole, userId, persona) {
  const loaded = await loadPersonaEntitlement(serviceRole, userId, persona);
  if (!loaded.ok) return loaded;
  if (!loaded.entitlement?.id) {
    return { ok: false, status: 404, code: "entitlement_not_found" };
  }
  return { ok: true, entitlement: loaded.entitlement };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} entitlementId
 * @param {string} adminUserId
 * @param {string} status
 * @param {string|null} [reason]
 */
async function patchEntitlementStatus(serviceRole, entitlementId, adminUserId, status, reason) {
  return patchAdminEntitlementStatus(serviceRole, entitlementId, adminUserId, { status, reason });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherUserId
 * @param {boolean} isAccountActive
 */
async function patchPrivateTeacherAccountActive(serviceRole, teacherUserId, isAccountActive) {
  const limits = await loadTeacherLimitsRow(serviceRole, teacherUserId);
  if (!limits.ok) return limits;
  if (!limits.limits) {
    return { ok: false, status: 404, code: "teacher_limits_missing" };
  }

  const { error } = await serviceRole
    .from("teacher_limits")
    .update({ is_account_active: isAccountActive, updated_at: new Date().toISOString() })
    .eq("teacher_id", teacherUserId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, isAccountActive };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} adminUserId
 * @param {string} userId
 * @param {'suspend'|'reactivate'|'revoke'|'reject'} action
 * @param {string|null} [reason]
 */
export async function applyAdminParentLifecycle(serviceRole, adminUserId, userId, action, reason) {
  const entResult = await getUserPersonaEntitlementRecord(serviceRole, userId, "parent");
  if (!entResult.ok) return entResult;

  if (action === "suspend") {
    const entPatch = await patchEntitlementStatus(
      serviceRole,
      entResult.entitlement.id,
      adminUserId,
      "suspended",
      reason
    );
    if (!entPatch.ok) return entPatch;

    const settingsPatch = await patchAdminParentSettings(serviceRole, userId, {
      account_status: "suspended",
    });
    if (!settingsPatch.ok) return settingsPatch;

    return {
      ok: true,
      entitlement: formatAdminEntitlement(entPatch.after),
      settings: settingsPatch.settings,
    };
  }

  if (action === "reactivate") {
    const entPatch = await patchEntitlementStatus(
      serviceRole,
      entResult.entitlement.id,
      adminUserId,
      "active",
      reason
    );
    if (!entPatch.ok) return entPatch;

    const settingsPatch = await patchAdminParentSettings(serviceRole, userId, {
      account_status: "active",
    });
    if (!settingsPatch.ok) return settingsPatch;

    return {
      ok: true,
      entitlement: formatAdminEntitlement(entPatch.after),
      settings: settingsPatch.settings,
    };
  }

  if (action === "reject") {
    const entPatch = await patchEntitlementStatus(
      serviceRole,
      entResult.entitlement.id,
      adminUserId,
      "rejected",
      reason
    );
    if (!entPatch.ok) return entPatch;

    return {
      ok: true,
      entitlement: formatAdminEntitlement(entPatch.after),
      settings: null,
    };
  }

  const entPatch = await patchEntitlementStatus(
    serviceRole,
    entResult.entitlement.id,
    adminUserId,
    "revoked",
    reason
  );
  if (!entPatch.ok) return entPatch;

  const settingsPatch = await patchAdminParentSettings(serviceRole, userId, {
    account_status: "cancelled",
  });
  if (!settingsPatch.ok) return settingsPatch;

  return {
    ok: true,
    entitlement: formatAdminEntitlement(entPatch.after),
    settings: settingsPatch.settings,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} adminUserId
 * @param {string} userId
 * @param {'suspend'|'reactivate'|'revoke'|'reject'} action
 * @param {string|null} [reason]
 */
export async function applyAdminPrivateTeacherLifecycle(serviceRole, adminUserId, userId, action, reason) {
  const entResult = await getUserPersonaEntitlementRecord(serviceRole, userId, "private_teacher");
  if (!entResult.ok) return entResult;

  if (action === "suspend") {
    const entPatch = await patchEntitlementStatus(
      serviceRole,
      entResult.entitlement.id,
      adminUserId,
      "suspended",
      reason
    );
    if (!entPatch.ok) return entPatch;

    const accountPatch = await patchPrivateTeacherAccountActive(serviceRole, userId, false);
    if (!accountPatch.ok) return accountPatch;

    return { ok: true, entitlement: formatAdminEntitlement(entPatch.after), isAccountActive: false };
  }

  if (action === "reactivate") {
    const wasPending = entResult.entitlement.status === "pending";
    const entPatch = await patchEntitlementStatus(
      serviceRole,
      entResult.entitlement.id,
      adminUserId,
      "active",
      reason
    );
    if (!entPatch.ok) return entPatch;

    const accountPatch = await patchPrivateTeacherAccountActive(serviceRole, userId, true);
    if (!accountPatch.ok) return accountPatch;

    await serviceRole
      .from("teacher_registration_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    let passwordSetup = null;
    if (wasPending) {
      passwordSetup = await sendUserPasswordSetupEmail(serviceRole, userId, { portal: "teacher" });
    }

    return {
      ok: true,
      entitlement: formatAdminEntitlement(entPatch.after),
      isAccountActive: true,
      passwordSetup,
    };
  }

  if (action === "reject") {
    const entPatch = await patchEntitlementStatus(
      serviceRole,
      entResult.entitlement.id,
      adminUserId,
      "rejected",
      reason
    );
    if (!entPatch.ok) return entPatch;

    const accountPatch = await patchPrivateTeacherAccountActive(serviceRole, userId, false);
    if (!accountPatch.ok) return accountPatch;

    await serviceRole
      .from("teacher_registration_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { ok: true, entitlement: formatAdminEntitlement(entPatch.after), isAccountActive: false };
  }

  const entPatch = await patchEntitlementStatus(
    serviceRole,
    entResult.entitlement.id,
    adminUserId,
    "revoked",
    reason
  );
  if (!entPatch.ok) return entPatch;

  const accountPatch = await patchPrivateTeacherAccountActive(serviceRole, userId, false);
  if (!accountPatch.ok) return accountPatch;

  return { ok: true, entitlement: formatAdminEntitlement(entPatch.after), isAccountActive: false };
}

/**
 * School staff personas — entitlement-only lifecycle (no hard delete).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} adminUserId
 * @param {string} userId
 * @param {'school_teacher'|'school_manager'|'school_operator'} persona
 * @param {'suspend'|'reactivate'|'revoke'|'reject'} action
 * @param {string|null} [reason]
 */
export async function applyAdminSchoolStaffLifecycle(
  serviceRole,
  adminUserId,
  userId,
  persona,
  action,
  reason
) {
  const entResult = await getUserPersonaEntitlementRecord(serviceRole, userId, persona);
  if (!entResult.ok) return entResult;

  const status =
    action === "suspend"
      ? "suspended"
      : action === "reactivate"
        ? "active"
        : action === "reject"
          ? "rejected"
          : "revoked";
  const entPatch = await patchEntitlementStatus(
    serviceRole,
    entResult.entitlement.id,
    adminUserId,
    status,
    reason
  );
  if (!entPatch.ok) return entPatch;

  return { ok: true, entitlement: formatAdminEntitlement(entPatch.after) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} adminUserId
 * @param {string} userId
 * @param {LifecyclePersona} persona
 * @param {'suspend'|'reactivate'|'revoke'|'reject'} action
 * @param {string|null} [reason]
 */
export async function applyAdminUserLifecycle(serviceRole, adminUserId, userId, persona, action, reason) {
  if (!isUuid(userId) || !isUuid(adminUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  if (persona === "parent") {
    return applyAdminParentLifecycle(serviceRole, adminUserId, userId, action, reason);
  }
  if (persona === "private_teacher") {
    return applyAdminPrivateTeacherLifecycle(serviceRole, adminUserId, userId, action, reason);
  }
  if (persona === "school_teacher" || persona === "school_manager" || persona === "school_operator") {
    return applyAdminSchoolStaffLifecycle(serviceRole, adminUserId, userId, persona, action, reason);
  }

  return { ok: false, status: 400, code: "validation_failed" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function getAdminUserLifecycleSnapshot(serviceRole, userId) {
  const { listAdminEntitlementsForUser } = await import("./admin-entitlements.server.js");
  const listed = await listAdminEntitlementsForUser(serviceRole, userId);
  if (!listed.ok) return listed;

  const parentSettings = await getAdminParentSettings(serviceRole, userId);
  const limits = await loadTeacherLimitsRow(serviceRole, userId);

  return {
    ok: true,
    entitlements: listed.entitlements,
    parentSettings: parentSettings.ok ? parentSettings.settings : null,
    teacherIsAccountActive:
      limits.ok && limits.limits ? limits.limits.is_account_active !== false : null,
  };
}

import { schoolMembershipRoleToPersona } from "../admin-portal/admin-lifecycle-ui.js";

export { schoolMembershipRoleToPersona };
