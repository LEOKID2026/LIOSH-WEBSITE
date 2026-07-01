import { hasStoredPkceCodeVerifier, parseHashTokens } from "./auth-recovery-session.client.js";

export const PARENT_OAUTH_FLOW_FLAG = "liosh_parent_google_oauth";

export const PARENT_GOOGLE_CALLBACK_PATH = "/parent/auth/google-callback";

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
