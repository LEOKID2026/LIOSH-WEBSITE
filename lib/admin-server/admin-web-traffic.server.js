import { resolveWebTrafficPreset } from "./admin-web-traffic-range.server.js";

const VERCEL_API_BASE = "https://api.vercel.com";
const WEB_TRAFFIC_CACHE_TTL_MS = 90_000;
const WEB_TRAFFIC_TIMEOUT_MS = 12_000;
const WEB_TRAFFIC_TOP_LIMIT = 15;

/** @type {Map<string, { expiresAt: number, payload: unknown }>} */
const webTrafficResponseCache = new Map();

const AGGREGATE_DIMENSIONS = [
  { key: "daily", by: "day", labelKey: "timestamp", dimension: "daily" },
  { key: "topPages", by: "requestPath", labelKey: "requestPath", dimension: "requestPath" },
  { key: "referrers", by: "referrerHostname", labelKey: "referrerHostname", dimension: "referrerHostname" },
  { key: "devices", by: "deviceType", labelKey: "deviceType", dimension: "deviceType" },
  { key: "browsers", by: "browserName", labelKey: "browserName", dimension: "browserName" },
  { key: "countries", by: "country", labelKey: "country", dimension: "country" },
];

const GENERIC_ERROR_HE = "לא ניתן לטעון נתוני תנועה באתר כרגע. נסו שוב מאוחר יותר.";
const NOT_CONFIGURED_HE = "נתוני התנועה באתר עדיין לא הוגדרו.";

