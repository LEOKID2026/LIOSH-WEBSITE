export const PARENT_DEMO_SESSION_STORAGE_KEY = "leokids_parent_demo_session";
export const PARENT_DEMO_SESSION_VERSION = 1;
export const PARENT_DEMO_SYNTHETIC_BEARER = "demo-parent-portal";

/** @typedef {{ v: number, enteredAt: string, mode: "parent_portal" }} ParentDemoSession */

/** @returns {ParentDemoSession | null} */
export function readParentDemoSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PARENT_DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== PARENT_DEMO_SESSION_VERSION) return null;
    if (parsed.mode !== "parent_portal") return null;
    if (typeof parsed.enteredAt !== "string" || !parsed.enteredAt) return null;
    return {
      v: PARENT_DEMO_SESSION_VERSION,
      enteredAt: parsed.enteredAt,
      mode: "parent_portal",
    };
  } catch {
    return null;
  }
}

/** @param {ParentDemoSession} session */
export function writeParentDemoSession(session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PARENT_DEMO_SESSION_STORAGE_KEY,
    JSON.stringify({
      v: PARENT_DEMO_SESSION_VERSION,
      enteredAt: session.enteredAt,
      mode: "parent_portal",
    }),
  );
}

export function clearParentDemoSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PARENT_DEMO_SESSION_STORAGE_KEY);
}

export function hasParentDemoSession() {
  return readParentDemoSession() != null;
}

export function isParentDemoMode() {
  return hasParentDemoSession();
}

export function createParentDemoSession() {
  const session = {
    v: PARENT_DEMO_SESSION_VERSION,
    enteredAt: new Date().toISOString(),
    mode: /** @type {const} */ ("parent_portal"),
  };
  writeParentDemoSession(session);
  return session;
}

/** Synthetic session for dashboard/report pages — no Supabase auth. */
export function buildParentDemoSyntheticAuthSession() {
  return {
    account_kind: "demo",
    access_token: PARENT_DEMO_SYNTHETIC_BEARER,
    user: { email: "demo-parent@leokids.local" },
  };
}

/**
 * @param {string} pathname
 */
export function isHomeParentDemoButtonExcluded(pathname) {
  const p = pathname || "";
  if (p.startsWith("/demo/parent")) return true;
  if (p.startsWith("/parent/") && p !== "/parent/login" && p !== "/parent/install-app") {
    return true;
  }
  return false;
}

/**
 * Hide both demo CTAs on parent demo portal pages (except enter).
 * @param {string} pathname
 */
export function isPublicDemoButtonsExcluded(pathname) {
  const p = pathname || "";
  if (p.startsWith("/demo/parent")) return true;
  if (hasParentDemoSession() && p.startsWith("/parent/") && p !== "/parent/login") {
    return true;
  }
  return false;
}
