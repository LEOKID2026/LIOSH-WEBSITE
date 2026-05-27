import { useCallback, useEffect, useState } from "react";
import { schoolAuthFetch, SCHOOL_LOAD_ERROR, apiErrorMessageHe } from "./school-ui.he.js";
import {
  fetchSchoolJsonSWR,
  readSchoolCache,
  SCHOOL_CACHE_TTL_MS,
} from "./school-portal-cache.js";
import { isSchoolPortalListCacheEnabled } from "./school-portal-cache-flags.js";

/**
 * @template T
 * @param {string} accessToken
 * @param {string|null|undefined} schoolId
 * @param {string} path
 * @param {(body: unknown) => T} parse
 * @param {boolean} enabled
 * @param {{ ttlMs?: number, cacheKind?: keyof typeof SCHOOL_CACHE_TTL_MS }} [options]
 */
export function useSchoolDataFetch(accessToken, schoolId, path, parse, enabled, options = {}) {
  const ttlMs = options.ttlMs ?? SCHOOL_CACHE_TTL_MS[options.cacheKind || "list"] ?? SCHOOL_CACHE_TTL_MS.list;
  const cachedEntry = schoolId ? readSchoolCache(schoolId, path) : null;
  const initialData = cachedEntry ? parse(cachedEntry.data) : null;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!accessToken) return;
      const hasInitial = Boolean(initialData);
      if (!force && !hasInitial) setLoading(true);
      setError("");
      try {
        if (!isSchoolPortalListCacheEnabled()) {
          const res = await schoolAuthFetch(accessToken, path);
          const body = await res.json().catch(() => ({}));
          if (res.status !== 200) {
            setError(apiErrorMessageHe(body?.error, SCHOOL_LOAD_ERROR));
            if (!hasInitial) setData(null);
            return;
          }
          setData(parse(body));
          return;
        }

        const result = await fetchSchoolJsonSWR({
          accessToken,
          schoolId,
          path,
          ttlMs,
          force,
          fetchFn: schoolAuthFetch,
          onUpdate: (updated) => {
            if (updated.status === 200) {
              setData(parse(updated.body));
              setLoading(false);
            }
          },
        });
        if (!result) return;
        if (result.status !== 200) {
          const body = result.body || {};
          setError(apiErrorMessageHe(body?.error, SCHOOL_LOAD_ERROR));
          if (!result.fromCache) setData(null);
          return;
        }
        setData(parse(result.body));
      } catch {
        setError(SCHOOL_LOAD_ERROR);
        if (!hasInitial) setData(null);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, schoolId, path, parse, ttlMs, initialData]
  );

  useEffect(() => {
    if (!enabled || !accessToken) return;
    void load({ force: false });
  }, [enabled, accessToken, load]);

  return { data, loading, error, reload: () => load({ force: true }) };
}
