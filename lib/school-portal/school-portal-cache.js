/**
 * In-memory session cache for school portal API responses.
 * Not cookies, not localStorage — cleared on full page reload.
 */

/** @typedef {{ data: unknown, fetchedAt: number }} SchoolCacheEntry */

/** @type {Map<string, SchoolCacheEntry>} */
const store = new Map();

/** @type {Map<string, Promise<{ status: number, body: unknown, fromCache: boolean }>>} */
const inflight = new Map();

/** @type {{ data: unknown, accessToken: string, fetchedAt: number } | null} */
let sharedMeSession = null;

export const SCHOOL_CACHE_TTL_MS = {
  me: 5 * 60 * 1000,
  list: 3 * 60 * 1000,
  browse: 3 * 60 * 1000,
  teacherDetail: 3 * 60 * 1000,
  report: 2 * 60 * 1000,
  activities: 2 * 60 * 1000,
};

/**
 * @param {string|null|undefined} schoolId
 * @param {string} path
 */
export function schoolCacheKey(schoolId, path) {
  return `${String(schoolId || "unknown")}::${path}`;
}

/**
 * @param {string|null|undefined} schoolId
 * @param {string} path
 * @returns {SchoolCacheEntry|null}
 */
export function readSchoolCache(schoolId, path) {
  const entry = store.get(schoolCacheKey(schoolId, path));
  if (!entry) return null;
  return entry;
}

/**
 * @param {SchoolCacheEntry|null|undefined} entry
 * @param {number} ttlMs
 */
export function isSchoolCacheFresh(entry, ttlMs) {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt <= ttlMs;
}

/**
 * @param {string|null|undefined} schoolId
 * @param {string} path
 * @param {unknown} data
 */
export function writeSchoolCache(schoolId, path, data) {
  store.set(schoolCacheKey(schoolId, path), { data, fetchedAt: Date.now() });
}

/**
 * @param {string|null|undefined} [schoolId]
 */
export function invalidateSchoolCache(schoolId) {
  if (!schoolId) {
    store.clear();
    inflight.clear();
    sharedMeSession = null;
    return;
  }
  const prefix = `${String(schoolId)}::`;
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
  sharedMeSession = null;
}

export function readSharedMeSession() {
  return sharedMeSession;
}

/**
 * @param {string} accessToken
 * @param {unknown} data
 */
export function writeSharedMeSession(accessToken, data) {
  sharedMeSession = { accessToken, data, fetchedAt: Date.now() };
  const schoolId = data?.school?.schoolId;
  writeSchoolCache(schoolId, "/api/school/me", { data });
}

/**
 * @param {{
 *   accessToken: string,
 *   schoolId?: string|null,
 *   path: string,
 *   ttlMs?: number,
 *   force?: boolean,
 *   fetchFn: (token: string, path: string, init?: RequestInit) => Promise<Response>,
 *   init?: RequestInit,
 * }} options
 * @returns {Promise<{ status: number, body: unknown, fromCache: boolean, revalidated?: boolean }>}
 */
export async function fetchSchoolJsonCached(options) {
  const {
    accessToken,
    schoolId,
    path,
    ttlMs = SCHOOL_CACHE_TTL_MS.list,
    force = false,
    fetchFn,
    init,
  } = options;

  const key = schoolCacheKey(schoolId, path);
  const cached = store.get(key);

  if (!force && cached && isSchoolCacheFresh(cached, ttlMs)) {
    const body = cached.data;
    return { status: 200, body, fromCache: true };
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const staleBody = cached?.data;

  const promise = (async () => {
    const res = await fetchFn(accessToken, path, init);
    const body = await res.json().catch(() => ({}));
    if (res.status === 200) {
      writeSchoolCache(schoolId, path, body);
    }
    return { status: res.status, body, fromCache: false };
  })();

  inflight.set(key, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inflight.delete(key);
  }
}

export function deleteSchoolCacheEntry(schoolId, path) {
  const key = schoolCacheKey(schoolId, path);
  store.delete(key);
  inflight.delete(key);
}

/**
 * @param {{
 *   accessToken: string,
 *   schoolId?: string|null,
 *   path: string,
 *   ttlMs?: number,
 *   force?: boolean,
 *   fetchFn: (token: string, path: string, init?: RequestInit) => Promise<Response>,
 *   init?: RequestInit,
 *   onUpdate?: (result: { status: number, body: unknown }) => void,
 * }} options
 * @returns {Promise<{ status: number, body: unknown, fromCache: boolean }|null>}
 */
export async function fetchSchoolJsonSWR(options) {
  const { schoolId, path, ttlMs = SCHOOL_CACHE_TTL_MS.list, force = false, onUpdate } = options;
  const cached = readSchoolCache(schoolId, path);

  if (!force && cached) {
    const fresh = isSchoolCacheFresh(cached, ttlMs);
    const body = cached.data;
    if (fresh) {
      return { status: 200, body, fromCache: true };
    }
    void fetchSchoolJsonCached({ ...options, force: true }).then((result) => {
      if (onUpdate) onUpdate(result);
    });
    return { status: 200, body, fromCache: true };
  }

  return fetchSchoolJsonCached(options);
}
