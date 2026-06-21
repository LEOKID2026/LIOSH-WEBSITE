#!/usr/bin/env node
/**
 * Performance audit for student home (/student/home waterfall).
 *
 * Direct DB step timings (no dev server):
 *   node --env-file=.env.local scripts/tests/audit-student-home-performance.mjs
 *
 * HTTP waterfall (dev server + E2E creds):
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/tests/audit-student-home-performance.mjs --http
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runHttp = process.argv.includes("--http");
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";

function loadEnv(file) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env.e2e.local");

const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const serviceRole = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function kb(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

async function findSampleStudentId() {
  const envId = process.env.AUDIT_STUDENT_ID?.trim();
  if (envId) return envId;
  const { data } = await serviceRole.from("students").select("id, full_name, grade_level").limit(1).maybeSingle();
  return data?.id || null;
}

async function timed(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - t0);
  let bytes = 0;
  try {
    bytes = JSON.stringify(result).length;
  } catch {
    bytes = 0;
  }
  return { label, ms, kb: kb(bytes), result };
}

async function measureDirectSteps(studentId) {
  const profUrl = pathToFileURL(join(ROOT, "lib/learning-supabase/student-learning-profile.server.js")).href;
  const missionUrl = pathToFileURL(join(ROOT, "lib/learning-supabase/mission-progress.server.js")).href;
  const monthlyUrl = pathToFileURL(join(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js")).href;
  const economyUrl = pathToFileURL(join(ROOT, "lib/rewards/server/economy-config.server.js")).href;
  const snapUrl = pathToFileURL(join(ROOT, "lib/learning-shared/student-account-state-view.js")).href;
  const homeViewUrl = pathToFileURL(join(ROOT, "lib/learning-client/studentHomeDashboardClient.js")).href;

  const {
    ensureStudentLearningStateRow,
    normalizeLearningProfileRow,
    computeStudentLearningDerived,
  } = await import(profUrl);
  const { ensureDailyMissionsInDb } = await import(missionUrl);
  const { evaluateMonthlyPersistenceReward } = await import(monthlyUrl);
  const { buildStudentEconomyConfigPayload } = await import(economyUrl);
  const { buildAccountSnapshotForParentReport } = await import(snapUrl);
  const { buildStudentHomeView } = await import(homeViewUrl);

  const { data: student } = await serviceRole
    .from("students")
    .select("id, full_name, grade_level, coin_balance")
    .eq("id", studentId)
    .maybeSingle();

  const rows = [];

  const rowStep = await timed("learning_state_row", () => ensureStudentLearningStateRow(serviceRole, studentId));
  rows.push(rowStep);
  const row = rowStep.result;
  const normalized = normalizeLearningProfileRow(row);

  rows.push(await timed("missions (ensureDailyMissionsInDb)", () =>
    ensureDailyMissionsInDb(serviceRole, studentId, student?.grade_level || "")
  ));
  rows.push(await timed("economy_config", () => buildStudentEconomyConfigPayload(serviceRole)));
  rows.push(await timed("learning_derived (computeStudentLearningDerived)", () =>
    computeStudentLearningDerived(serviceRole, studentId)
  ));

  const derived = rows.find((r) => r.label.startsWith("learning_derived"))?.result;
  rows.push(await timed("account_snapshot", () =>
    buildAccountSnapshotForParentReport(normalized, derived, student?.full_name || "Student")
  ));
  rows.push(await timed("monthly_persistence_eval", () =>
    evaluateMonthlyPersistenceReward(serviceRole, { studentId })
  ));

  const summaryPayload = {
    ok: true,
    phase: "summary",
    studentId,
    profile: normalized.profile,
    challenges: row.challenges,
    subjectsProgressOnly: {},
    analyticsPending: true,
  };
  rows.push({
    label: "summary_payload_json",
    ms: 0,
    kb: kb(JSON.stringify(summaryPayload).length),
    result: summaryPayload,
  });

  const analyticsPayload = {
    ok: true,
    derived,
    accountSnapshot: rows.find((r) => r.label === "account_snapshot")?.result,
  };
  rows.push({
    label: "analytics_payload_json",
    ms: 0,
    kb: kb(JSON.stringify(analyticsPayload).length),
    result: analyticsPayload,
  });

  const shellView = buildStudentHomeView({ student, homePayload: summaryPayload });
  rows.push({
    label: "buildStudentHomeView (shell)",
    ms: 0,
    kb: kb(JSON.stringify(shellView).length),
    result: shellView,
  });

  console.log("\n=== Direct step timings (studentId=%s) ===\n", studentId);
  console.table(rows.map(({ label, ms, kb: sizeKb }) => ({ step: label, ms, size: sizeKb })));

  const summarySteps = ["learning_state_row", "missions (ensureDailyMissionsInDb)", "economy_config"];
  const analyticsSteps = [
    "learning_derived (computeStudentLearningDerived)",
    "account_snapshot",
    "monthly_persistence_eval",
  ];

  const summaryMs = summarySteps.reduce((acc, key) => acc + (rows.find((r) => r.label === key)?.ms || 0), 0);
  const analyticsMs = analyticsSteps.reduce((acc, key) => acc + (rows.find((r) => r.label === key)?.ms || 0), 0);
  const legacyMs = summaryMs + analyticsMs;

  console.log("\nEstimated split path: summary ~%dms | analytics ~%dms | total ~%dms", summaryMs, analyticsMs, legacyMs);
  console.log("Bottleneck: %s", rows.sort((a, b) => b.ms - a.ms)[0]?.label || "unknown");

  return { summaryMs, analyticsMs, legacyMs, rows };
}

async function obtainStudentCookie() {
  const username = process.env.E2E_STUDENT_USERNAME?.trim();
  const pin = process.env.E2E_STUDENT_PIN?.trim();
  if (!username || !pin) return null;

  const loginRes = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, pin }),
  }).catch(() => null);

  const match = loginRes?.headers?.get("set-cookie")?.match(/liosh_student_session=([^;]+)/);
  return match ? `liosh_student_session=${match[1]}` : null;
}

async function measureHttp() {
  const cookie = await obtainStudentCookie();
  if (!cookie) {
    console.warn("\nHTTP audit skipped — set E2E_STUDENT_USERNAME + E2E_STUDENT_PIN.");
    return null;
  }

  const rows = [];

  async function fetchTimed(path, method = "GET") {
    const t0 = performance.now();
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { cookie, accept: "application/json" },
    });
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    return { path, status: res.status, ms, size: kb(text.length), text };
  }

  // Browser-like sequential critical path (same order as pages/student/home.js)
  const me = await fetchTimed("/api/student/me");
  rows.push(me);

  const summary = await fetchTimed("/api/student/home-profile/summary");
  rows.push(summary);

  const shellVisibleMs = me.ms + summary.ms;

  const analyticsPromise = fetchTimed("/api/student/home-profile/analytics");
  const grantsPromise = fetchTimed("/api/student/home-profile/achievement-grants", "POST");
  const activitiesPromise = fetchTimed("/api/student/activities");
  const surprisePromise = fetchTimed("/api/student/rewards/surprise-box/status");

  const [analytics, grants, activities, surprise] = await Promise.all([
    analyticsPromise,
    grantsPromise,
    activitiesPromise,
    surprisePromise,
  ]);
  rows.push(analytics, grants, activities, surprise);

  console.log("\n=== HTTP waterfall — browser order (%s) ===\n", BASE_URL);
  console.table(rows.map(({ path, status, ms, size }) => ({ path, status, ms, size })));

  console.log("\n--- Critical path (all 8 tiles + coins from summary) ---");
  console.log("  /me:      %dms", me.ms);
  console.log("  /summary: %dms", summary.ms);
  console.log("  TOTAL until real tile data: ~%dms", shellVisibleMs);

  console.log("\n--- Deferred (background, non-blocking for tiles) ---");
  console.log("  /analytics:         %dms", analytics.ms);
  console.log("  /achievement-grants:%dms", grants.ms);
  console.log("  /activities:        %dms", activities.ms);
  console.log("  /surprise-box/status:%dms", surprise.ms);

  const near30s = [analytics, grants].some((r) => r.ms >= 25_000);
  console.log("\nNear 30s on critical path: %s", shellVisibleMs >= 25_000 ? "YES" : "NO");
  console.log("Near 30s on deferred grants: %s", grants.ms >= 25_000 ? "YES (ok — background)" : "NO");

  return { rows, shellVisibleMs, meMs: me.ms, summaryMs: summary.ms, analyticsMs: analytics.ms, legacyMs: legacy.ms };
}

async function main() {
  const studentId = await findSampleStudentId();
  if (!studentId) {
    console.error("No sample student — set AUDIT_STUDENT_ID");
    process.exit(1);
  }

  await measureDirectSteps(studentId);

  if (runHttp) {
    await measureHttp();
  } else {
    console.log("\nTip: pass --http with dev server + E2E creds for live endpoint timings.");
    console.log("Set STUDENT_HOME_PROFILE_PERF=true on the dev server for per-step server logs.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
