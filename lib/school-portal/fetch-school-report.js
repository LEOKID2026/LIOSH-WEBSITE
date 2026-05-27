import { schoolAuthFetch } from "./school-ui.he.js";
import {
  fetchSchoolJsonSWR,
  isSchoolCacheFresh,
  readSchoolCache,
  SCHOOL_CACHE_TTL_MS,
} from "./school-portal-cache.js";
import {
  isSchoolPortalReportCacheEnabled,
  isSchoolReportCacheableBody,
} from "./school-portal-cache-flags.js";

/**
 * @param {string} path
 */
function reportCacheKind(path) {
  if (path.includes("/classes/") && path.includes("/report-data")) return "class";
  if (path.includes("/students/") && path.includes("/report-data")) return "student";
  return null;
}

/**
 * Load a school report API. Report cache is OFF by default (see school-portal-cache-flags).
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
  const cacheOn = isSchoolPortalReportCacheEnabled();
  const kind = reportCacheKind(path);

  if (!cacheOn || force) {
    const res = await schoolAuthFetch(accessToken, path);
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && onUpdated) onUpdated(body);
    return { status: res.status, body, fromCache: false };
  }

  const cached = readSchoolCache(schoolId, path);

  if (cached && isSchoolReportCacheableBody(cached.data, kind)) {
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
          if (
            updated.status === 200 &&
            isSchoolReportCacheableBody(updated.body, kind) &&
            onUpdated
          ) {
            onUpdated(updated.body);
          }
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
    force: true,
    fetchFn: schoolAuthFetch,
  });

  if (result?.status === 200 && onUpdated) {
    onUpdated(result.body);
  }

  return result;
}
