/**
 * Public worksheet visit analytics — session, API wiring, admin metrics, rate limits.
 * Run: node --test tests/worksheets/public-worksheet-visit-analytics.test.mjs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  rejectIfPublicWorksheetAnalyticsEventRateLimited,
} from "../../lib/security/public-api-rate-limit.js";
import {
  ACTOR_TYPE_CHECK_VALUES_AFTER,
  ACTOR_TYPE_CHECK_VALUES_BEFORE,
  resolveActorTypeCheckMigration,
} from "../../lib/analytics/public-worksheet-actor-type-check-migration.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_B = "22222222-2222-4222-8222-222222222222";

function mockReq(ip = "test-public-ws-analytics-ip") {
  return { headers: {}, socket: { remoteAddress: ip } };
}

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  return res;
}

/** @type {Map<string, string>} */
let sessionStore;

function installSessionStorageMock() {
  sessionStore = new Map();
  const storage = {
    getItem(key) {
      return sessionStore.has(key) ? sessionStore.get(key) : null;
    },
    setItem(key, value) {
      sessionStore.set(key, String(value));
    },
    removeItem(key) {
      sessionStore.delete(key);
    },
    clear() {
      sessionStore.clear();
    },
  };
  global.sessionStorage = storage;
  global.window = { sessionStorage: storage };
}

function uninstallSessionStorageMock() {
  delete global.sessionStorage;
  delete global.window;
  sessionStore = new Map();
}

