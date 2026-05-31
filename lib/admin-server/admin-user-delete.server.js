import { normalizeAdminRole } from "./admin-request.server.js";

/** Canonical protected accounts — never hard-deletable via admin UI. */
export const PROTECTED_DELETE_EMAILS = new Set([
  "admin@admin.com",
  "leokid2026@gmail.com",
  "office@leo.com",
  "office@leo-k.com",
]);

/** @returns {Set<string>} */
export function getMainAdminEmailSet() {
  const primary = String(process.env.MAIN_ADMIN_EMAIL || "leokid2026@gmail.com")
    .trim()
    .toLowerCase();
  const extras = String(process.env.MAIN_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([primary, ...extras]);
}

/** @param {import('@supabase/supabase-js').User|null|undefined} user */
export function normalizeUserEmail(user) {
  return String(user?.email || "")
    .trim()
    .toLowerCase();
}

/** @param {import('@supabase/supabase-js').User|null|undefined} user */
export function isMainAdminUser(user) {
  const email = normalizeUserEmail(user);
  return email.length > 0 && getMainAdminEmailSet().has(email);
}

/** @param {string|null|undefined} email */
export function isDevDeletableEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.endsWith("@liosh-dev.invalid") ||
    normalized.endsWith("@staff.noreply.liosh")
  );
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
async function countRows(serviceRole, table, column, userId) {
  const { count, error } = await serviceRole
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, userId);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return { ok: true, count: 0, skipped: true };
    }
    return { ok: false, code: error.code, table, column };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
async function hasActiveAdminEntitlement(serviceRole, userId) {
  const { data, error } = await serviceRole
    .from("account_persona_entitlements")
    .select("persona, status")
    .eq("user_id", userId)
    .eq("persona", "admin")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return false;
    return false;
  }

  return data?.status === "active";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} targetUserId
 */
export async function resolveTargetAuthUser(serviceRole, targetUserId) {
  const { data, error } = await serviceRole.auth.admin.getUserById(targetUserId);
  if (error || !data?.user?.id) {
    return { ok: false, status: 404, code: "user_not_found" };
  }
  return { ok: true, user: data.user, email: normalizeUserEmail(data.user) };
}

/**
 * @param {string} actorUserId
 * @param {import('@supabase/supabase-js').User} targetUser
 */
export async function assessDeleteProtection(serviceRole, actorUserId, targetUser) {
  const targetUserId = targetUser.id;
  const email = normalizeUserEmail(targetUser);

  if (actorUserId === targetUserId) {
    return { ok: false, code: "cannot_delete_self", reason: "self" };
  }

  if (PROTECTED_DELETE_EMAILS.has(email)) {
    return { ok: false, code: "protected_account", reason: "protected_email" };
  }

  if (normalizeAdminRole(targetUser) === "admin") {
    return { ok: false, code: "protected_admin_account", reason: "admin_role_metadata" };
  }

  if (await hasActiveAdminEntitlement(serviceRole, targetUserId)) {
    return { ok: false, code: "protected_admin_account", reason: "admin_entitlement" };
  }

  return { ok: true, email };
}

/** Dependency probes — RESTRICT / manual cleanup tables first in preview. */
const DEPENDENCY_PROBES = [
  { table: "school_messages", column: "author_id", label: "school_messages.author_id" },
  { table: "school_teacher_subjects", column: "granted_by", label: "school_teacher_subjects.granted_by" },
  { table: "private_teacher_subjects", column: "granted_by", label: "private_teacher_subjects.granted_by" },
  { table: "private_teacher_subjects", column: "teacher_id", label: "private_teacher_subjects.teacher_id" },
  { table: "student_guardian_access", column: "created_by_teacher_id", label: "student_guardian_access.created_by_teacher_id" },
  { table: "school_staff_access_codes", column: "created_by", label: "school_staff_access_codes.created_by" },
  { table: "school_staff_access_codes", column: "user_id", label: "school_staff_access_codes.user_id" },
  { table: "school_staff_sessions", column: "user_id", label: "school_staff_sessions.user_id" },
  { table: "school_operator_grants", column: "operator_user_id", label: "school_operator_grants.operator_user_id" },
  { table: "school_teacher_memberships", column: "teacher_id", label: "school_teacher_memberships.teacher_id" },
  { table: "teacher_registration_requests", column: "user_id", label: "teacher_registration_requests.user_id" },
  { table: "school_registration_requests", column: "contact_user_id", label: "school_registration_requests.contact_user_id" },
  { table: "account_persona_entitlements", column: "user_id", label: "account_persona_entitlements.user_id" },
  { table: "parent_account_settings", column: "parent_user_id", label: "parent_account_settings.parent_user_id" },
  { table: "parent_profiles", column: "id", label: "parent_profiles.id" },
  { table: "teacher_profiles", column: "id", label: "teacher_profiles.id" },
  { table: "students", column: "parent_id", label: "students.parent_id" },
  { table: "parent_copilot_usage_log", column: "parent_user_id", label: "parent_copilot_usage_log.parent_user_id" },
];

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function previewAdminUserDeleteDependencies(serviceRole, userId) {
  const blockers = [];

  for (const probe of DEPENDENCY_PROBES) {
    const result = await countRows(serviceRole, probe.table, probe.column, userId);
    if (!result.ok) {
      blockers.push({
        table: probe.label,
        count: null,
        code: result.code || "count_failed",
      });
      continue;
    }
    if ((result.count ?? 0) > 0) {
      blockers.push({ table: probe.label, count: result.count });
    }
  }

  return blockers;
}

