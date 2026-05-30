import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { isSessionCookieSecure } from "../security/session-cookie-secure.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { hashIpForAudit } from "../guardian-server/guardian-crypto.server.js";
import {
  generateStaffSessionToken,
  hashStaffSecret,
} from "./school-staff-crypto.server.js";
import { assertActivePersonaEntitlement } from "../auth/persona-guard.server.js";
import {
  isStaffAccessRowActiveForSession,
  isStaffSessionRowActive,
  staffPersonaForStaffRole,
} from "./school-staff-session-validation.server.js";

export const STAFF_SESSION_COOKIE = "liosh_staff_session";

const DEFAULT_TEACHER_SESSION_SECONDS = 8 * 60 * 60;
const DEFAULT_OPERATOR_SESSION_SECONDS = 6 * 60 * 60;

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function staffSessionMaxAgeSeconds(staffRole) {
  if (staffRole === "school_operator") {
    return envInt("SCHOOL_STAFF_OPERATOR_SESSION_SECONDS", DEFAULT_OPERATOR_SESSION_SECONDS);
  }
  return envInt("SCHOOL_STAFF_TEACHER_SESSION_SECONDS", DEFAULT_TEACHER_SESSION_SECONDS);
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function getStaffSessionCookie(req) {
  return req?.cookies?.[STAFF_SESSION_COOKIE] || "";
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} token
 * @param {number} maxAgeSeconds
 */
export function setStaffSessionCookie(res, token, maxAgeSeconds) {
  const secure = isSessionCookieSecure();
  const cookie = [
    `${STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

/**
 * @param {import('http').ServerResponse} res
 */
export function clearStaffSessionCookie(res) {
  const secure = isSessionCookieSecure();
  const cookie = [
    `${STAFF_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function staffRequestMeta(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  let ip = "";
  if (typeof forwarded === "string" && forwarded.trim()) {
    ip = forwarded.split(",")[0].trim();
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    ip = String(forwarded[0]).trim();
  } else {
    ip = String(req.socket?.remoteAddress || "").trim();
  }
  const userAgent =
    typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 500) : null;
  return { ipHash: hashIpForAudit(ip), userAgent };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} staffAccessId
 */
export async function revokeLiveStaffSessionsForAccess(serviceRole, staffAccessId) {
  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("school_staff_sessions")
    .update({ revoked_at: now })
    .eq("staff_access_id", staffAccessId)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function revokeLiveStaffSessionsForUser(serviceRole, userId) {
  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("school_staff_sessions")
    .update({ revoked_at: now })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {object} accessRow
 * @param {{ userAgent?: string|null, ipHash?: string|null }} opts
 */
export async function issueStaffSession(serviceRole, accessRow, opts = {}) {
  await revokeLiveStaffSessionsForAccess(serviceRole, accessRow.id);

  const token = generateStaffSessionToken();
  const tokenHash = hashStaffSecret(token);
  const maxAgeSec = staffSessionMaxAgeSeconds(accessRow.staff_role);
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000).toISOString();

  const { data: row, error } = await serviceRole
    .from("school_staff_sessions")
    .insert({
      staff_access_id: accessRow.id,
      user_id: accessRow.user_id,
      school_id: accessRow.school_id,
      staff_role: accessRow.staff_role,
      session_token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: opts.userAgent || null,
      ip_hash: opts.ipHash || null,
    })
    .select("id, expires_at")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, token, sessionId: row.id, sessionExpiresAt: row.expires_at, maxAgeSec };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} tokenPlain
 */
export async function resolveStaffSession(serviceRole, tokenPlain) {
  if (!tokenPlain) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  const tokenHash = hashStaffSecret(tokenPlain);
  const nowMs = Date.now();

  const { data: sessionRow, error } = await serviceRole
    .from("school_staff_sessions")
    .select(
      "id, user_id, school_id, staff_role, staff_access_id, expires_at, revoked_at"
    )
    .eq("session_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!isStaffSessionRowActive(sessionRow, nowMs)) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  const { data: accessRow, error: accessErr } = await serviceRole
    .from("school_staff_access_codes")
    .select("id, is_active, revoked_at, locked_until, staff_role, must_change_pin")
    .eq("id", sessionRow.staff_access_id)
    .maybeSingle();

  if (accessErr || !accessRow?.id) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  if (!isStaffAccessRowActiveForSession(accessRow)) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  if (accessRow.locked_until) {
    const lockedUntil = new Date(accessRow.locked_until).getTime();
    if (Number.isFinite(lockedUntil) && lockedUntil > nowMs) {
      return { ok: false, status: 403, code: "account_locked" };
    }
  }

  const persona = staffPersonaForStaffRole(accessRow.staff_role);
  const entitlement = await assertActivePersonaEntitlement(
    serviceRole,
    sessionRow.user_id,
    persona
  );
  if (!entitlement.ok) {
    return { ok: false, status: entitlement.status, code: entitlement.code };
  }

  await serviceRole
    .from("school_staff_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionRow.id);

  return {
    ok: true,
    userId: sessionRow.user_id,
    schoolId: sessionRow.school_id,
    staffRole: sessionRow.staff_role,
    sessionId: sessionRow.id,
    staffAccessId: sessionRow.staff_access_id,
    mustChangePin: accessRow.must_change_pin === true,
    authMethod: "staff_cookie",
  };
}

/**
 * @param {import('http').IncomingMessage} req
 */
export async function resolveAuthenticatedStaffFromRequest(req) {
  const token = getStaffSessionCookie(req);
  if (!token) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }
  const serviceRole = getLearningSupabaseServiceRoleClient();
  return resolveStaffSession(serviceRole, token);
}

/**
 * @param {import('http').IncomingMessage} req
 */
export async function staffLogout(req) {
  const token = getStaffSessionCookie(req);
  if (!token) return { ok: true, alreadyLoggedOut: true };

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const tokenHash = hashStaffSecret(token);
  const now = new Date().toISOString();

  await serviceRole
    .from("school_staff_sessions")
    .update({ revoked_at: now })
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null);

  return { ok: true, loggedOut: true };
}
