import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const api = read("pages/api/admin/analytics.js");
assert.match(api, /requireAdminApiContext/, "admin analytics API must use admin guard");
assert.match(api, /getAdminAnalyticsDashboard/, "admin analytics API must use server aggregation");
assert.ok(
  api.indexOf("requireAdminApiContext") < api.indexOf("getAdminAnalyticsDashboard"),
  "admin guard must run before aggregation"
);

const page = read("pages/admin/analytics.js");
assert.match(page, /adminAuthFetch\(token, `\/api\/admin\/analytics\?/, "page must call admin API with bearer token");
assert.doesNotMatch(page, /demo|mock|fake/i, "admin analytics page must not contain demo/mock/fake data");
for (const label of [
  "חשבונות וצמיחה",
  "הצטרפות הורים ואונבורדינג",
  "הצטרפות ילדים",
  "מורים פרטיים",
  "משפכים",
  "שימור וחזרה לשימוש",
  "נטישה ומועמדי נטישה",
  "שימוש בתכונות",
]) {
  assert.match(page, new RegExp(label), `admin analytics page missing final section: ${label}`);
}
assert.match(page, /אין נתונים עדיין/, "page must render empty state text");
assert.match(page, /אין מספיק נתונים עדיין/, "page must render not-enough-data text");

const server = read("lib/admin-server/admin-analytics.server.js");
assert.match(server, /notTracked\(/, "server must model not-tracked metrics explicitly");
assert.match(server, /requiresEvents\(/, "server must model event-required metrics explicitly");
assert.match(server, /emptyMetric\(/, "server must model empty metrics explicitly");
assert.match(server, /notEnoughMetric\(/, "server must model not-enough-data metrics explicitly");
assert.match(server, /analytics_events/, "server must read analytics_events when available");
for (const fn of ["buildFunnels", "buildRetention", "buildAbandonment", "buildFeatureUsage"]) {
  assert.match(server, new RegExp(`function ${fn}\\(`), `server missing ${fn}`);
}
for (const fn of ["buildAccountAnalytics", "buildParentJoinAnalytics", "buildChildJoinAnalytics", "buildTeacherAnalytics"]) {
  assert.match(server, new RegExp(`function ${fn}\\(`), `server missing ${fn}`);
}
assert.doesNotMatch(server, /school_/i, "admin analytics server must not add school analytics scope");
assert.doesNotMatch(server, /Math\.random\(/, "server metrics must not use random/demo values");

const migration = read("supabase/migrations/057_admin_analytics_events.sql");
assert.match(migration, /create table if not exists public\.analytics_events/, "analytics_events migration missing");
assert.match(migration, /enable row level security/, "analytics_events must have RLS enabled");
for (const column of ["event_family", "feature_key", "object_type", "object_id", "idempotency_key"]) {
  assert.match(migration, new RegExp(column), `analytics_events migration missing ${column}`);
}
assert.match(migration, /analytics_events_metadata_sensitive_keys_chk/, "migration must block sensitive metadata keys");
assert.match(migration, /analytics_events_idempotency_key_uq/, "migration must support event deduplication");
assert.doesNotMatch(migration, /create policy .* for select .* authenticated/is, "analytics_events must not expose broad authenticated reads");

const eventApi = read("pages/api/analytics/events.js");
assert.match(eventApi, /getAuthenticatedStudentSession/, "event API must support student cookie auth");
assert.match(eventApi, /getLearningSupabaseServerUserClient/, "event API must support bearer auth");
assert.match(eventApi, /sanitizeMetadata/, "event API must sanitize metadata");
assert.match(eventApi, /blocked/, "event API must block sensitive metadata keys");
assert.match(eventApi, /not_authenticated/, "event API must reject unauthenticated browser callers");

const catalog = read("lib/analytics/event-catalog.js");
for (const eventName of [
  "parent_login",
  "teacher_login",
  "teacher_dashboard_opened",
  "teacher_report_opened",
  "teacher_activity_created",
  "teacher_worksheet_created",
  "student_login",
  "practice_started",
  "practice_abandoned",
  "book_opened",
  "audio_played",
  "worksheet_opened",
  "reward_earned",
  "admin_analytics_opened",
]) {
  assert.match(catalog, new RegExp(eventName), `event catalog missing ${eventName}`);
}

const catalogDoc = read("docs/qa/admin-analytics/ANALYTICS_EVENT_CATALOG.md");
assert.match(catalogDoc, /fully instrumented/, "event catalog doc must state instrumentation status");
assert.match(catalogDoc, /partially instrumented/, "event catalog doc must document partial instrumentation");

console.log("PASS admin analytics static selftest");
