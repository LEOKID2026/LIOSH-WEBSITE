import { PARENT_SIGNUP_MODE } from "./parent-signup-mode.server.js";
import {
  hasActivePersonaEntitlement,
  loadParentAccountSettings,
  upsertActiveEntitlement,
} from "../auth/persona-entitlement.server.js";
import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import {
  DEFAULT_PARENT_STUDENT_LIMIT,
  QA_SIMULATION_PARENT_EMAIL,
  QA_SIMULATION_PARENT_STUDENT_LIMIT,
} from "./parent-student-limit.server.js";

/**
 * Provision parent entitlement + default settings after policy acceptance (auto_active mode).
 * @param {import('@supabase/supabase-js').SupabaseClient} [serviceRole]
 * @param {string} parentUserId
 * @param {string|null|undefined} email
 */
export async function provisionParentEntitlementOnAccept(serviceRole, parentUserId, email) {
  if (PARENT_SIGNUP_MODE !== "auto_active") {
    return { ok: true, skipped: true, reason: "signup_mode_not_auto_active" };
  }

  const db = serviceRole || getLearningSupabaseServiceRoleClient();

  const entitlementResult = await upsertActiveEntitlement(db, parentUserId, "parent", {
    approvalSource: "self_signup",
  });
  if (!entitlementResult.ok) return entitlementResult;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const maxChildren =
    normalizedEmail === QA_SIMULATION_PARENT_EMAIL
      ? QA_SIMULATION_PARENT_STUDENT_LIMIT
      : DEFAULT_PARENT_STUDENT_LIMIT;

  const { data: existingSettings } = await db
    .from("parent_account_settings")
    .select("parent_user_id")
    .eq("parent_user_id", parentUserId)
    .maybeSingle();

  if (!existingSettings) {
    const { error: settingsErr } = await db.from("parent_account_settings").insert({
      parent_user_id: parentUserId,
      plan_code: "free",
      account_status: "active",
      max_children: maxChildren,
      reports_enabled: true,
      copilot_enabled: false,
    });

    if (settingsErr) {
      const { isDbSchemaNotReadyError } = await import("../teacher-server/teacher-audit.server.js");
      if (isDbSchemaNotReadyError(settingsErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  return {
    ok: true,
    entitlement: entitlementResult.entitlement,
    settingsCreated: !existingSettings,
  };
}

/**
 * When policy is already accepted but entitlement/settings were not provisioned
 * (e.g. accept API returned 200 before a failed silent provision), heal once.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 * @param {string|null|undefined} email
 */
export async function ensureParentEntitlementIfPolicyAccepted(serviceRole, parentUserId, email) {
  if (PARENT_SIGNUP_MODE !== "auto_active") {
    return { ok: true, skipped: true, reason: "signup_mode_not_auto_active" };
  }

  const activeCheck = await hasActivePersonaEntitlement(serviceRole, parentUserId, "parent");
  if (!activeCheck.ok) return activeCheck;
  if (activeCheck.active) {
    const settingsResult = await loadParentAccountSettings(serviceRole, parentUserId);
    if (settingsResult.ok && settingsResult.settings?.account_status === "active") {
      return { ok: true, skipped: true, reason: "already_provisioned" };
    }
  }

  const { resolveParentPolicyAcceptanceStatus } = await import("./policy-acceptance.server.js");
  const policyStatus = await resolveParentPolicyAcceptanceStatus(serviceRole, parentUserId);
  if (!policyStatus.accepted) {
    return { ok: true, skipped: true, reason: "policy_not_accepted" };
  }

  return provisionParentEntitlementOnAccept(serviceRole, parentUserId, email);
}

/**
 * Resolve max children from parent_account_settings with legacy email fallback.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 * @param {string|null|undefined} email
 */
export async function resolveParentMaxChildren(serviceRole, parentUserId, email) {
  const settingsResult = await loadParentAccountSettings(serviceRole, parentUserId);
  if (!settingsResult.ok) {
    return settingsResult;
  }

  if (settingsResult.settings?.max_children != null) {
    return { ok: true, maxChildren: settingsResult.settings.max_children, settings: settingsResult.settings };
  }

  const { resolveParentStudentLimit } = await import("./parent-student-limit.server.js");
  return {
    ok: true,
    maxChildren: resolveParentStudentLimit(email),
    settings: null,
  };
}