/**
 * Ordered cleanup for dev/test accounts only (@liosh-dev.invalid, internal staff).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function cleanupDevUserDependencies(serviceRole, userId) {
  const cleaned = [];

  /** @type {Array<{ table: string, column: string }>} */
  const deleteSteps = [
    { table: "school_messages", column: "author_id" },
    { table: "private_teacher_subjects", column: "granted_by" },
    { table: "private_teacher_subjects", column: "teacher_id" },
    { table: "school_teacher_subjects", column: "granted_by" },
    { table: "school_teacher_subjects", column: "teacher_id" },
    { table: "student_guardian_access", column: "created_by_teacher_id" },
    { table: "school_staff_access_codes", column: "user_id" },
    { table: "school_staff_access_codes", column: "created_by" },
    { table: "school_staff_sessions", column: "user_id" },
    { table: "school_operator_grants", column: "operator_user_id" },
    { table: "school_teacher_memberships", column: "teacher_id" },
    { table: "teacher_registration_requests", column: "user_id" },
  ];

  for (const step of deleteSteps) {
    const { error } = await serviceRole.from(step.table).delete().eq(step.column, userId);
    if (error) {
      if (error.code === "42P01" || error.code === "42703") continue;
      return {
        ok: false,
        code: "dependency_cleanup_failed",
        table: `${step.table}.${step.column}`,
        detail: error.code,
        cleaned,
      };
    }
    cleaned.push(`${step.table}.${step.column}`);
  }

  return { ok: true, cleaned };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} actorUserId
 * @param {import('@supabase/supabase-js').User} actorUser
 * @param {string} targetUserId
 */
export async function getAdminUserDeletePreview(serviceRole, actorUserId, actorUser, targetUserId) {
  const resolved = await resolveTargetAuthUser(serviceRole, targetUserId);
  if (!resolved.ok) return resolved;

  const protection = await assessDeleteProtection(serviceRole, actorUserId, resolved.user);
  const blockers = await previewAdminUserDeleteDependencies(serviceRole, targetUserId);
  const devCleanupAllowed = isDevDeletableEmail(resolved.email);

  return {
    ok: true,
    actorIsMainAdmin: isMainAdminUser(actorUser),
    targetUserId,
    email: resolved.email,
    deletable: protection.ok,
    protectionCode: protection.ok ? null : protection.code,
    blockers,
    devCleanupAllowed,
    requiresManualCleanup: blockers.length > 0 && !devCleanupAllowed,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} actorUserId
 * @param {string} targetUserId
 * @param {{ confirmEmail: string }} input
 */
export async function deleteAdminUserAccount(serviceRole, actorUserId, targetUserId, input) {
  const confirmEmail = String(input?.confirmEmail || "")
    .trim()
    .toLowerCase();
  if (!confirmEmail) {
    return { ok: false, status: 400, code: "validation_failed", field: "confirmEmail" };
  }

  const resolved = await resolveTargetAuthUser(serviceRole, targetUserId);
  if (!resolved.ok) return resolved;

  const protection = await assessDeleteProtection(serviceRole, actorUserId, resolved.user);
  if (!protection.ok) {
    return { ok: false, status: 403, code: protection.code };
  }

  if (confirmEmail !== resolved.email) {
    return { ok: false, status: 400, code: "confirm_email_mismatch" };
  }

  const blockers = await previewAdminUserDeleteDependencies(serviceRole, targetUserId);
  let cleanupSummary = null;

  if (blockers.length > 0) {
    if (!isDevDeletableEmail(resolved.email)) {
      return {
        ok: false,
        status: 409,
        code: "delete_blocked_by_dependencies",
        blockers,
      };
    }

    const cleanup = await cleanupDevUserDependencies(serviceRole, targetUserId);
    if (!cleanup.ok) {
      return {
        ok: false,
        status: 409,
        code: cleanup.code,
        table: cleanup.table,
        blockers,
        cleaned: cleanup.cleaned,
      };
    }
    cleanupSummary = cleanup.cleaned;

    const remaining = await previewAdminUserDeleteDependencies(serviceRole, targetUserId);
    const hardBlockers = remaining.filter((b) => (b.count ?? 0) > 0);
    if (hardBlockers.length > 0) {
      return {
        ok: false,
        status: 409,
        code: "delete_blocked_by_dependencies",
        blockers: hardBlockers,
        cleaned: cleanupSummary,
      };
    }
  }

  const { error } = await serviceRole.auth.admin.deleteUser(targetUserId);
  if (error) {
    return {
      ok: false,
      status: 409,
      code: "auth_delete_failed",
      message: String(error.message || "auth_delete_failed").slice(0, 200),
      blockers,
      cleaned: cleanupSummary,
    };
  }

  return {
    ok: true,
    deletedUserId: targetUserId,
    email: resolved.email,
    cleaned: cleanupSummary,
  };
}
