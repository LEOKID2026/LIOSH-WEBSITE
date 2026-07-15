import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { normalizeAdminRole } from "./admin-request.server.js";
import {
  PROTECTED_DELETE_EMAILS,
  assessDeleteProtectionSync,
  isFullAccountDeleteConfigured,
  isMainAdminUser,
  normalizeUserEmail,
} from "./admin-user-delete.server.js";

/** @typedef {'parent'|'private_teacher'|'school_manager'|'school_teacher'|'school_operator'|'unlinked'|'pending_confirmation'|'qa_test'|'platform_admin'} AccountClassificationKey */

export const ACCOUNT_CLASSIFICATION_ORDER = [
  "platform_admin",
  "parent",
  "private_teacher",
  "school_manager",
  "school_teacher",
  "school_operator",
  "unlinked",
  "pending_confirmation",
  "qa_test",
];

/** @param {string|null|undefined} email */
export function isQaTestAccountEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  if (e.endsWith("@liosh-dev.invalid")) return true;
  if (e.endsWith("@staff.noreply.liosh")) return true;
  const local = e.split("@")[0] || "";
  if (local.startsWith("qa-") || local.includes("qa-school") || local.includes("qa_")) return true;
  return false;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} ids
 * @param {string} table
 * @param {string} column
 * @param {string} select
 */
async function fetchByIds(serviceRole, ids, table, column, select = "*") {
  const rows = [];
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { data, error } = await serviceRole.from(table).select(select).in(column, chunk);
    if (error) {
      if (isDbSchemaNotReadyError(error) || error.code === "42P01") return { ok: false, error };
      return { ok: false, error };
    }
    rows.push(...(data || []));
  }
  return { ok: true, rows };
}

/**
 * @param {Set<string>} set
 * @param {AccountClassificationKey} key
 */
function addClass(set, key) {
  set.add(key);
}

/**
 * @param {object} input
 */
export function buildAccountClassifications(input) {
  /** @type {Set<AccountClassificationKey>} */
  const keys = new Set();

  if (input.isQaTest) addClass(keys, "qa_test");
  if (input.pendingEmailConfirmation) addClass(keys, "pending_confirmation");
  if (input.isPlatformAdmin) addClass(keys, "platform_admin");

  for (const ent of input.entitlements || []) {
    const persona = String(ent.persona || "").trim().toLowerCase();
    const status = String(ent.status || "").trim().toLowerCase();
    if (persona === "admin" && status === "active") addClass(keys, "platform_admin");
    if (persona === "parent") addClass(keys, "parent");
    if (persona === "private_teacher") addClass(keys, "private_teacher");
    if (persona === "school_manager") addClass(keys, "school_manager");
    if (persona === "school_teacher") addClass(keys, "school_teacher");
    if (persona === "school_operator") addClass(keys, "school_operator");
  }

  for (const m of input.schoolMemberships || []) {
    const role = String(m.role || "").trim().toLowerCase();
    if (role === "school_admin") addClass(keys, "school_manager");
    else if (role === "school_operator") addClass(keys, "school_operator");
    else addClass(keys, "school_teacher");
  }

  if (input.hasParentProfile && !input.hasParentEntitlement) addClass(keys, "unlinked");
  if (
    keys.size === 0 ||
    (keys.size === 1 && (keys.has("pending_confirmation") || keys.has("qa_test")))
  ) {
    if (!input.hasTeacherProfile && !input.hasParentProfile && !(input.entitlements || []).length) {
      addClass(keys, "unlinked");
    } else if (input.hasParentProfile && !input.hasParentEntitlement) {
      addClass(keys, "unlinked");
    }
  }

  if (input.hasTeacherProfile && input.hasPrivateTeacherEntitlement && !input.hasSchoolMembership) {
    addClass(keys, "private_teacher");
  }

  return ACCOUNT_CLASSIFICATION_ORDER.filter((k) => keys.has(k));
}

