import { schoolAuthFetch } from "./school-ui.he.js";
import {
  fetchSchoolJsonSWR,
  isSchoolCacheFresh,
  readSchoolCache,
  SCHOOL_CACHE_TTL_MS,
} from "./school-portal-cache.js";

/**
 * Load a school report API with session cache (stale-while-revalidate).
 * @param {{
 *   accessToken: string,
 *   schoolId?: string|null,
 *   path: string,
 *   force?: boolean,
 *   onCached?: (body: unknown) => void,
 *   onUpdated?: (body: unknown) => void,
 * }} options
 */
export async function fetchSchoolReportCached(options) {
  const { accessToken, schoolId, path, force = false, onCached, onUpdated } = options;
  const cached = readSchoolCache(schoolId, path);

  if (!force && cached) {
    const body = cached.data;
    if (onCached) onCached(body);
    if (!isSchoolCacheFresh(cached, SCHOOL_CACHE_TTL_MS.report)) {
      void fetchSchoolJsonSWR({
        accessToken,
        schoolId,
        path,
        ttlMs: SCHOOL_CACHE_TTL_MS.report,
        force: true,
        fetchFn: schoolAuthFetch,
        onUpdate: (updated) => {
          if (updated.status === 200 && onUpdated) onUpdated(updated.body);
        },
      });
    }
    return { status: 200, body, fromCache: true };
  }

  const result = await fetchSchoolJsonSWR({
    accessToken,
    schoolId,
    path,
    ttlMs: SCHOOL_CACHE_TTL_MS.report,
    force,
    fetchFn: schoolAuthFetch,
  });

  if (result?.status === 200 && onUpdated) {
    onUpdated(result.body);
  }

  return result;
}
