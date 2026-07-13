import { resolveAdminAnalyticsRange } from "./admin-analytics.server.js";

const ALLOWED_WEB_TRAFFIC_PRESETS = new Set(["today", "last7", "last30"]);

/** @param {Record<string, unknown>} query */
export function resolveWebTrafficPreset(query = {}) {
  const preset = String(query.preset || "").trim();
  if (!ALLOWED_WEB_TRAFFIC_PRESETS.has(preset)) {
    return { ok: false, status: 400, code: "invalid_traffic_preset" };
  }
  const range = resolveAdminAnalyticsRange({ preset });
  if (!range.ok) return range;
  return { ok: true, preset, range };
}

export { ALLOWED_WEB_TRAFFIC_PRESETS };