/**
 * @param {object} row
 */
export function resolvePrimaryManageUrl(row) {
  if (row.manageUrls?.parent) return row.manageUrls.parent;
  if (row.manageUrls?.teacher) return row.manageUrls.teacher;
  if (row.manageUrls?.school) return row.manageUrls.school;
  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
export async function discoverUserIdsFromDb(serviceRole) {
  const ids = new Set();
  const probes = [
    { table: "account_persona_entitlements", column: "user_id" },
    { table: "parent_profiles", column: "id" },
    { table: "teacher_profiles", column: "id" },
    { table: "school_teacher_memberships", column: "teacher_id" },
  ];

  for (const probe of probes) {
    const { data, error } = await serviceRole.from(probe.table).select(probe.column).limit(5000);
    if (error) {
      if (isDbSchemaNotReadyError(error) || error.code === "42P01") continue;
      throw error;
    }
    for (const row of data || []) {
      const id = row[probe.column];
      if (id) ids.add(id);
    }
  }

  return ids;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
export async function loadAuthUsersForAdminList(serviceRole) {
  /** @type {import('@supabase/supabase-js').User[]} */
  const authUsers = [];
  /** @type {string|null} */
  let authListError = null;

  for (let page = 1; page <= 50; page++) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      authListError = String(error.message || error.code || "auth_list_failed").slice(0, 120);
      break;
    }
    authUsers.push(...(data?.users || []));
    if (!data?.users?.length || data.users.length < 200) break;
  }

  if (authUsers.length > 0) {
    return {
      ok: true,
      users: authUsers,
      listMeta: { source: "auth_list", authListError: null, dbUserIdCount: 0 },
    };
  }

  let dbUserIdCount = 0;
  try {
    const discovered = await discoverUserIdsFromDb(serviceRole);
    dbUserIdCount = discovered.size;
    if (discovered.size === 0) {
      return {
        ok: false,
        status: 503,
        code: authListError ? "auth_list_failed" : "auth_users_unavailable",
        authListError,
        dbUserIdCount: 0,
      };
    }

    const fallbackUsers = [];
    let resolveFailures = 0;
    const idList = [...discovered];
    for (let i = 0; i < idList.length; i += 20) {
      const chunk = idList.slice(i, i + 20);
      const results = await Promise.all(
        chunk.map((id) => serviceRole.auth.admin.getUserById(id).catch(() => ({ data: null, error: true })))
      );
      for (const result of results) {
        if (result?.data?.user?.id) fallbackUsers.push(result.data.user);
        else resolveFailures += 1;
      }
    }

    if (!fallbackUsers.length) {
      return {
        ok: false,
        status: 503,
        code: "auth_list_failed",
        authListError: authListError || "auth_get_user_failed",
        dbUserIdCount,
      };
    }

    return {
      ok: true,
      users: fallbackUsers,
      listMeta: {
        source: "db_fallback",
        authListError,
        dbUserIdCount,
        resolveFailures,
      },
    };
  } catch (_e) {
    return {
      ok: false,
      status: 503,
      code: "auth_list_failed",
      authListError: authListError || "db_discovery_failed",
      dbUserIdCount,
    };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
async function loadActiveAdminEntitlementUserIds(serviceRole) {
  const { data, error } = await serviceRole
    .from("account_persona_entitlements")
    .select("user_id")
    .eq("persona", "admin")
    .eq("status", "active");

  if (error) {
    if (isDbSchemaNotReadyError(error) || error.code === "42P01") return new Set();
    return new Set();
  }

  return new Set((data || []).map((row) => row.user_id).filter(Boolean));
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} actorUserId
 * @param {import('@supabase/supabase-js').User} actorUser
 */
export async function listAllAdminAccounts(serviceRole, actorUserId, actorUser) {
  const authLoad = await loadAuthUsersForAdminList(serviceRole);
  if (!authLoad.ok) {
    return {
      ok: false,
      status: authLoad.status || 503,
      code: authLoad.code || "auth_list_failed",
      authListError: authLoad.authListError || null,
      dbUserIdCount: authLoad.dbUserIdCount ?? 0,
    };
  }

  const authUsers = authLoad.users;
  const listMeta = authLoad.listMeta;
  const userIds = authUsers.map((u) => u.id).filter(Boolean);

  const [entRes, parentProfRes, teacherProfRes, membershipRes, parentSettingsRes, limitsRes, schoolsRes, activeAdminIds] =
    await Promise.all([
      fetchByIds(serviceRole, userIds, "account_persona_entitlements", "user_id", "user_id, persona, status"),
      fetchByIds(serviceRole, userIds, "parent_profiles", "id", "id, created_at"),
      fetchByIds(serviceRole, userIds, "teacher_profiles", "id", "id, display_name, created_at, is_active"),
      fetchByIds(
        serviceRole,
        userIds,
        "school_teacher_memberships",
        "teacher_id",
        "id, school_id, teacher_id, role"
      ),
      fetchByIds(
        serviceRole,
        userIds,
        "parent_account_settings",
        "parent_user_id",
        "parent_user_id, account_status"
      ),
      fetchByIds(serviceRole, userIds, "teacher_limits", "teacher_id", "teacher_id, is_account_active"),
      serviceRole.from("school_accounts").select("id, name"),
      loadActiveAdminEntitlementUserIds(serviceRole),
    ]);

  for (const res of [entRes, parentProfRes, teacherProfRes, membershipRes, parentSettingsRes, limitsRes]) {
    if (!res.ok) {
      if (isDbSchemaNotReadyError(res.error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  /** @type {Map<string, object[]>} */
  const entByUser = new Map();
  for (const row of entRes.rows) {
    const list = entByUser.get(row.user_id) || [];
    list.push(row);
    entByUser.set(row.user_id, list);
  }

  const parentProfileMap = new Map(parentProfRes.rows.map((r) => [r.id, r]));
  const teacherProfileMap = new Map(teacherProfRes.rows.map((r) => [r.id, r]));
  const parentSettingsMap = new Map(parentSettingsRes.rows.map((r) => [r.parent_user_id, r]));
  const limitsMap = new Map(limitsRes.rows.map((r) => [r.teacher_id, r]));

  /** @type {Map<string, object[]>} */
  const membershipByUser = new Map();
  for (const row of membershipRes.rows) {
    const list = membershipByUser.get(row.teacher_id) || [];
    list.push(row);
    membershipByUser.set(row.teacher_id, list);
  }

  const schoolNameMap = new Map((schoolsRes.data || []).map((s) => [s.id, s.name]));

  const fullDeleteConfigured = isFullAccountDeleteConfigured();
  const actorIsMainAdmin = isMainAdminUser(actorUser);

  const accounts = [];
  for (const user of authUsers) {
    const userId = user.id;
    const email = normalizeUserEmail(user);
    const entitlements = (entByUser.get(userId) || []).map((e) => ({
      persona: e.persona,
      status: e.status,
    }));
    const schoolMemberships = (membershipByUser.get(userId) || []).map((m) => ({
      membershipId: m.id,
      schoolId: m.school_id,
      schoolName: schoolNameMap.get(m.school_id) || null,
      role: m.role,
    }));

    const hasParentProfile = parentProfileMap.has(userId);
    const hasTeacherProfile = teacherProfileMap.has(userId);
    const hasParentEntitlement = entitlements.some((e) => e.persona === "parent");
    const hasPrivateTeacherEntitlement = entitlements.some((e) => e.persona === "private_teacher");
    const hasSchoolMembership = schoolMemberships.length > 0;
    const isPlatformAdmin =
      normalizeAdminRole(user) === "admin" ||
      entitlements.some((e) => e.persona === "admin" && e.status === "active");

    const classifications = buildAccountClassifications({
      isQaTest: isQaTestAccountEmail(email),
      pendingEmailConfirmation: !user.email_confirmed_at,
      isPlatformAdmin,
      entitlements,
      schoolMemberships,
      hasParentProfile,
      hasParentEntitlement,
      hasTeacherProfile,
      hasPrivateTeacherEntitlement,
      hasSchoolMembership,
    });

    const protection = assessDeleteProtectionSync(actorUserId, user, activeAdminIds);
    const isProtected =
      !protection.ok ||
      PROTECTED_DELETE_EMAILS.has(email) ||
      protection.code === "protected_admin_account" ||
      protection.code === "protected_account" ||
      protection.code === "cannot_delete_self";

    const frozen =
      entitlements.some((e) => e.status === "suspended") ||
      parentSettingsMap.get(userId)?.account_status === "suspended" ||
      limitsMap.get(userId)?.is_account_active === false;

    const statusParts = entitlements.map((e) => e.status).filter(Boolean);
    const parentStatus = parentSettingsMap.get(userId)?.account_status;
    if (parentStatus) statusParts.push(parentStatus);
    const statusSummary = frozen
      ? "suspended"
      : statusParts.includes("pending")
        ? "pending"
        : statusParts.includes("active")
          ? "active"
          : statusParts[0] || (user.email_confirmed_at ? "none" : "pending_confirmation");

    const linkedParts = [];
    if (hasParentProfile) linkedParts.push("פרופיל הורה");
    if (hasTeacherProfile) {
      const tp = teacherProfileMap.get(userId);
      linkedParts.push(tp?.display_name ? `מורה: ${tp.display_name}` : "פרופיל מורה");
    }
    if (schoolMemberships.length) {
      linkedParts.push(
        schoolMemberships
          .map((m) => `בית ספר: ${m.schoolName || m.schoolId}`)
          .join(" · ")
      );
    }
    if (!linkedParts.length) linkedParts.push("-");

    const manageUrls = {
      parent:
        hasParentEntitlement || (hasParentProfile && !hasParentEntitlement)
          ? `/admin/parents/${userId}`
          : null,
      teacher: hasTeacherProfile ? `/admin/teachers/${userId}` : null,
      school: schoolMemberships[0]?.schoolId
        ? `/admin/schools/${schoolMemberships[0].schoolId}`
        : null,
    };

    const row = {
      userId,
      email: user.email || null,
      emailConfirmed: !!user.email_confirmed_at,
      createdAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      classifications,
      personas: entitlements,
      statusSummary,
      frozen,
      linkedSummary: linkedParts.join(" · "),
      isProtected,
      protectionCode: protection.ok ? null : protection.code,
      deletable: protection.ok,
      fullDeleteReady: fullDeleteConfigured && actorIsMainAdmin && protection.ok,
      isQaTest: isQaTestAccountEmail(email),
      isOrphanUnlinked: classifications.includes("unlinked"),
      schoolMemberships,
      manageUrls,
      manageUrl: null,
      isSchoolAffiliated: hasSchoolMembership,
    };
    row.manageUrl = resolvePrimaryManageUrl(row);
    accounts.push(row);
  }

  accounts.sort((a, b) => {
    const ae = String(a.email || "");
    const be = String(b.email || "");
    return ae.localeCompare(be);
  });

  if (accounts.length === 0 && (listMeta?.dbUserIdCount > 0 || membershipRes.rows.length > 0)) {
    return {
      ok: false,
      status: 503,
      code: "auth_list_failed",
      authListError: listMeta?.authListError || "accounts_empty_with_db_users",
      dbUserIdCount: listMeta?.dbUserIdCount || 0,
    };
  }

  return {
    ok: true,
    actorIsMainAdmin,
    actorEmail: normalizeUserEmail(actorUser) || null,
    fullDeleteConfigured,
    accounts,
    total: accounts.length,
    listMeta: {
      ...listMeta,
      authUserCount: authUsers.length,
      accountCount: accounts.length,
    },
  };
}