function readVercelAnalyticsConfig() {
  const token = String(process.env.VERCEL_ANALYTICS_ACCESS_TOKEN || "").trim();
  const projectId = String(process.env.VERCEL_ANALYTICS_PROJECT_ID || "").trim();
  const teamId = String(process.env.VERCEL_ANALYTICS_TEAM_ID || "").trim();
  if (!token || !projectId || !teamId) {
    return { ok: false, reason: "missing_env" };
  }
  return { ok: true, token, projectId, teamId };
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function stripSensitiveFields(row) {
  if (!row || typeof row !== "object") return row;
  const cleaned = { ...row };
  delete cleaned.visitor_id;
  delete cleaned.visitorId;
  return cleaned;
}

function isoDateFromTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * @param {unknown} data
 * @param {string} labelKey
 * @param {string} dimension
 */
function normalizeAggregateRows(data, labelKey, dimension) {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return rows
    .map((rawRow) => {
      const row = stripSensitiveFields(rawRow);
      const rawLabel = String(
        row[labelKey] ??
          row.timestamp ??
          row.day ??
          row.date ??
          row.requestPath ??
          row.referrerHostname ??
          row.deviceType ??
          row.browserName ??
          row.country ??
          row.key ??
          row.name ??
          ""
      ).trim();
      const pageviews = safeNum(row.pageviews ?? row.pageViews ?? row.count);
      const visitors = safeNum(row.visitors ?? row.visitorCount ?? row.uniqueVisitors);
      const date =
        dimension === "daily"
          ? isoDateFromTimestamp(rawLabel) || row.day || row.date || null
          : row.day || row.date || null;
      return {
        rawLabel,
        label: rawLabel,
        displayLabel: rawLabel,
        dimension,
        date,
        pageviews,
        value: pageviews,
        visitors: visitors > 0 ? visitors : null,
      };
    })
    .filter((row) => row.rawLabel)
    .sort((a, b) => (dimension === "daily" ? 0 : b.pageviews - a.pageviews))
    .slice(0, WEB_TRAFFIC_TOP_LIMIT)
    .sort((a, b) => {
      if (dimension === "daily") {
        return String(a.date || a.rawLabel).localeCompare(String(b.date || b.rawLabel));
      }
      return b.pageviews - a.pageviews;
    });
}

function mapVercelHttpError(status) {
  if (status === 401) {
    return { status: "error", code: "vercel_unauthorized", message: GENERIC_ERROR_HE };
  }
  if (status === 402) {
    return { status: "unavailable", code: "vercel_payment_required", message: GENERIC_ERROR_HE };
  }
  if (status === 429) {
    return { status: "rate_limited", code: "vercel_rate_limited", message: GENERIC_ERROR_HE };
  }
  if (status >= 500) {
    return { status: "unavailable", code: "vercel_upstream_error", message: GENERIC_ERROR_HE };
  }
  return { status: "error", code: "vercel_request_failed", message: GENERIC_ERROR_HE };
}

/**
 * @param {{ token: string, projectId: string, teamId: string }} config
 * @param {string} path
 * @param {Record<string, string|number|null|undefined>} params
 */
async function fetchVercelAnalytics(config, path, params = {}) {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  url.searchParams.set("projectId", config.projectId);
  url.searchParams.set("teamId", config.teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(WEB_TRAFFIC_TIMEOUT_MS),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return { ok: false, httpStatus: response.status, ...mapVercelHttpError(response.status) };
  }

  return { ok: true, data: body?.data ?? body };
}

function buildNotConfiguredPayload(preset, range) {
  return {
    ok: true,
    status: "not_configured",
    message: NOT_CONFIGURED_HE,
    preset,
    range: {
      label: range.label,
      fromDateOnly: range.fromDateOnly,
      toDateOnly: range.toDateOnly,
    },
    summary: { visitors: null, pageviews: null },
    daily: [],
    topPages: [],
    referrers: [],
    devices: [],
    browsers: [],
    countries: [],
    cacheTtlSeconds: WEB_TRAFFIC_CACHE_TTL_MS / 1000,
  };
}

function buildSuccessPayload(preset, range, parts) {
  const count = parts.count || {};
  const aggregates = parts.aggregates || {};
  return {
    ok: true,
    status: "available",
    message: null,
    preset,
    range: {
      label: range.label,
      fromDateOnly: range.fromDateOnly,
      toDateOnly: range.toDateOnly,
    },
    summary: {
      visitors: safeNum(count.visitors),
      pageviews: safeNum(count.pageviews),
    },
    daily: (aggregates.daily || [])
      .slice()
      .sort((a, b) => String(a.date || a.label).localeCompare(String(b.date || b.label))),
    topPages: aggregates.topPages || [],
    referrers: aggregates.referrers || [],
    devices: aggregates.devices || [],
    browsers: aggregates.browsers || [],
    countries: aggregates.countries || [],
    cacheTtlSeconds: WEB_TRAFFIC_CACHE_TTL_MS / 1000,
    cachedAt: new Date().toISOString(),
  };
}

function buildErrorPayload(preset, range, errorInfo) {
  return {
    ok: true,
    status: errorInfo.status || "error",
    message: errorInfo.message || GENERIC_ERROR_HE,
    preset,
    range: {
      label: range.label,
      fromDateOnly: range.fromDateOnly,
      toDateOnly: range.toDateOnly,
    },
    summary: { visitors: null, pageviews: null },
    daily: [],
    topPages: [],
    referrers: [],
    devices: [],
    browsers: [],
    countries: [],
    cacheTtlSeconds: WEB_TRAFFIC_CACHE_TTL_MS / 1000,
  };
}

/** @param {Record<string, unknown>} query */
export async function getAdminWebTrafficAnalytics(query = {}) {
  const resolved = resolveWebTrafficPreset(query);
  if (!resolved.ok) return resolved;

  const { preset, range } = resolved;
  const cacheKey = `web-traffic:${preset}:${range.fromDateOnly}:${range.toDateOnly}`;
  const cached = webTrafficResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const config = readVercelAnalyticsConfig();
  if (!config.ok) {
    const payload = buildNotConfiguredPayload(preset, range);
    webTrafficResponseCache.set(cacheKey, { expiresAt: Date.now() + WEB_TRAFFIC_CACHE_TTL_MS, payload });
    return payload;
  }

  const timeParams = {
    since: range.fromIso,
    until: range.toIsoExclusive,
  };

  try {
    const countResult = await fetchVercelAnalytics(
      config,
      "/v1/query/web-analytics/visits/count",
      timeParams
    );

    if (!countResult.ok) {
      const payload = buildErrorPayload(preset, range, countResult);
      webTrafficResponseCache.set(cacheKey, { expiresAt: Date.now() + WEB_TRAFFIC_CACHE_TTL_MS, payload });
      return payload;
    }

    const aggregateResults = await Promise.all(
      AGGREGATE_DIMENSIONS.map(async (dimension) => {
        const result = await fetchVercelAnalytics(config, "/v1/query/web-analytics/visits/aggregate", {
          ...timeParams,
          by: dimension.by,
        });
        if (!result.ok) return { key: dimension.key, ok: false, rows: [] };
        return {
          key: dimension.key,
          ok: true,
          rows: normalizeAggregateRows(result.data, dimension.labelKey, dimension.dimension),
        };
      })
    );

    const aggregates = {};
    for (const item of aggregateResults) {
      aggregates[item.key] = item.rows;
    }

    const payload = buildSuccessPayload(preset, range, {
      count: countResult.data,
      aggregates,
    });

    webTrafficResponseCache.set(cacheKey, { expiresAt: Date.now() + WEB_TRAFFIC_CACHE_TTL_MS, payload });
    return payload;
  } catch (_error) {
    const payload = buildErrorPayload(preset, range, {
      status: "unavailable",
      code: "vercel_timeout",
      message: GENERIC_ERROR_HE,
    });
    webTrafficResponseCache.set(cacheKey, { expiresAt: Date.now() + WEB_TRAFFIC_CACHE_TTL_MS, payload });
    return payload;
  }
}

/** Test helper — clears in-memory cache between selftest runs. */
export function __clearAdminWebTrafficCacheForTests() {
  webTrafficResponseCache.clear();
}

export {
  WEB_TRAFFIC_CACHE_TTL_MS,
  NOT_CONFIGURED_HE,
  GENERIC_ERROR_HE,
};
