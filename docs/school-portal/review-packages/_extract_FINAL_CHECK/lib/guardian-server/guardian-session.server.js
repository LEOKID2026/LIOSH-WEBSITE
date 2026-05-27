import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { isSessionCookieSecure } from "../security/session-cookie-secure.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  generateGuardianSessionToken,
  hashIpForAudit,
  hashStudentSecret,
} from "./guardian-crypto.server.js";

export const GUARDIAN_SESSION_COOKIE = "liosh_guardian_session";
export const GUARDIAN_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

function envFlag(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    return defaultValue;
  }
  return String(raw).trim().toLowerCase() === "true";
}

function envPortalEnabledFlag(name) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    return true;
  }
  return String(raw).trim().toLowerCase() === "true";
}

export function isGuardianPortalEnabled() {
  return envPortalEnabledFlag("GUARDIAN_PORTAL_ENABLED");
}

export function isGuardianPortalUiCopyEnabled() {
  return true;
}

/** School-issued guardian access (created_by_school_id set). */
export function isSchoolLinkedGuardianAccess(accessRow) {
  return Boolean(accessRow?.created_by_school_id);
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 */
export function sendGuardianApiError(res, status, code, message) {
  return res.status(status).json({
    error: {
      code,
      message: message || code,
    },
  });
}

/**
 * @param {import('http').ServerResponse} res
 */
export function rejectIfGuardianPortalDisabled(res) {
  if (isGuardianPortalEnabled()) return false;
  sendGuardianApiError(res, 503, "feature_disabled", "Guardian portal is disabled");
  return true;
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function getGuardianSessionCookie(req) {
  return req?.cookies?.[GUARDIAN_SESSION_COOKIE] || "";
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} token
 * @param {number} maxAgeSeconds
 */
export function setGuardianSessionCookie(res, token, maxAgeSeconds = GUARDIAN_SESSION_MAX_AGE_SECONDS) {
  const secure = isSessionCookieSecure();
  const cookie = [
    `${GUARDIAN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
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
export function clearGuardianSessionCookie(res) {
  const secure = isSessionCookieSecure();
  const cookie = [
    `${GUARDIAN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

function isAccessRowActive(accessRow, nowMs) {
  if (!accessRow) return false;
  if (accessRow.is_active === false || accessRow.revoked_at != null) return false;
  if (accessRow.expires_at) {
    const exp = new Date(accessRow.expires_at).getTime();
    if (Number.isFinite(exp) && exp <= nowMs) return false;
  }
  return true;
}

function isSessionRowActive(sessionRow, nowMs) {
  if (!sessionRow?.id) return false;
  if (sessionRow.revoked_at != null) return false;
  if (sessionRow.expires_at) {
    const exp = new Date(sessionRow.expires_at).getTime();
    if (!Number.isFinite(exp) || exp <= nowMs) return false;
  }
  return true;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} accessId
 */
export async function revokeLiveGuardianSessionsForAccess(serviceRole, accessId) {
  const now = new Date().toISOString();
  const { data, error } = await serviceRole
    .from("student_guardian_sessions")
    .update({ revoked_at: now })
    .eq("guardian_access_id", accessId)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, sessionsRevoked: (data || []).length };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} guardianAccessId
 * @param {{ userAgent?: string|null, ipHash?: string|null, accessExpiresAt?: string|null }} opts
 */
export async function issueGuardianSession(serviceRole, guardianAccessId, opts = {}) {
  await revokeLiveGuardianSessionsForAccess(serviceRole, guardianAccessId);

  const token = generateGuardianSessionToken();
  const tokenHash = hashStudentSecret(token);
  const nowMs = Date.now();

  let sessionExpiresMs = nowMs + GUARDIAN_SESSION_MAX_AGE_SECONDS * 1000;
  if (opts.accessExpiresAt) {
    const accessExp = new Date(opts.accessExpiresAt).getTime();
    if (Number.isFinite(accessExp) && accessExp < sessionExpiresMs) {
      sessionExpiresMs = accessExp;
    }
  }

  const expiresAt = new Date(sessionExpiresMs).toISOString();

  const { data: row, error } = await serviceRole
    .from("student_guardian_sessions")
    .insert({
      guardian_access_id: guardianAccessId,
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

  return { ok: true, token, sessionId: row.id, sessionExpiresAt: row.expires_at };
}

/**
 * @param {import('http').IncomingMessage} req
 */
export async function resolveAuthenticatedGuardian(req) {
  const token = getGuardianSessionCookie(req);
  if (!token) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  const serviceRole = getLearningSupabaseServiceRoleClient();
  const tokenHash = hashStudentSecret(token);
  const nowMs = Date.now();

  const { data: sessionRow, error: sessionErr } = await serviceRole
    .from("student_guardian_sessions")
    .select("id, guardian_access_id, expires_at, revoked_at")
    .eq("session_token_hash", tokenHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionErr) {
    if (isDbSchemaNotReadyError(sessionErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!sessionRow?.id) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  if (sessionRow.revoked_at != null) {
    return { ok: false, status: 401, code: "session_revoked" };
  }

  if (!isSessionRowActive(sessionRow, nowMs)) {
    return { ok: false, status: 401, code: "session_expired" };
  }

  const { data: accessRow, error: accessErr } = await serviceRole
    .from("student_guardian_access")
    .select(
      "id, student_id, created_by_teacher_id, login_username, is_active, revoked_at, expires_at, created_at, must_change_pin, created_by_school_id"
    )
    .eq("id", sessionRow.guardian_access_id)
    .maybeSingle();

  if (accessErr) {
    if (isDbSchemaNotReadyError(accessErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!isAccessRowActive(accessRow, nowMs)) {
    return { ok: false, status: 401, code: "session_revoked" };
  }

  return {
    ok: true,
    serviceRole,
    guardianAccessId: accessRow.id,
    studentId: accessRow.student_id,
    teacherId: accessRow.created_by_teacher_id,
    sessionId: sessionRow.id,
    sessionExpiresAt: sessionRow.expires_at,
    accessRow,
  };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function requireGuardianApiContext(req, res) {
  if (rejectIfGuardianPortalDisabled(res)) {
    return { ok: false, stopped: true };
  }

  const ctx = await resolveAuthenticatedGuardian(req);
  if (!ctx.ok) {
    sendGuardianApiError(res, ctx.status, ctx.code, ctx.code);
    return { ok: false, stopped: true };
  }

  return { ok: true, stopped: false, ...ctx };
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function guardianRequestMeta(req) {
  const ua = String(req.headers["user-agent"] || "").trim();
  const ip =
    typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : String(req.socket?.remoteAddress || "");
  return {
    userAgent: ua.length > 500 ? ua.slice(0, 500) : ua || null,
    ipHash: hashIpForAudit(ip),
  };
}
