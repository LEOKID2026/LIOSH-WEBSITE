import { useCallback, useEffect, useState } from "react";
import { schoolAuthFetch, SCHOOL_LOAD_ERROR } from "./school-ui.he.js";

/**
 * @template T
 * @param {string} accessToken
 * @param {string} path
 * @param {(body: unknown) => T} parse
 * @param {boolean} enabled
 */
export function useSchoolDataFetch(accessToken, path, parse, enabled) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await schoolAuthFetch(accessToken, path);
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setError(body?.error?.message || body?.error?.code || SCHOOL_LOAD_ERROR);
        setData(null);
        return;
      }
      setData(parse(body));
    } catch {
      setError(SCHOOL_LOAD_ERROR);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, path, parse]);

  useEffect(() => {
    if (!enabled || !accessToken) return;
    void load();
  }, [enabled, accessToken, load]);

  return { data, loading, error, reload: load };
}
