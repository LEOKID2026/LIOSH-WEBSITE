import { hasStoredPkceCodeVerifier, parseHashTokens } from "./auth-recovery-session.client.js";
import { trackProductEvent } from "../analytics/track-event.client.js";

export const PARENT_OAUTH_FLOW_FLAG = "liosh_parent_google_oauth";

export const PARENT_GOOGLE_CALLBACK_PATH = "/parent/auth/google-callback";

export const PARENT_GOOGLE_HOME_PATH = "/parent/dashboard";

export const PARENT_GOOGLE_GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

/** Existing public env name for the Google Web Client ID (GIS). */
export const PARENT_GOOGLE_CLIENT_ID_ENV = "NEXT_PUBLIC_GOOGLE_CLIENT_ID";

/** @returns {string} */
export function getParentGoogleClientId() {
  return String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
}

/** @returns {string} */
export function getParentGoogleOAuthRedirectUrl() {
  if (typeof window === "undefined") return PARENT_GOOGLE_CALLBACK_PATH;
  return `${window.location.origin}${PARENT_GOOGLE_CALLBACK_PATH}`;
}

export function markParentGoogleOAuthFlow() {
  try {
    sessionStorage.setItem(PARENT_OAUTH_FLOW_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function clearParentGoogleOAuthFlow() {
  try {
    sessionStorage.removeItem(PARENT_OAUTH_FLOW_FLAG);
  } catch {
    /* ignore */
  }
}

export function isParentGoogleOAuthFlow() {
  try {
    return sessionStorage.getItem(PARENT_OAUTH_FLOW_FLAG) === "1";
  } catch {
    return false;
  }
}

function stripOAuthParamsFromUrl(router) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  const nextHash = url.hash.includes("access_token") ? "" : url.hash;
  const next = `${url.pathname}${url.search}${nextHash}`;
  router.replace(next, undefined, { shallow: true });
}

/**
 * Exchange OAuth redirect params for a Supabase session (PKCE or hash tokens).
 * Kept for google-callback compatibility; the new GIS button does not use this.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {import("next/router").NextRouter} router
 */
export async function establishParentGoogleOAuthSession(supabase, router) {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const code = params.get("code");
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");

  if (oauthError) {
    return {
      ok: false,
      reason: "oauth_provider_error",
      session: null,
      error: { message: oauthErrorDescription || oauthError },
    };
  }

  const hashTokens = parseHashTokens(hash);
  if (hashTokens?.access_token && hashTokens?.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: hashTokens.access_token,
      refresh_token: hashTokens.refresh_token,
    });
    stripOAuthParamsFromUrl(router);
    return {
      ok: Boolean(data?.session),
      reason: "hash_set_session",
      session: data?.session ?? null,
      error: error || null,
    };
  }

  if (code && hasStoredPkceCodeVerifier()) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    stripOAuthParamsFromUrl(router);
    return {
      ok: Boolean(data?.session),
      reason: "pkce_exchange",
      session: data?.session ?? null,
      error: error || null,
    };
  }

  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    stripOAuthParamsFromUrl(router);
    return {
      ok: true,
      reason: "existing_session",
      session: data.session,
      error: null,
    };
  }

  return {
    ok: false,
    reason: code ? "pkce_verifier_missing" : "no_oauth_callback",
    session: null,
    error: null,
  };
}

/**
 * Legacy OAuth redirect flow (kept for google-callback compatibility).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function startParentGoogleSignIn(supabase) {
  markParentGoogleOAuthFlow();
  const redirectTo = getParentGoogleOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    clearParentGoogleOAuthFlow();
    throw error;
  }

  if (data?.url) {
    window.location.assign(data.url);
  }
}

/**
 * Secure nonce pair for Google Identity Services + Supabase signInWithIdToken.
 * Pass hashedNonce to Google; pass raw nonce to Supabase. Never log either value.
 * @returns {Promise<{ nonce: string, hashedNonce: string }>}
 */
export async function createParentGoogleNoncePair() {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { nonce, hashedNonce };
}

/**
 * Load the official Google Identity Services client script once.
 * @returns {Promise<void>}
 */
export function loadParentGoogleGsiClient() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("gsi_unavailable"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-parent-gsi="1"]');
    if (existing) {
      const onLoad = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
        if (window.google?.accounts?.id) resolve();
        else reject(new Error("gsi_load_failed"));
      };
      const onError = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
        reject(new Error("gsi_load_failed"));
      };
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return;
    }

    const script = document.createElement("script");
    script.src = PARENT_GOOGLE_GSI_SCRIPT_URL;
    script.async = true;
    script.dataset.parentGsi = "1";
    script.onload = () => {
      if (window.google?.accounts?.id) resolve();
      else reject(new Error("gsi_load_failed"));
    };
    script.onerror = () => reject(new Error("gsi_load_failed"));
    document.head.appendChild(script);
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} credential
 * @param {string} [nonce]
 */
export async function signInParentWithGoogleIdToken(supabase, credential, nonce) {
  const token = String(credential || "").trim();
  if (!token) {
    return {
      ok: false,
      session: null,
      error: { message: "missing_google_credential" },
    };
  }

  const payload = {
    provider: "google",
    token,
  };
  if (nonce) {
    payload.nonce = nonce;
  }

  const { data, error } = await supabase.auth.signInWithIdToken(payload);
  return {
    ok: Boolean(data?.session?.access_token) && !error,
    session: data?.session ?? null,
    error: error || null,
  };
}

/**
 * @param {string} accessToken
 * @param {"google" | "signup" | "login"} flow
 */
export async function postParentSessionReady(accessToken, flow) {
  let res;
  try {
    res = await fetch("/api/parent/session/ready", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ flow }),
    });
  } catch {
    return { ok: false, messageHe: "בעיית תקשורת. בדקו את החיבור לאינטרנט ונסו שוב." };
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    return { ok: false, messageHe: "שגיאה בשרת. נסו שוב בעוד רגע." };
  }

  if (!res.ok || !payload?.ok) {
    return {
      ok: false,
      messageHe:
        typeof payload?.messageHe === "string"
          ? payload.messageHe
          : "לא ניתן להשלים את ההתחברות. נסו שוב.",
    };
  }

  return { ok: true, payload };
}

/**
 * Shared parent-account completion after a Google session exists
 * (GIS id-token path and legacy google-callback path).
 * @param {{ access_token?: string } | null | undefined} session
 */
export async function completeParentGoogleSession(session) {
  const accessToken = String(session?.access_token || "").trim();
  if (!accessToken) {
    return {
      ok: false,
      messageHe: "לא הצלחנו להשלים התחברות עם Google. נסו שוב או התחברו עם אימייל וסיסמה.",
      redirectTo: null,
    };
  }

  const ready = await postParentSessionReady(accessToken, "google");
  if (!ready.ok) {
    return {
      ok: false,
      messageHe:
        ready.messageHe ||
        "לא הצלחנו להשלים התחברות עם Google. נסו שוב או התחברו עם אימייל וסיסמה.",
      redirectTo: null,
    };
  }

  void trackProductEvent({
    eventName: "parent_login",
    actorType: "parent",
    idempotencyKey: `parent_google_login:${Date.now()}`,
  });

  return { ok: true, redirectTo: PARENT_GOOGLE_HOME_PATH, payload: ready.payload };
}
