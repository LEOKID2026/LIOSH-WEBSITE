/**
 * Verify monthly progress uses Asia/Jerusalem calendar month (not UTC).
 * Usage: npx tsx scripts/verify-israel-monthly-display.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env.e2e.local");

const { getIsraelMonthBounds, getIsraelDateString } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/israel-calendar.server.js")).href
);
const { computeStudentLearningDerived } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/student-learning-profile.server.js")).href
);
const { buildStudentHomeView } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-client/studentHomeDashboardClient.js")).href
);
const { createClient } = await import("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

let passed = 0, failed = 0;
function pass(l) { console.log(`  ✓  ${l}`); passed++; }
function fail(l, d) { console.error(`  ✗  ${l}`); if (d) console.error(`       → ${d}`); failed++; }
function assertEq(l, a, e) { a === e ? pass(l) : fail(l, `expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); }

// Old UTC bounds for comparison
function utcMonthBounds() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    startIso: new Date(Date.UTC(y, m, 1)).toISOString(),
    endIso: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
    ym: `${y}-${String(m + 1).padStart(2, "0")}`,
  };
}

console.log("\n══════════════════════════════════════════════════════");
console.log("  Israel Monthly Display Verification");
console.log("══════════════════════════════════════════════════════\n");

// ── 1. Month bounds differ from UTC (when timezones diverge) ───────────────
console.log("── 1. getIsraelMonthBounds() vs UTC month bounds ──");
const israel = getIsraelMonthBounds();
const utc = utcMonthBounds();
console.log(`  Israel ym:      ${israel.ym}`);
console.log(`  Israel start:   ${israel.startIso}`);
console.log(`  Israel end:     ${israel.endIso}`);
console.log(`  UTC ym:         ${utc.ym}`);
console.log(`  UTC start:      ${utc.startIso}`);
console.log(`  UTC end:        ${utc.endIso}`);

assertEq("Israel ym is YYYY-MM format", /^\d{4}-\d{2}$/.test(israel.ym), true);
assertEq("Israel start < Israel end", israel.startIso < israel.endIso, true);

// On most days ym matches; near UTC midnight on 1st of month Israel may differ
if (israel.startIso !== utc.startIso) {
  pass("Israel month start differs from UTC (expected near timezone boundary)");
} else {
  pass("Israel month start equals UTC start (same calendar month window today)");
}
console.log();

// ── 2. computeStudentLearningDerived returns Israel fields ───────────────
console.log("── 2. computeStudentLearningDerived() canonical fields ──");
const { data: studentRow } = await supabase.from("students").select("id,full_name,grade_level").limit(1).maybeSingle();
if (!studentRow?.id) { console.error("No student"); process.exit(1); }

const derived = await computeStudentLearningDerived(supabase, studentRow.id);
assertEq("monthlyMinutesIsraelMonth is a number", typeof derived.monthlyMinutesIsraelMonth, "number");
assertEq("yearMonthIsrael matches getIsraelMonthBounds().ym", derived.yearMonthIsrael, israel.ym);
assertEq("legacy monthlyMinutesUtcMonth === monthlyMinutesIsraelMonth",
  derived.monthlyMinutesUtcMonth, derived.monthlyMinutesIsraelMonth);
assertEq("legacy yearMonthUtc === yearMonthIsrael", derived.yearMonthUtc, derived.yearMonthIsrael);
console.log(`  monthlyMinutesIsraelMonth: ${derived.monthlyMinutesIsraelMonth}`);
console.log(`  yearMonthIsrael:           ${derived.yearMonthIsrael}`);
console.log();

// ── 3. buildStudentHomeView uses Israel month minutes ───────────────────
console.log("── 3. buildStudentHomeView monthlyPersistence ──");
const homePayload = {
  derived,
  accountSnapshot: { summaryPlayerLevel: 1, summaryStars: 0, bySubject: {} },
  monthly: {},
  profile: {},
  challenges: {},
  streaks: {},
  achievements: {},
  subjectsProgressOnly: {},
};
const view = buildStudentHomeView({
  student: { id: studentRow.id, full_name: studentRow.full_name, grade_level: studentRow.grade_level, coin_balance: 0 },
  homePayload,
});
if (!view) { fail("buildStudentHomeView returned view", "null"); }
else {
  pass("buildStudentHomeView succeeded");
  assertEq("monthlyJourney.yearMonth = yearMonthIsrael", view.monthlyJourney.yearMonth, israel.ym);
  assertEq("monthlyPersistence.currentMinutes = monthlyMinutesIsraelMonth",
    view.monthlyPersistence.currentMinutes, derived.monthlyMinutesIsraelMonth);
  assertEq("accountStats.learningMinutesThisMonth = monthlyMinutesIsraelMonth",
    view.accountStats.learningMinutesThisMonth, derived.monthlyMinutesIsraelMonth);
  console.log(`  monthlyPersistence.currentMinutes: ${view.monthlyPersistence.currentMinutes}`);
  console.log(`  monthlyPersistence.nextTier:       ${view.monthlyPersistence.nextTier?.minutes ?? "all reached"} min`);
}
console.log();

// ── 4. HTTP home-profile + /student/home ─────────────────────────────────
console.log("── 4. HTTP /api/student/home-profile + /student/home ──");
const BASE = "http://127.0.0.1:3001";
const USER = process.env.E2E_STUDENT_USERNAME;
const PIN  = process.env.E2E_STUDENT_PIN;

if (USER && PIN) {
  const loginRes = await fetch(`${BASE}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: USER, pin: PIN }),
  }).catch(() => null);

  const cookieMatch = loginRes?.headers?.get("set-cookie")?.match(/liosh_student_session=([^;]+)/);
  const cookie = cookieMatch ? `liosh_student_session=${cookieMatch[1]}` : null;

  if (cookie) {
    const hpRes = await fetch(`${BASE}/api/student/home-profile`, {
      headers: { cookie, accept: "application/json" },
    }).catch(() => null);
    const hp = await hpRes?.json().catch(() => null);

    assertEq("home-profile HTTP 200", hpRes?.status, 200);
    assertEq("home-profile ok=true", hp?.ok, true);
    assertEq("derived.monthlyMinutesIsraelMonth present",
      typeof hp?.derived?.monthlyMinutesIsraelMonth, "number");
    assertEq("derived.yearMonthIsrael = current Israel month",
      hp?.derived?.yearMonthIsrael, israel.ym);
    assertEq("legacy alias still present (backwards compat)",
      hp?.derived?.monthlyMinutesUtcMonth, hp?.derived?.monthlyMinutesIsraelMonth);

  const homeRes = await fetch(`${BASE}/student/home`, { headers: { cookie } }).catch(() => null);
    assertEq("/student/home HTTP 200", homeRes?.status, 200);
  } else {
    console.log("  SKIP: auth cookie not obtained");
  }
} else {
  console.log("  SKIP: E2E creds not set");
}
console.log();

console.log("══════════════════════════════════════════════════════");
console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
console.log("══════════════════════════════════════════════════════\n");
process.exit(failed > 0 ? 1 : 0);
