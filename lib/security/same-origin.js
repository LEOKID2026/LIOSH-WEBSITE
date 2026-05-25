/**
 * Same-origin guard for cookie-authenticated mutating API requests.
 * Skipped outside production so localhost/dev keep working.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Teacher/parent APIs use Authorization: Bearer — not cookie session CSRF.
 * @param {import('http').IncomingMessage} req
 */
function usesBearerAuthorization(req) {
  const auth = String(req.headers?.authorization || "").trim();
  return /^Bearer\s+\S+/i.test(auth);
}

function requestHost(req) {
  const host = String(req.headers?.host || "").trim().toLowerCase();
  return host || null;
}

function allowedOriginForRequest(req) {
  const host = requestHost(req);
  if (!host) return null;
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

function originMatchesAllowed(origin, allowed) {
  if (!origin || !allowed) return false;
  return String(origin).trim().toLowerCase() === allowed.toLowerCase();
}

function refererMatchesAllowed(referer, allowed) {
  if (!referer || !allowed) return false;
  const ref = String(referer).trim();
  const base = allowed.toLowerCase();
  const refLower = ref.toLowerCase();
  return refLower === base || refLower.startsWith(`${base}/`);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
export function isSameOriginBrowserMutation(req) {
  if (process.env.NODE_ENV !== "production") return true;
  const method = String(req.method || "GET").toUpperCase();
  if (!MUTATING_METHODS.has(method)) return true;

  const allowed = allowedOriginForRequest(req);
  if (!allowed) return false;

  const origin = req.headers?.origin;
  if (originMatchesAllowed(origin, allowed)) return true;

  const referer = req.headers?.referer || req.headers?.referrer;
  if (refererMatchesAllowed(referer, allowed)) return true;

  return false;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean} true when rejected (caller should return)
 */
export function rejectIfCrossOriginCookieMutation(req, res) {
  if (usesBearerAuthorization(req)) return false;
  if (isSameOriginBrowserMutation(req)) return false;
  res.status(403).json({ ok: false, error: "Forbidden", code: "cross_origin" });
  return true;
}
