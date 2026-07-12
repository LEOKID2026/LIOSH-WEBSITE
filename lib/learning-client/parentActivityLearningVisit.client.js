/**
 * Client helper — parent-assigned activity learning visit tracking.
 */

import { computeOpenLearningTiming } from "../learning/timing-policy.js";

export function makeParentActivityVisitToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pvisit_${crypto.randomUUID()}`;
  }
  return `pvisit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {string} activityId
 * @param {{
 *   questionIndex: number,
 *   clientVisitToken: string,
 *   rawDwellMs: number,
 *   creditedDwellMs: number,
 *   visitKind?: string,
 * }} payload
 */
export async function postParentActivityLearningVisit(activityId, payload) {
  const res = await fetch(
    `/api/student/activities/${encodeURIComponent(activityId)}/learning-visit`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  try {
    return await res.json();
  } catch {
    return { ok: false };
  }
}

/**
 * @param {string} activityId
 * @param {Record<string, unknown>} payload
 */
export function beaconParentActivityLearningVisit(activityId, payload) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false;
  }
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    return navigator.sendBeacon(
      `/api/student/activities/${encodeURIComponent(activityId)}/learning-visit`,
      blob
    );
  } catch {
    return false;
  }
}

/**
 * @param {number|null|undefined} startedAtMs
 * @param {{ visitKind?: string }} [opts]
 */
export function computeParentVisitTimingFromStart(startedAtMs, opts = {}) {
  const started = Number(startedAtMs);
  if (!Number.isFinite(started) || started <= 0) {
    return { rawDwellMs: 0, creditedDwellMs: 0, timingStatus: "no_timer" };
  }
  const rawDwellMs = Math.max(0, Date.now() - started);
  const timing = computeOpenLearningTiming(rawDwellMs);
  return {
    rawDwellMs: timing.rawTimeSpentMs,
    creditedDwellMs: timing.creditedTimeMs,
    timingStatus: timing.timingStatus,
    visitKind: opts.visitKind,
  };
}
