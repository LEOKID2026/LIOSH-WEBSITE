import { isUuid } from "../teacher-server/teacher-request.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} email
 */
export async function resolveAuthUserIdByEmail(serviceRole, email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, status: 400, code: "validation_failed", field: "email" };
  }

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return { ok: false, status: 500, code: "internal_error" };
    }
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === normalized);
    if (match?.id) {
      return { ok: true, userId: match.id, email: match.email };
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }

  return { ok: false, status: 404, code: "staff_user_not_found" };
}

/**
 * @param {object} body
 * @param {{ userIdKey: string }} options
 */
export async function parseStaffInviteBody(serviceRole, body, options) {
  const raw = body && typeof body === "object" ? body : {};
  const userIdKey = options.userIdKey;

  const directId = typeof raw[userIdKey] === "string" ? raw[userIdKey].trim() : "";
  if (directId) {
    if (!isUuid(directId)) {
      return { ok: false, status: 400, code: "validation_failed", field: userIdKey };
    }
    return { ok: true, userId: directId, resolvedVia: "uuid" };
  }

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!email) {
    return { ok: false, status: 400, code: "validation_failed", field: "email" };
  }

  const resolved = await resolveAuthUserIdByEmail(serviceRole, email);
  if (!resolved.ok) return resolved;

  return { ok: true, userId: resolved.userId, email: resolved.email, resolvedVia: "email" };
}
