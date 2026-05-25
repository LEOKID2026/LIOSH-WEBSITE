/**
 * Lightweight Server-Timing header for teacher APIs (dev/benchmark).
 * @param {import('http').ServerResponse} res
 * @param {Record<string, number>} timingsMs — label -> milliseconds
 */
export function setTeacherApiServerTiming(res, timingsMs) {
  const parts = Object.entries(timingsMs)
    .filter(([, ms]) => Number.isFinite(ms))
    .map(([name, ms]) => `${name};dur=${Math.round(ms)}`);
  if (parts.length) {
    res.setHeader("Server-Timing", parts.join(", "));
  }
}

export function startTimer() {
  return performance.now();
}

export function elapsedMs(start) {
  return performance.now() - start;
}
