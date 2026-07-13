import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (rel) => readFileSync(path.join(root, rel), "utf8");
const u = (rel) => pathToFileURL(path.join(root, rel)).href;

const webTrafficApi = read("pages/api/admin/analytics/web-traffic.js");
assert.match(webTrafficApi, /requireAdminApiContext/, "web-traffic API must use admin guard");
assert.match(webTrafficApi, /getAdminWebTrafficAnalytics/, "web-traffic API must call server aggregator");
assert.ok(
  webTrafficApi.indexOf("requireAdminApiContext") < webTrafficApi.indexOf("getAdminWebTrafficAnalytics"),
  "admin guard must run before Vercel fetch"
);

const webTrafficServer = read("lib/admin-server/admin-web-traffic.server.js");
assert.doesNotMatch(webTrafficServer, /NEXT_PUBLIC_/, "web-traffic server must not use NEXT_PUBLIC env");
assert.match(webTrafficServer, /WEB_TRAFFIC_CACHE_TTL_MS = 90_000/, "web-traffic cache must be 90 seconds");
assert.match(webTrafficServer, /AbortSignal\.timeout/, "web-traffic must use fetch timeout");
assert.match(webTrafficServer, /נתוני התנועה באתר עדיין לא הוגדרו/, "missing env must return Hebrew not-configured message");
assert.match(webTrafficServer, /status === 401/, "web-traffic must handle 401");
assert.match(webTrafficServer, /status === 402/, "web-traffic must handle 402");
assert.match(webTrafficServer, /status === 429/, "web-traffic must handle 429");
assert.doesNotMatch(webTrafficServer, /utmSource/, "web-traffic must not call UTM dimensions");

const page = read("pages/admin/analytics.js");
assert.match(page, /תנועה באתר/, "analytics page must include web traffic tab label");
assert.match(page, /webTraffic/, "analytics page must define webTraffic tab id");
assert.match(page, /\/api\/admin\/analytics\/web-traffic/, "page must call web-traffic API separately");
assert.match(page, /WebTrafficTabContent/, "page must render simplified web traffic tab");
assert.match(page, /WebTrafficStatCard/, "page must render owner-friendly stat cards");
assert.match(page, /webTrafficQuantityCell/, "quantity columns must use numeric formatter only");
assert.match(page, /פעילות מנהל/, "admin pages must be separated from visitor pages");
assert.match(page, /טוען נתונים/, "page must show loading text without stale numbers");
assert.match(page, /משפך סיכום/, "overview must include activity funnel");
assert.doesNotMatch(page, /VERCEL_ANALYTICS_ACCESS_TOKEN/, "client page must not reference Vercel token env");
assert.doesNotMatch(page, /visitor_id/, "client page must not reference visitor_id");

assert.match(page, /formatWebTrafficLabelHe/, "page must use dedicated Vercel label formatter");
assert.match(page, /WebTrafficTable/, "page must render Vercel tables with dedicated formatter");
assert.match(page, /loadWebTrafficUserActivity/, "page must fetch Supabase user activity for web traffic tab");
assert.doesNotMatch(page, /trafficAlignedDashboard/, "page must not fall back to global preset for web traffic Supabase");
assert.doesNotMatch(page, /needsTrafficAlignedActivity/, "page must always align Supabase to webTrafficPreset");
assert.match(webTrafficServer, /labelKey: "timestamp"/, "daily aggregate must use timestamp labelKey");
assert.match(webTrafficServer, /rawLabel/, "aggregate rows must keep raw label separate from numeric value");

