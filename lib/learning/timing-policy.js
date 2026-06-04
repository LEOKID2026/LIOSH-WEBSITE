/**
 * Phase 3 — Timing Truth policy
 *
 * Single source of truth for computing rawTimeSpentMs, creditedTimeMs, timingStatus,
 * and overCreditCap for every answer submission (free-practice and assigned activity).
 *
 * Rules:
 *  - rawTimeSpentMs: actual elapsed wall time, NEVER capped, NEVER replaced
 *  - creditedTimeMs: capped value used for coins / reports / progress
 *  - timingStatus: enum describing the raw time relative to the credit cap
 *  - overCreditCap: explicit boolean — true when rawMs > capMs (maps to DB column over_credit_cap)
 *
 * timingStatus values:
 *  "no_timer"        — no time measurement was available (questionStartTime was null)
 *  "normal"          — rawMs <= capMs (within credit cap)
 *  "long"            — capMs < rawMs <= capMs*2  (over cap, moderate overage)
 *  "very_long"       — rawMs > capMs*2           (over cap, heavy overage)
 *  "hidden_tab"      — (future) detected via fairness ledger hidden accumulation
 *  "idle_suspected"  — (future) very long raw with no visible slices
 *
 * Note: overCreditCap is a separate explicit flag from timingStatus so callers can
 * filter on it directly without inspecting the status string. This maps directly to
 * the over_credit_cap boolean column added in migration 055.
 */

export const ASSIGNED_ACTIVITY_CREDIT_CAP_MS = 300_000;
export const DEFAULT_FREE_PRACTICE_CAP_MS = 300_000;

/**
 * Derive a timing status string from raw milliseconds vs credit cap.
 *
 * @param {number|null} rawMs
 * @param {number} [capMs]
 * @returns {"no_timer"|"normal"|"long"|"very_long"}
 */
export function deriveTimingStatus(rawMs, capMs = DEFAULT_FREE_PRACTICE_CAP_MS) {
  if (rawMs == null || typeof rawMs !== "number" || rawMs <= 0) return "no_timer";
  if (rawMs <= capMs) return "normal";
  if (rawMs <= capMs * 2) return "long";
  return "very_long";
}

/**
 * Compute timing fields for ASSIGNED ACTIVITY answers.
 * No visibility ledger — uses a flat 300s credit cap.
 *
 * @param {number|null} rawMs — Date.now() - questionStartRef.current at submit time
 * @returns {{ rawTimeSpentMs: number, creditedTimeMs: number, timingStatus: string, overCreditCap: boolean }}
 */
export function computeAssignedActivityTiming(rawMs) {
  const cap = ASSIGNED_ACTIVITY_CREDIT_CAP_MS;
  const raw = rawMs != null && Number.isFinite(rawMs) ? Math.max(0, rawMs) : 0;
  const credited = Math.min(raw, cap);
  const timingStatus = deriveTimingStatus(raw, cap);
  const overCreditCap = raw > cap;
  return { rawTimeSpentMs: raw, creditedTimeMs: credited, timingStatus, overCreditCap };
}

/**
 * Compute timing fields for FREE-PRACTICE master answers.
 * creditedMs comes from QuestionTimeLedger.peekCreditedMs() if available.
 * tierCapMs comes from QuestionTimeLedger.tierCapMs if available.
 *
 * @param {number|null} rawMs  — raw wall-clock elapsed (Date.now() - questionStartTime)
 * @param {{
 *   creditedMs?: number|null,
 *   tierCapMs?: number,
 * }} [opts]
 * @returns {{
 *   rawTimeSpentMs: number|null,
 *   creditedTimeMs: number|null,
 *   timingStatus: string,
 *   overCreditCap: boolean,
 * }}
 */
export function computeFreePracticeTiming(rawMs, opts = {}) {
  const { creditedMs, tierCapMs = DEFAULT_FREE_PRACTICE_CAP_MS } = opts;

  if (rawMs == null || typeof rawMs !== "number" || rawMs < 0) {
    return { rawTimeSpentMs: null, creditedTimeMs: null, timingStatus: "no_timer", overCreditCap: false };
  }

  const raw = Math.max(0, rawMs);
  const credited =
    creditedMs !== undefined && creditedMs !== null
      ? Math.max(0, creditedMs)
      : Math.min(raw, tierCapMs);

  const timingStatus = deriveTimingStatus(raw, tierCapMs);
  const overCreditCap = raw > tierCapMs;
  return { rawTimeSpentMs: raw, creditedTimeMs: credited, timingStatus, overCreditCap };
}
