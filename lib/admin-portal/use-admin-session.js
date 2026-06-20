import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getLearningSupabaseBrowserClient } from "../learning-supabase/client";

const SESSION_TIMEOUT_MS = 12_000;

/** @param {import('@supabase/supabase-js').User|null|undefined} user */
export function isAdminAppMetadataUser(user) {
  const role = user?.app_metadata?.role;
  return String(role || "").toLowerCase() === "admin";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function resolveAdminAccessToken(supabase) {
  const { data, error } = await Promise.race([
    supabase.auth.getSession(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("session_timeout")), SESSION_TIMEOUT_MS)
    ),
  ]).catch((e) => ({ data: null, error: e }));

  if (error) {
    return { ok: false, code: "session_error" };
  }

  const token = data?.session?.access_token;
  if (!token) {
    return { ok: false, code: "no_session" };
  }

  const role = data?.session?.user?.app_metadata?.role;
  if (!isAdminAppMetadataUser(data?.session?.user)) {
    return { ok: false, code: "not_an_admin" };
  }

  return { ok: true, token, supabase };
}

/**
 * @param {string} token
 * @param {string} path
 * @param {RequestInit} [init]
 */
export async function adminAuthFetch(token, path, init = {}) {
  const headers = {
    ...(init.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
}

/**
 * @param {{ redirectTo?: string }} [options]
 */
export function useAdminSession(options = {}) {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [state, setState] = useState("loading");
  const [accessToken, setAccessToken] = useState(null);

  const redirectTo = options.redirectTo || "/teacher/login";

  const refresh = useCallback(async () => {
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    const session = await resolveAdminAccessToken(supabaseRef.current);
    if (!session.ok) {
      setState("unauthenticated");
      setAccessToken(null);
      return null;
    }
    setAccessToken(session.token);
    setState("ready");
    return session.token;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = await refresh();
      if (!mounted) return;
      if (!token) {
        router.replace(redirectTo);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh, router, redirectTo]);

  return { state, accessToken, refresh };
}

/** Clear Supabase browser session (admin uses same client as teacher login). */
export async function adminSignOut() {
  const supabase = getLearningSupabaseBrowserClient();
  await supabase.auth.signOut().catch(() => {});
}

/**
 * @param {{ redirectTo?: string }} [options]
 */
export function useAdminLogout(options = {}) {
  const router = useRouter();
  const redirectTo = options.redirectTo || "/teacher/login";
  const [busy, setBusy] = useState(false);

  const logout = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await adminSignOut();
      await router.replace(redirectTo);
    } finally {
      setBusy(false);
    }
  }, [busy, router, redirectTo]);

  return { logout, busy };
}
