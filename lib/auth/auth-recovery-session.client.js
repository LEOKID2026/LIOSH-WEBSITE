const RECOVERY_FLAG = "liosh_password_recovery_active";

export function parseRecoveryUrl(search = "", hash = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const code = params.get("code");
  const hashBody = hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hashBody);
  const hashType = hashParams.get("type");
  const hasRecoveryHash =
    hash.includes("type=recovery") ||
    hashType === "recovery" ||
    (hash.includes("access_token") && hash.includes("type=recovery"));
  const isRecoveryLink = Boolean(code) || hasRecoveryHash;
  return { code, isRecoveryLink, hasRecoveryHash, hashParams };
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
  if (window.location.hash) {
    window.history.replaceState({}, document.title, nextPath);
  } else if (router?.replace) {
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
    };
  }

  const { code, isRecoveryLink, hasRecoveryHash } = parseRecoveryUrl(
    window.location.search,
    window.location.hash
  );

  if (code) {
    await clearLocalSessionIfPresent(supabase);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return {
        ok: false,
        reason: "pkce_exchange_failed",
        session: null,
        error,
        recoverySession: false,
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
    };
  }

  if (hasRecoveryHash) {
    const tokens = parseHashTokens(window.location.hash);
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
      };
    }
  }

  if (!isRecoveryLink && isRecoveryActive()) {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session) {
      return {
        ok: true,
        reason: "stored_recovery_session",
        session: data.session,
        error,
        recoverySession: true,
      };
    }
    clearRecoveryActive();
  }

  if (!isRecoveryLink && !isRecoveryActive()) {
    return {
      ok: false,
      reason: "no_recovery_link",
      session: null,
      error: null,
      recoverySession: false,
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (data?.session) {
    markRecoveryActive();
    return {
      ok: true,
      reason: "existing_session",
      session: data.session,
      error,
      recoverySession: true,
    };
  }

  return {
    ok: false,
    reason: "no_session",
    session: null,
    error,
    recoverySession: false,
  };
}