const { formatWebTrafficLabelHe } = await import(u("lib/admin-portal/admin-analytics-labels.he.js"));
assert.equal(formatWebTrafficLabelHe("2026-07-13T00:00:00.000Z", "daily"), "13.7.2026");
assert.equal(formatWebTrafficLabelHe("/", "requestPath"), "דף הבית");
assert.equal(formatWebTrafficLabelHe("/parent/login", "requestPath"), "כניסת הורים");
assert.equal(formatWebTrafficLabelHe("/student/login", "requestPath"), "כניסת תלמידים");
assert.equal(formatWebTrafficLabelHe("/parent/dashboard", "requestPath"), "אזור הורים");
assert.equal(formatWebTrafficLabelHe("mobile", "deviceType"), "נייד");
assert.equal(formatWebTrafficLabelHe("desktop", "deviceType"), "מחשב");
assert.equal(formatWebTrafficLabelHe("tablet", "deviceType"), "טאבלט");
assert.equal(formatWebTrafficLabelHe("Chrome", "browserName"), "Chrome");
assert.equal(formatWebTrafficLabelHe("IL", "country"), "IL");
assert.notEqual(formatWebTrafficLabelHe("mobile", "deviceType"), "תרגול");
assert.notEqual(formatWebTrafficLabelHe("/", "requestPath"), "תרגול");
assert.notEqual(formatWebTrafficLabelHe("6", "generic"), "כיתה א׳");

const {
  isAdminWebTrafficPath,
  mergeFacebookReferrers,
  splitVisitorAndAdminPages,
} = await import(u("lib/admin-portal/admin-web-traffic-display.js"));
assert.equal(isAdminWebTrafficPath("/admin/analytics"), true);
assert.equal(isAdminWebTrafficPath("/parent/login"), false);
const pages = splitVisitorAndAdminPages([
  { rawLabel: "/", value: 10 },
  { rawLabel: "/admin/analytics", value: 3 },
]);
assert.equal(pages.visitorPages.length, 1);
assert.equal(pages.adminPages.length, 1);
const refs = mergeFacebookReferrers([
  { rawLabel: "facebook.com", value: 4 },
  { rawLabel: "m.facebook.com", value: 2 },
  { rawLabel: "google.com", value: 5 },
]);
assert.equal(refs.facebookTotal, 6);
assert.equal(refs.merged[0].label, "פייסבוק");
assert.equal(refs.merged[0].value, 6);
assert.equal(refs.merged[1].rawLabel, "google.com");

const analyticsServer = read("lib/admin-server/admin-analytics.server.js");
assert.match(analyticsServer, /buildUserActivityAnalytics/, "analytics server must build user activity section");
assert.match(analyticsServer, /solo_game_sessions/, "analytics server must query solo_game_sessions");
assert.match(analyticsServer, /account_kind/, "analytics server must read student account_kind");
assert.match(analyticsServer, /userActivity/, "dashboard payload must include userActivity section");

const productionFilter = read("lib/admin-server/admin-analytics-production-filter.server.js");
assert.match(productionFilter, /GUEST_SYSTEM_PARENT_EMAIL/, "production filter must exclude guest-system parent");
assert.match(productionFilter, /isQaTestAccountEmail/, "production filter must exclude QA accounts");
assert.match(productionFilter, /getMainAdminEmailSet/, "production filter must exclude owner accounts");

const { resolveWebTrafficPreset, ALLOWED_WEB_TRAFFIC_PRESETS } = await import(u("lib/admin-server/admin-web-traffic-range.server.js"));
assert.equal(ALLOWED_WEB_TRAFFIC_PRESETS.has("today"), true);
assert.equal(ALLOWED_WEB_TRAFFIC_PRESETS.has("last7"), true);
assert.equal(ALLOWED_WEB_TRAFFIC_PRESETS.has("last30"), true);
assert.equal(resolveWebTrafficPreset({ preset: "custom" }).ok, false, "custom preset must be rejected for web traffic");
assert.equal(resolveWebTrafficPreset({ preset: "last30" }).ok, true);

const {
  getAdminWebTrafficAnalytics,
  __clearAdminWebTrafficCacheForTests,
  WEB_TRAFFIC_CACHE_TTL_MS,
} = await import(u("lib/admin-server/admin-web-traffic.server.js"));

const originalFetch = globalThis.fetch;
const originalToken = process.env.VERCEL_ANALYTICS_ACCESS_TOKEN;
const originalProject = process.env.VERCEL_ANALYTICS_PROJECT_ID;
const originalTeam = process.env.VERCEL_ANALYTICS_TEAM_ID;

