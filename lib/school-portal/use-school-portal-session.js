import { useCallback, useEffect, useRef, useState } from "react";
import { getLearningSupabaseBrowserClient } from "../learning-supabase/client.js";
import { resolveTeacherAccessToken } from "../teacher-portal/use-teacher-portal-session.js";
import { schoolAuthFetch } from "./school-ui.he.js";
import {
  fetchSchoolJsonSWR,
  isSchoolCacheFresh,
  readSchoolCache,
  readSharedMeSession,
  SCHOOL_CACHE_TTL_MS,
  writeSharedMeSession,
} from "./school-portal-cache.js";

/**
 * Uses the same Supabase teacher session as /teacher/* — no separate school login.
 */
export function useSchoolPortalLoad() {
  const initialShared = readSharedMeSession();
  const [state, setState] = useState(initialShared ? "ready" : "loading");
  const [accessToken, setAccessToken] = useState(initialShared?.accessToken || "");
  const [me, setMe] = useState(initialShared?.data || null);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async ({ force = false } = {}) => {
    setError("");
    const supabase = getLearningSupabaseBrowserClient();
    const session = await resolveTeacherAccessToken(supabase);
    if (!session.ok) {
      if (mountedRef.current) setState("unauthenticated");
      return;
    }

    const cachedSession = readSharedMeSession();
    const schoolId = cachedSession?.data?.school?.schoolId || me?.school?.schoolId;
    const cachedMe = readSchoolCache(schoolId, "/api/school/me");
    const hasFreshCache = !force && cachedMe && isSchoolCacheFresh(cachedMe, SCHOOL_CACHE_TTL_MS.me);

    if (hasFreshCache && cachedMe.data?.data) {
      if (mountedRef.current) {
        setAccessToken(session.token);
        setMe(cachedMe.data.data);
        setState("ready");
        writeSharedMeSession(session.token, cachedMe.data.data);
      }
      return;
    }

    if (!force && cachedSession?.data && mountedRef.current) {
      setAccessToken(session.token);
      setMe(cachedSession.data);
      setState("ready");
    } else if (!cachedSession?.data && mountedRef.current) {
      setState("loading");
    }

    const result = await fetchSchoolJsonSWR({
      accessToken: session.token,
      schoolId,
      path: "/api/school/me",
      ttlMs: SCHOOL_CACHE_TTL_MS.me,
      force: true,
      fetchFn: schoolAuthFetch,
    });

    if (!mountedRef.current || !result) return;

    const body = result.body || {};

    if (result.status === 403 && body?.error?.code === "not_a_school_manager") {
      setState("forbidden");
      setError("אין הרשאת מנהל/ת בית ספר");
      return;
    }

    if (result.status !== 200) {
      if (!cachedSession?.data) {
        setState("error");
        setError(body?.error?.message || "שגיאה בטעינה");
      }
      return;
    }

    setAccessToken(session.token);
    setMe(body.data);
    writeSharedMeSession(session.token, body.data);
    setState("ready");
  }, [me?.school?.schoolId]);

  useEffect(() => {
    void load({ force: !initialShared });
  }, [initialShared, load]);

  return {
    state,
    accessToken,
    me,
    error,
    schoolId: me?.school?.schoolId || null,
    reload: () => load({ force: true }),
  };
}
