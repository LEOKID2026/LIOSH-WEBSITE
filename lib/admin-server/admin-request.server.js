import { getLearningSupabaseServerUserClient, getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 */
export function sendAdminApiError(res, status, code, message) {
  return res.status(status).json({
    error: {
      code,
      message: message || code,
    },
  });
}

function normalizeAdminRole(user) {
  const meta = user?.app_metadata;
  if (!meta || typeof meta !== "object") return null;
  const role = meta.role;
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

export { normalizeAdminRole };

/**
 * @param {string} authHeader
 */
export async function resolveAuthenticatedAdminUserId(authHeader) {
  const bearer = typeof authHeader === "string" ? authHeader.trim() : "";
  if (!bearer.startsWith("Bearer ")) {
    return { ok: false, status: 401, code: "not_authenticated", message: "Missing bearer token" };
  }

  const supabase = getLearningSupabaseServerUserClient(bearer);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, code: "not_authenticated", message: "Invalid session" };
  }

  const role = normalizeAdminRole(userData.user);
  if (role !== "admin") {
    return { ok: false, status: 403, code: "not_an_admin", message: "Not an admin account" };
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const { assertActivePersonaEntitlement } = await import("../auth/persona-guard.server.js");
  const adminEntitlement = await assertActivePersonaEntitlement(serviceRole, userData.user.id, "admin");
  if (!adminEntitlement.ok) {
    return {
      ok: false,
      status: adminEntitlement.status,
      code: adminEntitlement.code,
      message: adminEntitlement.code,
    };
  }

  return { ok: true, adminUserId: userData.user.id, user: userData.user, entitlement: adminEntitlement.entitlement };
}

export function getAdminServiceRole() {
  return getLearningSupabaseServiceRoleClient();
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 */
export async function requireAdminApiContext(res, authHeader) {
  const auth = await resolveAuthenticatedAdminUserId(authHeader);
  if (!auth.ok) {
    sendAdminApiError(res, auth.status, auth.code, auth.message);
    return { ok: false, stopped: true };
  }

  return {
    ok: true,
    stopped: false,
    adminUserId: auth.adminUserId,
    user: auth.user,
    serviceRole: getAdminServiceRole(),
  };
}

/**
 * Platform admin + main owner email only (hard delete).
 * @param {import('http').ServerResponse} res
 * @param {string} authHeader
 */
export async function requireMainAdminApiContext(res, authHeader) {
  const ctx = await requireAdminApiContext(res, authHeader);
  if (ctx.stopped) return ctx;

  const { isMainAdminUser } = await import("./admin-user-delete.server.js");
  if (!isMainAdminUser(ctx.user)) {
    sendAdminApiError(res, 403, "main_admin_required", "Main admin required");
    return { ok: false, stopped: true };
  }

  return ctx;
}
