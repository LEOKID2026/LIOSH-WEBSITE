/**
 * Server-side platform admin resolution for page requests (getServerSideProps).
 * Reuses the same JWT + app_metadata.role check as admin API routes.
 *
 * Note: browser Supabase sessions are stored in localStorage by default, so page
 * navigations usually carry no Bearer/cookie token. Callers must not rely on this
 * alone to gate SSR props — prefer empty props + client admin gate + token APIs.
 */

import { resolveAuthenticatedAdminUserId } from "./admin-request.server.js";

function readCookieFromHeader(cookieHeader, name) {
  if (!cookieHeader || typeof cookieHeader !== "string") return null;
  for (const part of cookieHeader.split(";")) {
    const p = part.trim();
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    const k = p.slice(0, eq).trim();
    if (k !== name) continue;
    const v = p.slice(eq + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

function supabaseAuthCookieNames() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  if (!match?.[1]) return [];
  return [`sb-${match[1]}-auth-token`];
}

/**
 * @param {string | undefined} raw
 * @returns {string | null}
 */
function extractAccessTokenFromSupabaseCookieRaw(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0]) {
      return parsed[0];
    }
    if (parsed && typeof parsed === "object" && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    /* not JSON — ignore */
  }
  return null;
}

/**
 * @param {import('http').IncomingMessage | undefined} req
 */
export async function resolveAdminFromPageRequest(req) {
  const authHeader = req?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.trim().startsWith("Bearer ")) {
    return resolveAuthenticatedAdminUserId(authHeader);
  }

  const cookieHeader = req?.headers?.cookie;
  for (const name of supabaseAuthCookieNames()) {
    const raw = readCookieFromHeader(cookieHeader, name);
    const accessToken = extractAccessTokenFromSupabaseCookieRaw(raw);
    if (accessToken) {
      return resolveAuthenticatedAdminUserId(`Bearer ${accessToken}`);
    }
  }

  return { ok: false, status: 401, code: "not_authenticated", message: "Missing admin session" };
}

/** Safe empty props for engine-review — no report JSON in __NEXT_DATA__. */
export function emptyEngineReviewPageProps() {
  return {
    packMeta: null,
    engineFinal: null,
    profVal: null,
    hasPack: false,
    ssrDeployment: {
      nodeEnv: process.env.NODE_ENV || null,
      vercel: Boolean(process.env.VERCEL || process.env.VERCEL_ENV),
    },
  };
}
