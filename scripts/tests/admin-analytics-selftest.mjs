import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (rel) => readFileSync(path.join(root, rel), "utf8");
const u = (rel) => pathToFileURL(path.join(root, rel)).href;

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
  "סקירה כללית",
  "תנועה באתר",
  "חשבונות",
  "הורים",
  "ילדים",
  "למידה",
  "דוחות",
  "פעילויות אישיות",
  "מורים פרטיים",
  "ספרים ושמע",
  "משפכי שימוש",
  "חזרה לשימוש",
  "נטישה",
  "שימוש",
  "בדיקות אמת",
]) {
  assert.match(page, new RegExp(label), `admin analytics page missing main tab: ${label}`);
}
assert.match(page, /ANALYTICS_MAIN_TABS/, "page must define main tab navigation");
assert.match(page, /data-analytics-tab-bar/, "page must mark tab bar for layout QA");
assert.match(page, /data-analytics-filter-summary/, "page must use compact collapsible filter summary");
assert.match(page, /שינוי סינון/, "filters must open via compact toggle button");
assert.match(page, /buildFilterSummary/, "page must build compact filter summary line");
assert.match(page, /filtersOpen/, "filters must default to closed state");
assert.match(page, /data-analytics-page-root/, "page must mark root container for layout QA");
assert.match(page, /flex flex-wrap gap-1\.5 w-full max-w-full/, "tab bar must wrap tabs instead of horizontal scroll");
assert.doesNotMatch(page, /overflow-x-auto/, "analytics page must not use horizontal scroll containers");
assert.doesNotMatch(page, /overflow-x-scroll/, "analytics page must not use horizontal scroll containers");
assert.doesNotMatch(page, /scrollbar-thin/, "analytics tab bar must not use inner scrollbar");
assert.doesNotMatch(page, /whitespace-nowrap/, "analytics page must allow text wrap to prevent overflow");
assert.doesNotMatch(page, /TopList title="מטבעות לפי סיבה"/, "panel content must not repeat accordion title");
assert.doesNotMatch(page, /TopList title="מטבעות לפי יום"/, "panel content must not repeat accordion title");
assert.match(page, /CollapsiblePanel/, "page must use collapsible panels");
assert.match(page, /defaultOpen=\{false\}/, "collapsible panels must default to closed");
assert.match(page, /aria-expanded/, "collapsible panels must expose expanded state");
assert.match(page, /data-analytics-panel/, "collapsible panels must be identifiable for QA");
assert.match(page, /activeTab/, "page must render one tab at a time");
assert.match(page, /data-analytics-active-tab/, "page must mark active tab container");
assert.match(page, /פתח הכל בטאב/, "page must offer expand-all in current tab");
assert.match(page, /סגור הכל בטאב/, "page must offer collapse-all in current tab");
assert.doesNotMatch(page, /function Section\(/, "page must not render all legacy open sections at once");
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

assert.match(server, /buildUserActivityAnalytics/, "server must build user activity analytics");
assert.match(server, /solo_game_sessions/, "server must include solo game sessions");

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

const labelsPage = read("pages/admin/analytics.js");
assert.match(labelsPage, /formatAnalyticsLabelHe/, "page must format visible table labels in Hebrew");
assert.match(labelsPage, /formatAnalyticsGradeHe/, "page must format grade column labels in Hebrew");

const labelsModule = read("lib/admin-portal/admin-analytics-labels.he.js");
for (const fn of [
  "formatAnalyticsSubjectHe",
  "formatAnalyticsTopicHe",
  "formatAnalyticsSkillHe",
  "formatAnalyticsGradeHe",
  "formatAnalyticsCompositeNameHe",
  "formatAnalyticsFeatureHe",
  "findAdminAnalyticsEnglishEnumLeaks",
]) {
  assert.match(labelsModule, new RegExp(`export function ${fn}\\(`), `labels module missing ${fn}`);
}

const {
  formatAnalyticsLabelHe,
  findAdminAnalyticsEnglishEnumLeaks,
} = await import(u("lib/admin-portal/admin-analytics-labels.he.js"));

const forbiddenFixtureLabels = [
  "body",
  "reading",
  "multiplication",
  "matter",
  "angles",
  "addition : g1",
  "vocabulary : g4",
  "area : g3",
  "grade_2",
  "grade_5",
  "practice",
  "learning_book",
  "worksheet",
  "parent_assigned_activity",
  "teacher_dashboard_opened",
  "private_teacher",
];

for (const raw of forbiddenFixtureLabels) {
  const visible = formatAnalyticsLabelHe(raw);
  const leaks = findAdminAnalyticsEnglishEnumLeaks(visible);
  assert.equal(
    leaks.length,
    0,
    `visible label for ${JSON.stringify(raw)} must be Hebrew-only, got "${visible}" leaks: ${leaks.join(", ")}`
  );
}

assert.equal(formatAnalyticsLabelHe("addition : g1"), "חיבור · כיתה א׳");
assert.equal(formatAnalyticsLabelHe("חשבון · grade_2"), "חשבון · כיתה ב׳");

console.log("PASS admin analytics static selftest");