describe("public-worksheet-visit-analytics", () => {
  beforeEach(() => {
    installSessionStorageMock();
  });

  afterEach(() => {
    uninstallSessionStorageMock();
  });

  test("session helper reuses UUID within tab session and marks page view once", async () => {
    const sessionMod = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-session.client.js")).href
    );
    const trackMod = await import(
      pathToFileURL(join(ROOT, "lib/analytics/track-public-worksheet-page-view.client.js")).href
    );

    const first = sessionMod.getPublicWorksheetVisitSessionId();
    const second = sessionMod.getPublicWorksheetVisitSessionId();
    assert.ok(first);
    assert.equal(first, second);

    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url, body: init?.body });
      return { ok: true, json: async () => ({ ok: true }) };
    };

    trackMod.trackPublicWorksheetPageViewedOnce();
    trackMod.trackPublicWorksheetPageViewedOnce();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/public/analytics/worksheet-event");
    const payload = JSON.parse(String(calls[0].body));
    assert.equal(payload.visitSessionId, first);
    assert.equal(payload.eventName, undefined);
    assert.equal(sessionMod.wasPublicWorksheetPageViewSent(), true);

    delete global.fetch;
  });

  test("React Strict Mode double-mount sends page view only once", async () => {
    const trackMod = await import(
      pathToFileURL(join(ROOT, "lib/analytics/track-public-worksheet-page-view.client.js")).href
    );
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url, body: init?.body });
      return { ok: true, json: async () => ({ ok: true }) };
    };

    trackMod.trackPublicWorksheetPageViewedOnce();
    trackMod.trackPublicWorksheetPageViewedOnce();

    assert.equal(calls.length, 1);
    delete global.fetch;
  });

  test("refresh in same tab keeps UUID (sessionStorage persists)", async () => {
    const sessionMod = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-session.client.js")).href
    );
    sessionMod.getPublicWorksheetVisitSessionId();
    sessionMod.markPublicWorksheetPageViewSent();
    const afterRefresh = sessionMod.getPublicWorksheetVisitSessionId();
    assert.ok(sessionMod.wasPublicWorksheetPageViewSent());
    assert.match(afterRefresh, /^[0-9a-f-]{36}$/i);
  });

  test("new tab session gets new UUID when storage is empty", async () => {
    const sessionMod = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-session.client.js")).href
    );
    const tabA = sessionMod.getPublicWorksheetVisitSessionId();
    sessionStore.clear();
    const tabB = sessionMod.getPublicWorksheetVisitSessionId();
    assert.notEqual(tabA, tabB);
  });

  test("successful generation records analytics server-side with visitSessionId", () => {
    const generateSrc = readFileSync(join(ROOT, "pages/api/public/worksheets/generate.js"), "utf8");
    assert.match(generateSrc, /public_worksheet_generated/);
    assert.match(generateSrc, /visitSessionId/);
    assert.match(generateSrc, /schedulePublicWorksheetAnalyticsWork/);
    assert.match(generateSrc, /isValidPublicWorksheetVisitSessionId/);
  });

  test("failed generation path returns before analytics insert", () => {
    const generateSrc = readFileSync(join(ROOT, "pages/api/public/worksheets/generate.js"), "utf8");
    const failReturn = generateSrc.indexOf('error: generated.code');
    const analyticsBlock = generateSrc.indexOf("public_worksheet_generated");
    assert.ok(failReturn > -1 && analyticsBlock > failReturn);
  });

  test("admin metrics: multiple generations in one visit count once for unique visits", async () => {
    const { buildPublicWorksheetVisitAnalytics } = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-analytics.server.js")).href
    );
    const events = [
      {
        actor_type: "visitor",
        session_id: VALID_UUID,
        event_name: "public_worksheet_page_viewed",
      },
      {
        actor_type: "visitor",
        session_id: VALID_UUID,
        event_name: "public_worksheet_generated",
      },
      {
        actor_type: "visitor",
        session_id: VALID_UUID,
        event_name: "public_worksheet_generated",
      },
    ];
    const stats = buildPublicWorksheetVisitAnalytics(events);
    assert.equal(stats.visitCount, 1);
    assert.equal(stats.visitsWithGeneration, 1);
    assert.equal(stats.totalGenerations, 2);
    assert.equal(stats.visitsWithoutGeneration, 0);
    assert.equal(stats.usageRate, 100);
  });

  test("admin metrics: generation-only session is not counted as page visit", async () => {
    const { buildPublicWorksheetVisitAnalytics } = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-analytics.server.js")).href
    );
    const stats = buildPublicWorksheetVisitAnalytics([
      {
        actor_type: "visitor",
        session_id: VALID_UUID,
        event_name: "public_worksheet_generated",
      },
    ]);
    assert.equal(stats.visitCount, 0);
    assert.equal(stats.visitsWithGeneration, 0);
    assert.equal(stats.visitsWithoutGeneration, 0);
    assert.equal(stats.totalGenerations, 1);
  });

  test("admin metrics: page view without generation", async () => {
    const { buildPublicWorksheetVisitAnalytics } = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-analytics.server.js")).href
    );
    const stats = buildPublicWorksheetVisitAnalytics([
      {
        actor_type: "visitor",
        session_id: VALID_UUID,
        event_name: "public_worksheet_page_viewed",
      },
      {
        actor_type: "visitor",
        session_id: VALID_UUID_B,
        event_name: "public_worksheet_page_viewed",
      },
    ]);
    assert.equal(stats.visitCount, 2);
    assert.equal(stats.visitsWithoutGeneration, 2);
    assert.equal(stats.visitsWithGeneration, 0);
  });

  test("public analytics endpoint accepts visitSessionId only and rejects client event names", () => {
    const endpointSrc = readFileSync(
      join(ROOT, "pages/api/public/analytics/worksheet-event.js"),
      "utf8"
    );
    assert.match(endpointSrc, /PAGE_VIEW_EVENT/);
    assert.match(endpointSrc, /invalid_visit_session/);
    assert.match(endpointSrc, /body\?\.eventName/);
    assert.match(endpointSrc, /invalid_event/);
    assert.doesNotMatch(endpointSrc, /body\.metadata/);
    assert.doesNotMatch(endpointSrc, /pagePath.*body/);
    assert.doesNotMatch(endpointSrc, /normalizePublicWorksheetEventName\(body/);
    assert.match(endpointSrc, /rejectIfPublicWorksheetAnalyticsEventRateLimited/);
    assert.match(endpointSrc, /schedulePublicWorksheetAnalyticsWork/);
  });

  test("invalid event name and UUID are rejected by server helpers", async () => {
    const {
      isValidPublicWorksheetVisitSessionId,
      normalizePublicWorksheetEventName,
    } = await import(
      pathToFileURL(join(ROOT, "lib/analytics/public-worksheet-analytics.server.js")).href
    );
    assert.equal(normalizePublicWorksheetEventName("not_allowed"), null);
    assert.equal(normalizePublicWorksheetEventName("public_worksheet_page_viewed"), "public_worksheet_page_viewed");
    assert.equal(isValidPublicWorksheetVisitSessionId("not-a-uuid"), false);
    assert.equal(isValidPublicWorksheetVisitSessionId(VALID_UUID), true);
  });

  test("rate limit blocks public worksheet analytics endpoint in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const req = mockReq(`ws-analytics-limit-${Date.now()}`);
      for (let i = 0; i < 30; i++) {
        assert.equal(rejectIfPublicWorksheetAnalyticsEventRateLimited(req, mockRes()), false, `attempt ${i}`);
      }
      const res = mockRes();
      const blocked = rejectIfPublicWorksheetAnalyticsEventRateLimited(req, res);
      assert.equal(blocked, true);
      assert.equal(res.statusCode, 429);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  test("analytics scheduling uses waitUntil and does not block worksheet hub UI", () => {
    const hubSrc = readFileSync(
      join(ROOT, "components/worksheets/PublicWorksheetsHub.client.jsx"),
      "utf8"
    );
    assert.match(hubSrc, /trackPublicWorksheetPageViewedOnce/);
    assert.match(hubSrc, /visitSessionId/);
    assert.doesNotMatch(hubSrc, /await fetch\("\/api\/public\/analytics/);

    const serverSrc = readFileSync(
      join(ROOT, "lib/analytics/public-worksheet-analytics.server.js"),
      "utf8"
    );
    assert.match(serverSrc, /waitUntil/);
  });

  test("event catalog includes only the two public worksheet events", () => {
    const catalogSrc = readFileSync(join(ROOT, "lib/analytics/event-catalog.js"), "utf8");
    assert.match(catalogSrc, /public_worksheet_page_viewed/);
    assert.match(catalogSrc, /public_worksheet_generated/);
  });

  test("admin analytics query filters public worksheet visits in database", () => {
    const adminSrc = readFileSync(
      join(ROOT, "lib/admin-server/admin-analytics.server.js"),
      "utf8"
    );
    assert.match(adminSrc, /\.eq\("actor_type",\s*"visitor"\)/);
    assert.match(adminSrc, /\.in\("event_name",\s*\[\.\.\.PUBLIC_WORKSHEET_ANALYTICS_EVENTS\]\)/);
    assert.match(adminSrc, /\.gte\("created_at",\s*range\.fromIso\)/);
    assert.match(adminSrc, /\.lt\("created_at",\s*range\.toIsoExclusive\)/);
    assert.match(adminSrc, /buildPublicWorksheetVisitAnalytics\(\s*publicWorksheetVisitorEventsResult/);
  });

  test("actor_type CHECK with five original values requires migration", () => {
    const def =
      "CHECK (actor_type IN ('parent', 'student', 'teacher', 'admin', 'system'))";
    assert.equal(resolveActorTypeCheckMigration([def]), "migrate");
  });

  test("actor_type CHECK with six exact values is idempotent", () => {
    const def =
      "CHECK (actor_type IN ('parent', 'student', 'teacher', 'admin', 'system', 'visitor'))";
    assert.equal(resolveActorTypeCheckMigration([def]), "noop");
  });

  test("actor_type CHECK with visitor but missing original value fails", () => {
    const def = "CHECK (actor_type IN ('parent', 'student', 'teacher', 'admin', 'visitor'))";
    assert.throws(
      () => resolveActorTypeCheckMigration([def]),
      /unexpected actor_type CHECK values/
    );
  });

  test("actor_type CHECK with unexpected extra value fails", () => {
    const def =
      "CHECK (actor_type IN ('parent', 'student', 'teacher', 'admin', 'system', 'guest'))";
    assert.throws(
      () => resolveActorTypeCheckMigration([def]),
      /unexpected actor_type CHECK values/
    );
  });

  test("missing actor_type CHECK fails", () => {
    assert.throws(
      () => resolveActorTypeCheckMigration(["CHECK (jsonb_typeof(metadata) = 'object')"]),
      /no actor_type CHECK constraint found/
    );
  });

  test("multiple actor_type CHECK constraints fail", () => {
    const defs = [
      "CHECK (actor_type IN ('parent', 'student', 'teacher', 'admin', 'system'))",
      "CHECK (actor_type IN ('parent', 'student', 'teacher', 'admin', 'system'))",
    ];
    assert.throws(
      () => resolveActorTypeCheckMigration(defs),
      /multiple actor_type CHECK constraints found/
    );
  });

  test("migration validates full actor_type value sets and index for date-range query", () => {
    const migrationSrc = readFileSync(
      join(ROOT, "supabase/migrations/100_public_worksheet_visitor_analytics.sql"),
      "utf8"
    );
    assert.match(migrationSrc, /migration100_parse_actor_type_values/);
    assert.match(migrationSrc, /expected_before text\[\]/);
    assert.match(migrationSrc, /expected_after text\[\]/);
    assert.match(migrationSrc, /parsed_vals = expected_after/);
    assert.match(migrationSrc, /parsed_vals = expected_before/);
    assert.match(migrationSrc, /actor_check_count > 1/);
    assert.doesNotMatch(migrationSrc, /constraint_def ~\* '''visitor'''/i);
    assert.match(migrationSrc, /analytics_events_public_worksheet_visit_idx/);
    assert.match(migrationSrc, /\(created_at desc, session_id\)/);
    assert.doesNotMatch(migrationSrc, /created_at desc, event_name, session_id/);

    assert.deepEqual(
      ACTOR_TYPE_CHECK_VALUES_BEFORE,
      ["admin", "parent", "student", "system", "teacher"]
    );
    assert.deepEqual(ACTOR_TYPE_CHECK_VALUES_AFTER, [
      ...ACTOR_TYPE_CHECK_VALUES_BEFORE,
      "visitor",
    ]);
  });
});
