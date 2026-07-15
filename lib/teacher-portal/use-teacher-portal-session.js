import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getLearningSupabaseBrowserClient } from "../learning-supabase/client";
import { withTimeout } from "./async-utils.js";
import { teacherAuthFetch } from "./teacher-ui.he.js";

const SESSION_TIMEOUT_MS = 12_000;
/** Shorter JWT probe for portal pages so staff-cookie fallback is not blocked by hung getSession(). */
const PORTAL_JWT_PROBE_MS = 4_000;
const MAX_MANUAL_RETRIES = 3;

/**
 * @param {string} path
 */
async function probeStaffSession(path) {
  try {
    const res = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} [timeoutMs]
 */
export async function resolveTeacherAccessToken(supabase, timeoutMs = SESSION_TIMEOUT_MS) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      "session"
    );

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (
        msg.includes("refresh") ||
        msg.includes("invalid") ||
        msg.includes("expired") ||
        error.status === 401
      ) {
        await supabase.auth.signOut().catch(() => {});
        return { ok: false, code: "stale_session" };
      }
      return { ok: false, code: "session_error", message: error.message };
    }

    const token = data?.session?.access_token;
    if (!token) {
      return { ok: false, code: "no_session" };
    }

    return { ok: true, token, supabase };
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("session_timeout")) {
      await supabase.auth.signOut().catch(() => {});
      return { ok: false, code: "session_timeout" };
    }
    return { ok: false, code: "session_error" };
  }
}

/**
 * Supabase JWT first; falls back to liosh_staff_session cookie via /api/teacher/me.
 * @param {import('@supabase/supabase-js').SupabaseClient} [supabase]
 */
export async function resolveTeacherPortalAuth(supabase) {
  const client = supabase || getLearningSupabaseBrowserClient();
  const [jwt, staffOk] = await Promise.all([
    resolveTeacherAccessToken(client, PORTAL_JWT_PROBE_MS),
    probeStaffSession("/api/teacher/me"),
  ]);
  if (jwt.ok) {
    return { ok: true, token: jwt.token, authMethod: "supabase_jwt", supabase: client };
  }
  if (staffOk) {
    return { ok: true, token: null, authMethod: "staff_cookie", supabase: client };
  }

  return { ok: false, code: jwt.code || "no_session" };
}

/**
 * Supabase JWT first; falls back to staff cookie via /api/school/me.
 * @param {import('@supabase/supabase-js').SupabaseClient} [supabase]
 */
export async function resolveSchoolPortalAuth(supabase) {
  const client = supabase || getLearningSupabaseBrowserClient();
  const [jwt, staffOk] = await Promise.all([
    resolveTeacherAccessToken(client, PORTAL_JWT_PROBE_MS),
    probeStaffSession("/api/school/me"),
  ]);
  if (jwt.ok) {
    return { ok: true, token: jwt.token, authMethod: "supabase_jwt", supabase: client };
  }
  if (staffOk) {
    return { ok: true, token: null, authMethod: "staff_cookie", supabase: client };
  }

  return { ok: false, code: jwt.code || "no_session" };
}

/** Stable validators — use these instead of inline arrows in page components. */
export function isTeacherStudentReportResponse(status, body) {
  return status === 200 && body?.summary != null && typeof body.summary === "object";
}

export function isTeacherClassReportResponse(status, body) {
  return status === 200 && body?.ok === true;
}

/**
 * Shared teacher portal auth + fetch helper for report pages.
 * @param {{
 *   enabled?: boolean,
 *   fetchPath: string,
 *   isValidResponse: (status: number, body: Record<string, unknown>) => boolean,
 *   fetchTimeoutMs?: number,
 * }} options
 */