try {
  delete process.env.VERCEL_ANALYTICS_ACCESS_TOKEN;
  delete process.env.VERCEL_ANALYTICS_PROJECT_ID;
  delete process.env.VERCEL_ANALYTICS_TEAM_ID;
  __clearAdminWebTrafficCacheForTests();

  const missingEnv = await getAdminWebTrafficAnalytics({ preset: "today" });
  assert.equal(missingEnv.ok, true);
  assert.equal(missingEnv.status, "not_configured");
  assert.match(missingEnv.message, /עדיין לא הוגדרו/);

  const missingEnvCached = await getAdminWebTrafficAnalytics({ preset: "today" });
  assert.equal(missingEnvCached.status, "not_configured");

  let fetchCalls = 0;
  globalThis.fetch = async (url) => {
    fetchCalls += 1;
    if (String(url).includes("/aggregate")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ timestamp: "2026-07-13T00:00:00.000Z", pageviews: 4, visitors: 2, visitor_id: "secret" }],
          };
        },
      };
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return { data: { visitors: 3, pageviews: 9 } };
      },
    };
  };

  process.env.VERCEL_ANALYTICS_ACCESS_TOKEN = "test-token";
  process.env.VERCEL_ANALYTICS_PROJECT_ID = "prj_test";
  process.env.VERCEL_ANALYTICS_TEAM_ID = "team_test";
  __clearAdminWebTrafficCacheForTests();

  const first = await getAdminWebTrafficAnalytics({ preset: "last7" });
  assert.equal(first.status, "available");
  assert.equal(first.summary.visitors, 3);
  assert.equal(first.summary.pageviews, 9);
  assert.ok(!JSON.stringify(first).includes("visitor_id"), "response must not include visitor_id");
  assert.equal(first.daily[0]?.rawLabel, "2026-07-13T00:00:00.000Z");
  assert.equal(first.daily[0]?.dimension, "daily");
  assert.equal(first.daily[0]?.pageviews, 4);
  const callsAfterFirst = fetchCalls;

  const second = await getAdminWebTrafficAnalytics({ preset: "last7" });
  assert.equal(second.status, "available");
  assert.equal(fetchCalls, callsAfterFirst, "second call within TTL must use cache");

  __clearAdminWebTrafficCacheForTests();
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    async json() {
      return { error: { code: "rate_limited" } };
    },
  });

  const rateLimited = await getAdminWebTrafficAnalytics({ preset: "today" });
  assert.equal(rateLimited.ok, true);
  assert.equal(rateLimited.status, "rate_limited");
  assert.match(rateLimited.message, /לא ניתן לטעון/);
  assert.equal(rateLimited.summary.visitors, null);
  assert.ok(!JSON.stringify(rateLimited).includes('"error"'), "must not leak raw upstream error objects");

  assert.equal(WEB_TRAFFIC_CACHE_TTL_MS, 90_000);
} finally {
  globalThis.fetch = originalFetch;
  if (originalToken == null) delete process.env.VERCEL_ANALYTICS_ACCESS_TOKEN;
  else process.env.VERCEL_ANALYTICS_ACCESS_TOKEN = originalToken;
  if (originalProject == null) delete process.env.VERCEL_ANALYTICS_PROJECT_ID;
  else process.env.VERCEL_ANALYTICS_PROJECT_ID = originalProject;
  if (originalTeam == null) delete process.env.VERCEL_ANALYTICS_TEAM_ID;
  else process.env.VERCEL_ANALYTICS_TEAM_ID = originalTeam;
  __clearAdminWebTrafficCacheForTests();
}

const { isExcludedAnalyticsParentEmail, isIncludedAnalyticsStudent } = await import(
  u("lib/admin-server/admin-analytics-production-filter.server.js")
);
assert.equal(isExcludedAnalyticsParentEmail("guest-system@liosh.invalid"), true);
assert.equal(isExcludedAnalyticsParentEmail("parent@example.com"), false);
assert.equal(
  isIncludedAnalyticsStudent({ id: "s1", account_kind: "guest", parent_id: "p1" }, new Map()),
  true
);
assert.equal(
  isIncludedAnalyticsStudent(
    { id: "s2", account_kind: "registered", parent_id: "p2" },
    new Map([["p2", "guest-system@liosh.invalid"]])
  ),
  false
);

console.log("admin-analytics-web-traffic-selftest: OK");
