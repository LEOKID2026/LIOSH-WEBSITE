/**
 * Short-lived in-process cache for expensive school aggregation queries.
 * Scoped by schoolId — auth/permission checks remain at the API layer.
 */

/** @type {Map<string, { value: unknown, fetchedAt: number }>} */
const store = new Map();

export const SCHOOL_SERVER_CACHE_TTL_MS = {
  visibleStudents: 60_000,
  dashboardStats: 60_000,
  scope: 60_000,
};

/**
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<T>} loader
 * @returns {Promise<T>}
 */
export async function memoSchoolServerQuery(key, ttlMs, loader) {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && now - hit.fetchedAt <= ttlMs) {
    return /** @type {T} */ (hit.value);
  }
  const value = await loader();
  store.set(key, { value, fetchedAt: now });
  return value;
}

/**
 * @param {string} [schoolId]
 */
export function invalidateSchoolServerCache(schoolId) {
  if (!schoolId) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(`${schoolId}::`)) store.delete(key);
  }
}
