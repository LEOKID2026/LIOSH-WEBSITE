/**
 * Single active learning-time lease per student in this browser profile.
 * Prevents parallel tabs from accumulating credited time simultaneously.
 * Hidden tabs do not hold the lease / do not accrue.
 */

import { createLearningIdleController } from "../learning/learning-time-credit-policy.js";

const LEASE_PREFIX = "leo_learning_time_lease_v1:";
const CHANNEL_NAME = "leo-learning-time-lease-v1";
const ACTIVE_STUDENT_KEY = "leo_learning_active_student_id_v1";

function storageKey(studentId) {
  return `${LEASE_PREFIX}${String(studentId || "").trim()}`;
}

/** Remember the signed-in student so masters/activities share one lease namespace. */
export function rememberActiveLearningStudentId(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_STUDENT_KEY, sid);
  } catch {
    /* ignore */
  }
}

export function resolveActiveLearningStudentId(fallback = "") {
  const fb = String(fallback || "").trim();
  if (fb) return fb;
  if (typeof localStorage === "undefined") return "";
  try {
    return String(localStorage.getItem(ACTIVE_STUDENT_KEY) || "").trim();
  } catch {
    return "";
  }
}

function readLease(studentId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLease(studentId, lease) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(studentId), JSON.stringify(lease));
  } catch {
    /* ignore quota */
  }
}

function clearLeaseIfOwner(studentId, ownerId) {
  const cur = readLease(studentId);
  if (cur?.ownerId === ownerId) {
    try {
      localStorage.removeItem(storageKey(studentId));
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ studentId: string, ownerId: string, source: string, onLost?: () => void }} opts
 */
export function createLearningTimeLease(opts) {
  const studentId = String(opts.studentId || "").trim();
  const ownerId = String(opts.ownerId || "").trim();
  const source = String(opts.source || "unknown");
  if (!studentId || !ownerId) {
    return {
      ownerId,
      isActive: () => false,
      claim: () => false,
      heartbeat: () => {},
      release: () => {},
      dispose: () => {},
    };
  }

  let channel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (ev) => {
        const msg = ev?.data;
        if (!msg || msg.studentId !== studentId) return;
        if (msg.type === "claim" && msg.ownerId !== ownerId) {
          opts.onLost?.();
        }
      };
    }
  } catch {
    channel = null;
  }

  const claim = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return false;
    }
    const now = Date.now();
    const cur = readLease(studentId);
    // Steal stale leases (>15s without heartbeat) or empty.
    if (cur && cur.ownerId !== ownerId && now - Number(cur.heartbeatAt || 0) < 15_000) {
      return false;
    }
    writeLease(studentId, {
      ownerId,
      source,
      claimedAt: now,
      heartbeatAt: now,
    });
    try {
      channel?.postMessage({ type: "claim", studentId, ownerId, source });
    } catch {
      /* ignore */
    }
    return true;
  };

  const isActive = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return false;
    }
    const cur = readLease(studentId);
    return Boolean(cur && cur.ownerId === ownerId);
  };

  const heartbeat = () => {
    if (!isActive()) return;
    const cur = readLease(studentId);
    if (!cur || cur.ownerId !== ownerId) return;
    writeLease(studentId, { ...cur, heartbeatAt: Date.now() });
  };

  const release = () => {
    clearLeaseIfOwner(studentId, ownerId);
    try {
      channel?.postMessage({ type: "release", studentId, ownerId });
    } catch {
      /* ignore */
    }
  };

  const onVisibility = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      release();
      opts.onLost?.();
    } else {
      claim();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  const dispose = () => {
    release();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
  };

  claim();

  return { ownerId, isActive, claim, heartbeat, release, dispose };
}

/**
 * Accrue only while lease is active and tab visible.
 * Caps jump from sleep/wake: ignore slices longer than maxSliceMs.
 * Idle freeze: after LEARNING_IDLE_FREEZE_MS without signalActivity, stop accruing.
 * @param {{ isActive: () => boolean }} lease
 * @param {{ maxSliceMs?: number, idleFreezeMs?: number, enableIdleFreeze?: boolean }} [opts]
 */
export function createVisibleLeaseAccrual(lease, opts = {}) {
  const maxSliceMs = Math.max(1_000, Math.floor(Number(opts.maxSliceMs) || 60_000));
  const enableIdle =
    opts.enableIdleFreeze !== false
      ? true
      : false;
  const idle = enableIdle
    ? createLearningIdleController({ idleFreezeMs: opts.idleFreezeMs })
    : null;
  let lastTick = Date.now();
  let accruedMs = 0;

  const tick = () => {
    const now = Date.now();
    const delta = now - lastTick;
    lastTick = now;
    if (delta <= 0) return accruedMs;
    if (delta > maxSliceMs) {
      return accruedMs;
    }
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return accruedMs;
    }
    if (!lease.isActive()) return accruedMs;
    const credit = idle ? idle.filterDelta(delta, now) : delta;
    accruedMs += credit;
    return accruedMs;
  };

  const signalActivity = (now = Date.now()) => {
    idle?.signalActivity(now);
  };

  const reset = (ms = 0) => {
    accruedMs = Math.max(0, Math.floor(Number(ms) || 0));
    lastTick = Date.now();
    idle?.signalActivity(lastTick);
  };

  // Opening a learning surface counts as activity
  idle?.signalActivity(lastTick);

  return {
    tick,
    reset,
    signalActivity,
    getAccruedMs: () => accruedMs,
    isIdleFrozen: () => (idle ? idle.isFrozen() : false),
  };
}
