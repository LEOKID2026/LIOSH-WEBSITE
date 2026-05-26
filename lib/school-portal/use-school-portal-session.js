import { useCallback, useEffect, useState } from "react";
import { getLearningSupabaseBrowserClient } from "../learning-supabase/client.js";
import { resolveTeacherAccessToken } from "../teacher-portal/use-teacher-portal-session.js";
import { schoolAuthFetch } from "./school-ui.he.js";

/**
 * Uses the same Supabase teacher session as /teacher/* — no separate school login.
 */
export function useSchoolPortalLoad() {
  const [state, setState] = useState("loading");
  const [accessToken, setAccessToken] = useState("");
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    const supabase = getLearningSupabaseBrowserClient();
    const session = await resolveTeacherAccessToken(supabase);
    if (!session.ok) {
      setState("unauthenticated");
      return;
    }

    const res = await schoolAuthFetch(session.token, "/api/school/me");
    const body = await res.json().catch(() => ({}));

    if (res.status === 403 && body?.error?.code === "not_a_school_manager") {
      setState("forbidden");
      setError("אין הרשאת מנהל/ת בית ספר");
      return;
    }

    if (res.status !== 200) {
      setState("error");
      setError(body?.error?.message || "שגיאה בטעינה");
      return;
    }

    setAccessToken(session.token);
    setMe(body.data);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, accessToken, me, error, reload: load };
}
