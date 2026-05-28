/**
 * In-process cache for lightweight student activity maps (school browse paths).
 * Reduces duplicate buildLightweightStudentActivityMap work within a warm Node instance.
 */

import { buildLightweightStudentActivityMap } from "../teacher-server/teacher-dashboard-activity.server.js";
import { isoDateOnly } from "../parent-server/report-data-aggregate.server.js";

const TTL_MS = 3 * 60 * 1000;
const MAX_ROSTER_KEYS = 48;

/** @type {Map<string, { expiresAt: number, result: Awaited<ReturnType<typeof buildLightweightStudentActivityMap>> }>} */
const rosterStore = new Map();

/** @type {Map<string, { expiresAt: number, rollup: object }>} */
const studentSliceStore = new Map();

/**
 * @param {string[]} studentIds
 * @param {Date} fromDate
 * @param {Date} toDate
 */
function rosterCacheKey(studentIds, fromDate, toDate) {
  const sorted = [...new Set(studentIds.filter(Boolean).map(String))].sort();
  return `${isoDateOnly(fromDate)}::${isoDateOnly(toDate)}::${sorted.join(",")}`;
}

function studentSliceKey(studentId, fromDate, toDate) {
  return `${isoDateOnly(fromDate)}::${isoDateOnly(toDate)}::${String(studentId)}`;
}

function pruneStores() {
  const now = Date.now();
  for (const [key, entry] of rosterStore) {
    if (entry.expiresAt <= now) rosterStore.delete(key);
  }
  for (const [key, entry] of studentSliceStore) {
    if (entry.expiresAt <= now) studentSliceStore.delete(key);
  }
  while (rosterStore.size > MAX_ROSTER_KEYS) {
    const first = rosterStore.keys().next().value;
    if (first) rosterStore.delete(first);
  }
}

/**
 * @param {Date} fromDate
 * @param {Date} toDate
 * @param {Map<string, object>} byStudentId
 */
function indexStudentSlices(fromDate, toDate, byStudentId) {
  const expiresAt = Date.now() + TTL_MS;
  for (const [studentId, rollup] of byStudentId) {
    studentSliceStore.set(studentSliceKey(studentId, fromDate, toDate), {
      expiresAt,
      rollup,
    });
  }
}

/**
 * @param {string[]} studentIds
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Map<string, object>|null}
 */
export function readCachedLightweightActivityByStudentId(studentIds, fromDate, toDate) {
  const now = Date.now();
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const studentId of studentIds) {
    const hit = studentSliceStore.get(studentSliceKey(studentId, fromDate, toDate));
    if (!hit || hit.expiresAt <= now) {
      return null;
    }
    map.set(String(studentId), hit.rollup);
  }
  return map;
}

/**
 * @param {{
 *   serviceRole: import("@supabase/supabase-js").SupabaseClient,
 *   studentIds: string[],
 *   fromDate: Date,
 *   toDate: Date,
 *   teacherId?: string|null,
 * }} input
 */
export async function getCachedLightweightStudentActivityMap(input) {
  const { serviceRole, studentIds, fromDate, toDate, teacherId = null } = input;

  const subsetHit = readCachedLightweightActivityByStudentId(studentIds, fromDate, toDate);
  if (subsetHit && subsetHit.size === studentIds.length) {
    return {
      ok: true,
      byStudentId: subsetHit,
      byStudentWeakTopic: new Map(),
      latestSubjectLabel: null,
      classHealthSignal: null,
    };
  }

  const key = rosterCacheKey(studentIds, fromDate, toDate);
  const now = Date.now();
  const hit = rosterStore.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.result;
  }

  const result = await buildLightweightStudentActivityMap({
    serviceRole,
    teacherId,
    studentIds,
    fromDate,
    toDate,
  });

  if (result.ok && result.byStudentId) {
    indexStudentSlices(fromDate, toDate, result.byStudentId);
  }

  pruneStores();
  rosterStore.set(key, { expiresAt: now + TTL_MS, result });
  return result;
}
