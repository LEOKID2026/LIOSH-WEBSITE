/**
 * Visitor identity for coloring upload — HttpOnly cookie + optional auth user.
 */

import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { isSessionCookieSecure } from "../security/session-cookie-secure.js";
import { resolveBearerUser } from "../auth/persona-guard.server.js";
import { getAuthenticatedStudentSession } from "../learning-supabase/student-auth.js";
import { clientIpFromRequest } from "../security/in-memory-rate-limit.js";

export const COLORING_UPLOAD_VISITOR_COOKIE = "leo_coloring_upload_vid";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string|undefined} header
 */
function parseCookies(header) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export function ensureColoringUploadVisitorCookie(req, res) {
  const cookies = parseCookies(req.headers?.cookie);
  let visitorId = cookies[COLORING_UPLOAD_VISITOR_COOKIE];
  if (!visitorId || !UUID_RE.test(visitorId)) {
    visitorId = randomUUID();
    const secure = isSessionCookieSecure() ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `${COLORING_UPLOAD_VISITOR_COOKIE}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; HttpOnly; SameSite=Lax${secure}`
    );
  }
  return visitorId;
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @returns {Promise<{ subjectKey: string, userId: string | null, visitorId: string, ipHash: string }>}
 */
export async function resolveColoringUploadSubject(req, res) {
  const visitorId = ensureColoringUploadVisitorCookie(req, res);
  const ip = clientIpFromRequest(req);
  const ipHash = sha256Hex(ip).slice(0, 32);

  const auth = await resolveBearerUser(req.headers?.authorization || "");
  if (auth.ok && auth.userId) {
    return {
      subjectKey: `user:${auth.userId}`,
      userId: auth.userId,
      visitorId,
      ipHash,
    };
  }

  const studentSession = await getAuthenticatedStudentSession(req);
  if (studentSession?.studentId) {
    return {
      subjectKey: `student:${studentSession.studentId}`,
      userId: studentSession.studentId,
      visitorId,
      ipHash,
    };
  }

  const anonKey = sha256Hex(`${visitorId}:${ipHash}`).slice(0, 40);
  return {
    subjectKey: `anon:${anonKey}`,
    userId: null,
    visitorId,
    ipHash,
  };
}
