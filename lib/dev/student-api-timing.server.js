/**
 * Server-side API timing for student endpoints (dev only).
 * Enable: STUDENT_API_TIMING=1 or NODE_ENV=development with isStudentIdentityDebugEnabled
 */
import { isStudentIdentityDebugEnabled } from "../student-identity-debug-flag.js";
export function isStudentApiTimingEnabled() {
  if (String(process.env.STUDENT_API_TIMING || "").trim() === "1") return true;
  return isStudentIdentityDebugEnabled();
}
/**
 * @param {string} label
 * @param {Record<string, number>} phases ms per phase
 * @param {Record<string, unknown>} [extra]
 */
export function logStudentApiTiming(label, phases, extra = {}) {
  if (!isStudentApiTimingEnabled()) return;
  const totalMs = phases.totalMs ?? phases.total ?? null;
  // eslint-disable-next-line no-console
  console.info(`[student-api-timing] ${label}`, { ...phases, ...extra, totalMs });
}
/**
 * @template T
 * @param {string} phase
 * @param {() => Promise<T>} fn
 * @param {Record<string, number>} bucket
 */
export async function timeStudentApiPhase(phase, fn, bucket) {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    bucket[phase] = (bucket[phase] || 0) + (Date.now() - start);
  }
}
/**
 * Attach Server-Timing header (dev) and log breakdown.
 * @param {import("next").NextApiResponse} res
 * @param {string} label
 * @param {Record<string, number>} phases
 */
export function finishStudentApiTiming(res, label, phases) {
  const startedAt = phases._startedAt || Date.now();
  const totalMs = Date.now() - startedAt;
  const payload = { ...phases, totalMs };
  delete payload._startedAt;
  logStudentApiTiming(label, payload);
  if (isStudentApiTimingEnabled()) {
    try {
      const parts = Object.entries(payload)
        .filter(([k]) => k !== "totalMs")
        .map(([k, v]) => `${k};dur=${Math.round(Number(v) || 0)}`);
      if (parts.length) res.setHeader("Server-Timing", parts.join(", "));
      res.setHeader("X-Student-Api-Timing-Total", String(totalMs));
    } catch {
      /* ignore header errors */
    }
  }
}
/** @returns {Record<string, number>} */
export function createStudentApiTimingBucket() {
  return { _startedAt: Date.now() };
}
