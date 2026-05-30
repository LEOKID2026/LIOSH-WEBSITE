import { useCallback, useEffect, useRef, useState } from "react";
import { getLearningSupabaseBrowserClient } from "../learning-supabase/client.js";
import { resolveSchoolPortalAuth } from "../teacher-portal/use-teacher-portal-session.js";
import { schoolAuthFetch } from "./school-ui.he.js";
import {
  fetchSchoolJsonSWR,
  isSchoolCacheFresh,
  readSchoolCache,
  readSharedMeSession,
  SCHOOL_CACHE_TTL_MS,
  writeSharedMeSession,
} from "./school-portal-cache.js";
import { isSchoolPortalListCacheEnabled } from "./school-portal-cache-flags.js";

/**
 * Uses the same Supabase teacher session as /teacher/* — no separate school login.
 */
export function useSchoolPortalLoad() {
  const initialShared = readSharedMeSession();
  const [state, setState] = useState(initialShared ? "ready" : "loading");
  const [accessToken, setAccessToken] = useState(initialShared?.accessToken || "");
  const [authMethod, setAuthMethod] = useState(initialShared?.authMethod || "supabase_jwt");
  const [me, setMe] = useState(initialShared?.data || null);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const loadStartedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async ({ force = false } = {}) => {
    setError("");
    const supabase = getLearningSupabaseBrowserClient();
    const session = await resolveSchoolPortalAuth(supabase);
    if (!session.ok) {
      if (mountedRef.current) setState("unauthenticated");
      return;
    }

    const token = session.token || "";
    const method = session.authMethod || "supabase_jwt";
    const listCacheOn = isSchoolPortalListCacheEnabled();
    const cachedSession = readSharedMeSession();
    const schoolId = cachedSession?.data?.school?.schoolId;
    const cachedMe = schoolId ? readSchoolCache(schoolId, "/api/school/me") : null;
    const hasFreshCache =
      listCacheOn && !force && cachedMe && isSchoolCacheFresh(cachedMe, SCHOOL_CACHE_TTL_MS.me);

    if (hasFreshCache && cachedMe.data?.data) {
      if (mountedRef.current) {
        setAccessToken(token);
        setAuthMethod(method);
        setMe(cachedMe.data.data);
        setState("ready");
        writeSharedMeSession(token, cachedMe.data.data);
      }
      return;
    }

    if (!force && cachedSession?.data && mountedRef.current) {
      setAccessToken(token);
      setAuthMethod(method);
      setMe(cachedSession.data);
      setState("ready");
    } else if (!cachedSession?.data && mountedRef.current) {
      setState("loading");
    }

    let status = 0;
    let body = {};

    if (listCacheOn) {
      const result = await fetchSchoolJsonSWR({
        accessToken: token,
        schoolId,
        path: "/api/school/me",
        ttlMs: SCHOOL_CACHE_TTL_MS.me,
        force,
        fetchFn: schoolAuthFetch,
      });
      if (!result) return;
      status = result.status;
      body = result.body || {};
    } else {
      const res = await schoolAuthFetch(token, "/api/school/me");
      status = res.status;
      body = await res.json().catch(() => ({}));
    }

    if (!mountedRef.current) return;

    if (status === 403 && body?.error?.code === "not_school_portal_member") {
      setState("forbidden");
      setError("אין הרשאת פורטל בית ספר");
      return;
    }

    if (status === 403 && body?.error?.code === "not_a_school_manager") {
      setState("forbidden");
      setError("אין הרשאת מנהל/ת בית ספר");
      return;
    }

    if (
      status === 403 &&
      (body?.error?.code === "entitlement_pending" ||
        body?.error?.code === "entitlement_rejected" ||
        body?.error?.code === "school_inactive")
    ) {
      setState("pending");
      setError("");
      return;
    }

    if (status !== 200) {
      if (!cachedSession?.data) {
        setState("error");
        setError(body?.error?.message || "שגיאה בטעינה");
      }
      return;
    }

    setAccessToken(token);
    setAuthMethod(method);
    setMe(body.data);
    writeSharedMeSession(token, body.data);
    setState("ready");
  }, []);

  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    void load({ force: !initialShared });
  }, [initialShared, load]);

  return {
    state,
    accessToken,
    authMethod,
    me,
    error,
    schoolId: me?.school?.schoolId || null,
    reload: () => load({ force: true }),
  };
}
