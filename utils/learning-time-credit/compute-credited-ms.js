import { LEARNING_UNIT_CREDIT_CAP_MS, creditLearningUnitMs } from "../../lib/learning/learning-time-credit-policy.js";
import {
  LEGACY_TOPIC_MAX_EXCLUSIVE_SEC,
  resolveTierCapMs,
} from "./constants.js";

/**
 * @param {number} visibleElapsedMs
 * @param {number} tierCapMs
 * @param {number} alreadyCreditedMs
 */
export function creditVisibleSliceMs(visibleElapsedMs, tierCapMs, alreadyCreditedMs = 0) {
  const elapsed = Number(visibleElapsedMs);
  const cap = Number(tierCapMs);
  const prev = Number(alreadyCreditedMs);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  if (!Number.isFinite(cap) || cap <= 0) return 0;
  const prevSafe = Number.isFinite(prev) && prev > 0 ? prev : 0;
  const room = Math.max(0, cap - prevSafe);
  return Math.min(Math.floor(elapsed), room);
}

/**
 * צבירת זמן ליחידה — תקרה 10 דקות.
 * @param {number} elapsedMs
 */
export function legacyAccumulateQuestionMs(elapsedMs) {
  return creditLearningUnitMs(elapsedMs);
}

/**
 * @param {number} rawDurationSec
 */
export function legacyTopicCreditSeconds(rawDurationSec) {
  const sec = Number(rawDurationSec);
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  if (sec >= LEGACY_TOPIC_MAX_EXCLUSIVE_SEC) return 0;
  return sec;
}

/**
 * @param {number} creditedMs
 */
export function fairnessTopicCreditSeconds(creditedMs) {
  const ms = Number(creditedMs);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.max(1, Math.floor(ms / 1000));
}

/**
 * @param {number} creditedMs
 * @param {boolean} fairnessEnabled
 * @param {number} [rawDurationSec]
 */
export function topicCreditSecondsFromQuestionClose(creditedMs, fairnessEnabled, rawDurationSec = 0) {
  if (fairnessEnabled) {
    return fairnessTopicCreditSeconds(creditedMs);
  }
  return legacyTopicCreditSeconds(rawDurationSec);
}

/**
 * @param {Array<{ startMs: number, endMs: number }>} visibleIntervals
 * @param {number} tierCapMs
 */
export function sumCreditedFromVisibleIntervals(visibleIntervals, tierCapMs) {
  let total = 0;
  for (const interval of visibleIntervals || []) {
    const start = Number(interval?.startMs);
    const end = Number(interval?.endMs);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    total += creditVisibleSliceMs(end - start, tierCapMs, total);
    if (total >= tierCapMs) break;
  }
  return total;
}

export { resolveTierCapMs, LEARNING_UNIT_CREDIT_CAP_MS };