export function useTeacherPortalLoad({
  enabled = true,
  fetchPath,
  isValidResponse,
  fetchTimeoutMs = 90_000,
}) {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const abortRef = useRef(null);
  const requestGenRef = useRef(0);
  const inFlightPathRef = useRef(null);
  const manualRetryCountRef = useRef(0);

  const enabledRef = useRef(enabled);
  const fetchPathRef = useRef(fetchPath);
  const fetchTimeoutMsRef = useRef(fetchTimeoutMs);
  const isValidResponseRef = useRef(isValidResponse);

  enabledRef.current = enabled;
  fetchPathRef.current = fetchPath;
  fetchTimeoutMsRef.current = fetchTimeoutMs;
  isValidResponseRef.current = isValidResponse;

  const [phase, setPhase] = useState("loading");
  const [loadingHint, setLoadingHint] = useState("מאמת חיבור…");
  const [errorMessage, setErrorMessage] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [data, setData] = useState(null);

  const redirectLogin = useCallback(
    async (message, isStaffCookie = false) => {
      const supabase = supabaseRef.current;
      if (supabase && !isStaffCookie) await supabase.auth.signOut().catch(() => {});
      if (message) setErrorMessage(message);
      router.replace(isStaffCookie ? "/school/staff/login" : "/teacher/login");
    },
    [router]
  );

  const runLoadRef = useRef(null);

  runLoadRef.current = async ({ force = false, isManualRetry = false } = {}) => {
    const path = fetchPathRef.current;
    const isEnabled = enabledRef.current;
    if (!isEnabled || !path) return;

    if (!force && inFlightPathRef.current === path) {
      return;
    }

    if (isManualRetry && manualRetryCountRef.current >= MAX_MANUAL_RETRIES) {
      setPhase("error");
      setErrorMessage("אירעה שגיאה בטעינת הדוח. רענן את הדף ונסה שוב.");
      return;
    }
    if (isManualRetry) {
      manualRetryCountRef.current += 1;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const gen = ++requestGenRef.current;
    inFlightPathRef.current = path;

    setPhase("loading");
    setLoadingHint("מאמת חיבור…");
    setErrorMessage("");

    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    const supabase = supabaseRef.current;

    const isStale = () => gen !== requestGenRef.current || controller.signal.aborted;

    try {
      const session = await resolveTeacherPortalAuth(supabase);
      if (isStale()) return;

      const isStaffCookie = session.authMethod === "staff_cookie";

      if (!session.ok) {
        if (session.code === "stale_session" || session.code === "session_timeout") {
          await redirectLogin("פג תוקף החיבור. יש להתחבר מחדש.", isStaffCookie);
          return;
        }
        await redirectLogin(undefined, isStaffCookie);
        return;
      }

      setAccessToken(session.token);
      setLoadingHint("הדוח נטען - זה עשוי לקחת כמה שניות.");

      const res = await withTimeout(
        teacherAuthFetch(session.token, path, { signal: controller.signal }),
        fetchTimeoutMsRef.current,
        "report_fetch"
      );

      const body = await res.json().catch(() => ({}));
      if (isStale()) return;

      if (res.status === 401) {
        await redirectLogin("פג תוקף החיבור. יש להתחבר מחדש.", isStaffCookie);
        return;
      }
      if (res.status === 403 || res.status === 404) {
        setPhase("forbidden");
        return;
      }

      const validate = isValidResponseRef.current;
      if (!validate?.(res.status, body)) {
        setPhase("error");
        setErrorMessage("אירעה שגיאה בטעינת הדוח. רענן ונסה שוב.");
        return;
      }

      setData(body);
      setPhase("ready");
      manualRetryCountRef.current = 0;
    } catch (e) {
      if (isStale()) return;
      const msg = String(e?.message || "");
      if (msg.includes("report_fetch_timeout")) {
        setPhase("error");
        setErrorMessage("הטעינה ארכה יותר מדי. רענן ונסה שוב.");
        return;
      }
      if (e?.name === "AbortError") {
        return;
      }
      setPhase("error");
      setErrorMessage("אירעה שגיאה בטעינת הדוח. רענן ונסה שוב.");
    } finally {
      if (inFlightPathRef.current === path && gen === requestGenRef.current) {
        inFlightPathRef.current = null;
      }
    }
  };

  const reload = useCallback(() => {
    void runLoadRef.current?.({ force: true, isManualRetry: true });
  }, []);

  useEffect(() => {
    manualRetryCountRef.current = 0;
    if (!enabled || !fetchPath) return;

    void runLoadRef.current?.({ force: true });

    return () => {
      requestGenRef.current += 1;
      abortRef.current?.abort();
      inFlightPathRef.current = null;
    };
  }, [enabled, fetchPath, fetchTimeoutMs]);

  return {
    phase,
    loadingHint,
    errorMessage,
    accessToken,
    data,
    reload,
    supabaseRef,
  };
}
