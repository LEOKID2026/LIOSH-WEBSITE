const RECOVERY_FLAG = "liosh_password_recovery_active";

export function describeRecoveryUrlParams(search = "", hash = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashBody = hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hashBody);
  return {
    hasCode: params.has("code"),
    hasTokenHash: params.has("token_hash"),
    queryType: params.get("type"),
    hasHashFragment: Boolean(hashBody),
    hashType: hashParams.get("type"),
    hasHashAccessToken: hashParams.has("access_token"),
    hasHashRefreshToken: hashParams.has("refresh_token"),
    isRecoveryQuery: params.get("type") === "recovery",
    isRecoveryHash:
      hashParams.get("type") === "recovery" ||
      hash.includes("type=recovery") ||
      (hashParams.has("access_token") && hashParams.get("type") === "recovery"),
  };
}

export function parseRecoveryUrl(search = "", hash = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const recoveryType = params.get("type");
  const hashBody = hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hashBody);
  const hashType = hashParams.get("type");
  const hasRecoveryHash =
    hash.includes("type=recovery") ||
    hashType === "recovery" ||
    (hash.includes("access_token") && hash.includes("type=recovery"));
  const isRecoveryLink = Boolean(code || tokenHash || hasRecoveryHash);
  return {
    code,
    tokenHash,
    recoveryType,
    isRecoveryLink,
    hasRecoveryHash,
    hashParams,
  };
}

export function parseHashTokens(hash = "") {
  const hashBody = hash.replace(/^#/, "");
  if (!hashBody) return null;
  const params = new URLSearchParams(hashBody);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return {
    access_token,
    refresh_token,
    type: params.get("type"),
  };
}

export function hasStoredPkceCodeVerifier() {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.endsWith("-code-verifier") && window.localStorage.getItem(key)) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function markRecoveryActive() {
  try {
    sessionStorage.setItem(RECOVERY_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function isRecoveryActive() {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG) === "1";
  } catch {
    return false;
  }
}

export function clearRecoveryActive() {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {
    /* ignore */
  }
}

function waitForRecoveryAuthEvent(supabase, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let settled = false;
    let sub = null;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub?.unsubscribe();
      resolve(payload);
    };

    const timer = setTimeout(() => {
      finish({ event: "TIMEOUT", session: null, recoverySession: false });
    }, timeoutMs);

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        finish({ event, session, recoverySession: true });
        return;
      }
      if (event === "SIGNED_IN" && session) {
        finish({ event, session, recoverySession: true });
      }
    });
    sub = data.subscription;
  });
}

async function clearLocalSessionIfPresent(supabase) {
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    await supabase.auth.signOut({ scope: "local" });
  }
}

function stripRecoveryParamsFromUrl(router) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const portal = params.get("portal") === "teacher" ? "teacher" : "parent";
  const nextPath = `/auth/reset-password?portal=${portal}`;
  if (router?.replace) {
    router.replace(nextPath, undefined, { shallow: true });
  } else {
    window.history.replaceState({}, document.title, nextPath);
  }
}

export async function establishRecoverySession(supabase, router) {
  if (typeof window === "undefined") {
    return {
      ok: false,
      reason: "ssr",
      session: null,
      error: null,
      recoverySession: false,
      urlInfo: null,
    };
  }

  const search = window.location.search;
  const hash = window.location.hash;
  const urlInfo = describeRecoveryUrlParams(search, hash);
  const { code, tokenHash, recoveryType, isRecoveryLink, hasRecoveryHash } = parseRecoveryUrl(
    search,
    hash
  );

  if (tokenHash && recoveryType === "recovery") {
    await clearLocalSessionIfPresent(supabase);
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return {
        ok: false,
        reason: "token_hash_verify_failed",
        session: null,
        error,
        recoverySession: false,
        urlInfo,
      };
    }
    markRecoveryActive();
    stripRecoveryParamsFromUrl(router);
    return {
      ok: Boolean(data?.session),
      reason: "token_hash_verify",
      session: data?.session ?? null,
      error: null,
      recoverySession: true,
      urlInfo,
    };
  }

  if (hasRecoveryHash) {
    const tokens = parseHashTokens(hash);
    if (tokens) {
      await clearLocalSessionIfPresent(supabase);
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) {
        return {
          ok: false,
          reason: "hash_set_session_failed",
          session: null,
          error,
          recoverySession: false,
          urlInfo,
        };
      }
      markRecoveryActive();
      stripRecoveryParamsFromUrl(router);
      return {
        ok: Boolean(data?.session),
        reason: "hash_set_session",
        session: data?.session ?? null,
        error: null,
        recoverySession: true,
        urlInfo,
      };
    }

    const eventResult = await waitForRecoveryAuthEvent(supabase);
    if (eventResult.session) {
      markRecoveryActive();
      stripRecoveryParamsFromUrl(router);
      return {
        ok: true,
        reason: "hash_event",
        session: eventResult.session,
        error: null,
        recoverySession: eventResult.recoverySession,
        urlInfo,
      };
    }
  }

  if (code && hasStoredPkceCodeVerifier()) {
    await clearLocalSessionIfPresent(supabase);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return {
        ok: false,
        reason: "pkce_exchange_failed",
        session: null,
        error,
        recoverySession: false,
        urlInfo,
      };
    }
    markRecoveryActive();
    stripRecoveryParamsFromUrl(router);
    return {
      ok: Boolean(data?.session),
      reason: "pkce_exchange",
      session: data?.session ?? null,
      error: null,
      recoverySession: true,
      urlInfo,
    };
  }

  if (isRecoveryLink) {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session) {
      markRecoveryActive();
      stripRecoveryParamsFromUrl(router);
      return {
        ok: true,
        reason: "existing_session",
        session: data.session,
        error,
        recoverySession: true,
        urlInfo,
      };
    }

    if (code && !hasStoredPkceCodeVerifier()) {
      return {
        ok: false,
        reason: "pkce_verifier_missing",
        session: null,
        error: {
          message: "Auth code present without PKCE code verifier in this browser profile",
          status: null,
          name: "AuthPKCECodeVerifierMissingError",
        },
        recoverySession: false,
        urlInfo,
      };
    }

    return {
      ok: false,
      reason: "no_session",
      session: null,
      error,
      recoverySession: false,
      urlInfo,
    };
  }

  if (isRecoveryActive()) {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session) {
      return {
        ok: true,
        reason: "stored_recovery_session",
        session: data.session,
        error,
        recoverySession: true,
        urlInfo,
      };
    }
    clearRecoveryActive();
  }

  return {
    ok: false,
    reason: "no_recovery_link",
    session: null,
    error: null,
    recoverySession: false,
    urlInfo,
  };
}
