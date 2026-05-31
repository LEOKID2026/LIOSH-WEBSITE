import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadParentAccountSettings } from "../auth/persona-entitlement.server.js";

const PLAN_CODES = new Set(["free", "trial", "basic", "family", "premium", "school_linked"]);
const ACCOUNT_STATUSES = new Set(["active", "trial", "suspended", "cancelled"]);
const SUBSCRIPTION_STATUSES = new Set(["active", "trial", "past_due", "cancelled"]);

/**
 * @param {object} row
 */
export function formatAdminParentSettings(row) {
  return {
    parentUserId: row.parent_user_id,
    planCode: row.plan_code,
    accountStatus: row.account_status,
    subscriptionStatus: row.subscription_status,
    maxChildren: row.max_children,
    reportsEnabled: row.reports_enabled === true,
    copilotEnabled: row.copilot_enabled === true,
    advancedDiagnosticsEnabled: row.advanced_diagnostics_enabled === true,
    exportEnabled: row.export_enabled === true,
    monthlyAiLimit: row.monthly_ai_limit,
    monthlyReportLimit: row.monthly_report_limit,
    billingProvider: row.billing_provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEndsAt: row.current_period_ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadAuthEmailMap(serviceRole) {
  const emailMap = new Map();
  for (let page = 1; page <= 20; page++) {
    const { data } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users || []) {
      if (u?.id) emailMap.set(u.id, u.email || null);
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return emailMap;
}

export async function listAdminParents(serviceRole) {
  const { data: entitlements, error: entErr } = await serviceRole
    .from("account_persona_entitlements")
    .select("user_id, status, created_at")
    .eq("persona", "parent")
    .order("created_at", { ascending: false })
    .limit(500);

  if (entErr) {
    if (isDbSchemaNotReadyError(entErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const emailMap = await loadAuthEmailMap(serviceRole);
  const entitledIds = new Set((entitlements || []).map((e) => e.user_id));

  const parents = [];
  for (const ent of entitlements || []) {
    const settingsResult = await loadParentAccountSettings(serviceRole, ent.user_id);
    parents.push({
      parentUserId: ent.user_id,
      email: emailMap.get(ent.user_id) || null,
      entitlementStatus: ent.status,
      isOrphanUnlinked: false,
      settings:
        settingsResult.ok && settingsResult.settings
          ? formatAdminParentSettings(settingsResult.settings)
          : null,
    });
  }

  const { data: orphanProfiles, error: orphanErr } = await serviceRole
    .from("parent_profiles")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (orphanErr && !isDbSchemaNotReadyError(orphanErr)) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  for (const profile of orphanProfiles || []) {
    if (!profile?.id || entitledIds.has(profile.id)) continue;
    parents.push({
      parentUserId: profile.id,
      email: emailMap.get(profile.id) || null,
      entitlementStatus: null,
      isOrphanUnlinked: true,
      settings: null,
      profileCreatedAt: profile.created_at,
    });
  }

  return { ok: true, parents };
}

/**
 * Parent detail for admin UI — entitled parents and orphan unlinked auth/profile rows.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 */
export async function getAdminParentDetail(serviceRole, parentUserId) {
  if (!isUuid(parentUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: authData, error: authErr } = await serviceRole.auth.admin.getUserById(parentUserId);
  if (authErr || !authData?.user?.id) {
    return { ok: false, status: 404, code: "user_not_found" };
  }

  const { data: parentEnt } = await serviceRole
    .from("account_persona_entitlements")
    .select("status")
    .eq("user_id", parentUserId)
    .eq("persona", "parent")
    .maybeSingle();

  const { data: profile } = await serviceRole
    .from("parent_profiles")
    .select("id, created_at")
    .eq("id", parentUserId)
    .maybeSingle();

  if (!parentEnt && !profile) {
    return { ok: false, status: 404, code: "parent_not_found" };
  }

  const settingsResult = await loadParentAccountSettings(serviceRole, parentUserId);
  const isOrphanUnlinked = !parentEnt;

  return {
    ok: true,
    email: authData.user.email || null,
    isOrphanUnlinked,
    hasParentProfile: !!profile,
    entitlementStatus: parentEnt?.status || null,
    profileCreatedAt: profile?.created_at || null,
    settings:
      settingsResult.ok && settingsResult.settings
        ? formatAdminParentSettings(settingsResult.settings)
        : null,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 */
export async function getAdminParentSettings(serviceRole, parentUserId) {
  const detail = await getAdminParentDetail(serviceRole, parentUserId);
  if (!detail.ok) return detail;

  if (!detail.settings && !detail.isOrphanUnlinked) {
    return { ok: false, status: 404, code: "parent_settings_not_found" };
  }

  return {
    ok: true,
    settings: detail.settings,
    email: detail.email,
    isOrphanUnlinked: detail.isOrphanUnlinked,
    hasParentProfile: detail.hasParentProfile,
    entitlementStatus: detail.entitlementStatus,
    profileCreatedAt: detail.profileCreatedAt,
  };
}

/**
 * @param {unknown} body
 */
export function parseParentSettingsPatchBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(b, "planCode")) {
    const planCode = typeof b.planCode === "string" ? b.planCode.trim().toLowerCase() : "";
    if (!PLAN_CODES.has(planCode)) {
      return { ok: false, code: "validation_failed", field: "planCode" };
    }
    patch.plan_code = planCode;
  }

  if (Object.prototype.hasOwnProperty.call(b, "accountStatus")) {
    const accountStatus = typeof b.accountStatus === "string" ? b.accountStatus.trim().toLowerCase() : "";
    if (!ACCOUNT_STATUSES.has(accountStatus)) {
      return { ok: false, code: "validation_failed", field: "accountStatus" };
    }
    patch.account_status = accountStatus;
  }

  if (Object.prototype.hasOwnProperty.call(b, "subscriptionStatus")) {
    if (b.subscriptionStatus === null) {
      patch.subscription_status = null;
    } else {
      const subscriptionStatus =
        typeof b.subscriptionStatus === "string" ? b.subscriptionStatus.trim().toLowerCase() : "";
      if (!SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
        return { ok: false, code: "validation_failed", field: "subscriptionStatus" };
      }
      patch.subscription_status = subscriptionStatus;
    }
  }

  if (Object.prototype.hasOwnProperty.call(b, "maxChildren")) {
    const n = Number(b.maxChildren);
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, code: "validation_failed", field: "maxChildren" };
    }
    patch.max_children = n;
  }

  for (const [camel, col] of [
    ["reportsEnabled", "reports_enabled"],
    ["copilotEnabled", "copilot_enabled"],
    ["advancedDiagnosticsEnabled", "advanced_diagnostics_enabled"],
    ["exportEnabled", "export_enabled"],
  ]) {
    if (Object.prototype.hasOwnProperty.call(b, camel)) {
      if (typeof b[camel] !== "boolean") {
        return { ok: false, code: "validation_failed", field: camel };
      }
      patch[col] = b[camel];
    }
  }

  for (const [camel, col] of [
    ["monthlyAiLimit", "monthly_ai_limit"],
    ["monthlyReportLimit", "monthly_report_limit"],
  ]) {
    if (Object.prototype.hasOwnProperty.call(b, camel)) {
      if (b[camel] === null) {
        patch[col] = null;
      } else {
        const n = Number(b[camel]);
        if (!Number.isInteger(n) || n < 0) {
          return { ok: false, code: "validation_failed", field: camel };
        }
        patch[col] = n;
      }
    }
  }

  if (!Object.keys(patch).length) {
    return { ok: false, code: "validation_failed", field: "body" };
  }

  return { ok: true, patch };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 * @param {object} patch
 */
export async function patchAdminParentSettings(serviceRole, parentUserId, patch) {
  if (!isUuid(parentUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const beforeResult = await loadParentAccountSettings(serviceRole, parentUserId);
  if (!beforeResult.ok) return beforeResult;
  if (!beforeResult.settings) {
    return { ok: false, status: 404, code: "parent_settings_not_found" };
  }

  const { data, error } = await serviceRole
    .from("parent_account_settings")
    .update(patch)
    .eq("parent_user_id", parentUserId)
    .select("*")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    before: beforeResult.settings,
    after: data,
    settings: formatAdminParentSettings(data),
  };
}
