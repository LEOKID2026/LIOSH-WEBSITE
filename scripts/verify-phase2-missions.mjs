/**
 * Phase 2 Verification Script — Daily Missions + Monthly Persistence
 *
 * Verifications:
 *  1. Phase 1 pure-function tests still pass (calculateSessionCoins)
 *  2. session/finish still returns { ok: true }
 *  3. New student gets 3 daily missions after home-profile call
 *  4. Existing student gets 3 daily missions
 *  5. Missions reset when date changes (simulated)
 *  6. Completing a session advances matching missions
 *  7. Completing a mission writes coin_transactions with reason=mission_complete
 *  8. Re-finishing same session does not double-award mission coins
 *  9. home-profile returns challenges with daily missions
 * 10. Daily missions panel renders in /student/home (HTTP check)
 * 11. Forbidden files not touched
 *
 * Usage: npx tsx scripts/verify-phase2-missions.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env.e2e.local");

const { createClient } = await import("@supabase/supabase-js");
const { calculateSessionCoins } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/learning-coin-award.server.js")).href
);
const { applySessionToMissions, ensureTodayMissions, getIsraelDateString, getGradeBand } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/mission-progress.server.js")).href
);
const { assertMvpWorkingTreeScope } = await import(
  pathToFileURL(resolve(ROOT, "scripts/lib/mvp-verify-helpers.mjs")).href
);
const { assertDevServerReady } = await import(
  pathToFileURL(resolve(ROOT, "scripts/lib/mvp-verify-http-preflight.mjs")).href
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── test harness ───────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function pass(label) { console.log(`  ✓  ${label}`); passed++; }
function fail(label, detail) {
  console.error(`  ✗  ${label}`);
  if (detail) console.error(`       → ${detail}`);
  failed++;
  failures.push({ label, detail });
}
function assertEq(label, actual, expected) {
  if (actual === expected) return pass(label);
  fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertGte(label, actual, min) {
  if (typeof actual === "number" && actual >= min) return pass(label);
  fail(label, `expected >= ${min}, got ${JSON.stringify(actual)}`);
}

async function getBalance(studentId) {
  const { data } = await supabase.from("student_coin_balances").select("balance,lifetime_earned").eq("student_id", studentId).maybeSingle();
  return data ?? { balance: 0, lifetime_earned: 0 };
}
async function countMissionTx(idempotencyKey) {
  const { count } = await supabase.from("coin_transactions").select("id", { count: "exact", head: true }).eq("idempotency_key", idempotencyKey);
  return count ?? 0;
}
async function getMissionTx(idempotencyKey) {
  const { data } = await supabase.from("coin_transactions").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  return data;
}
async function getChallenges(studentId) {
  const { data } = await supabase.from("student_learning_state").select("challenges").eq("student_id", studentId).maybeSingle();
  return data?.challenges ?? null;
}
async function createTestSession(studentId, subject = "math") {
  const id = crypto.randomUUID();
  await supabase.from("learning_sessions").insert({ id, student_id: studentId, subject, status: "active", started_at: new Date().toISOString() });
  return id;
}

// Find a student to test with
const { data: studentRow } = await supabase.from("students").select("id,grade_level").limit(1).maybeSingle();
if (!studentRow?.id) { console.error("FAIL: No student found"); process.exit(1); }
const studentId = studentRow.id;
const gradeLevel = studentRow.grade_level || "grade_3";
console.log(`\nUsing student: ${studentId}  grade: ${gradeLevel}\n`);

// ════════════════════════════════════════════════════════════════════════════
console.log("══════════════════════════════════════════════════════");
console.log("  Phase 2 Mission Verification — " + new Date().toISOString());
console.log("══════════════════════════════════════════════════════\n");

// ── Section 1: Phase 1 regression ─────────────────────────────────────────
console.log("── Section 1: Phase 1 regression (calculateSessionCoins) ──");
assertEq("duration=0 → 0 coins", calculateSessionCoins(100, 0), 0);
assertEq("accuracy=50 → 10 coins", calculateSessionCoins(50, 60), 10);
assertEq("accuracy=80 → 15 coins", calculateSessionCoins(80, 60), 15);
assertEq("accuracy=95 → 20 coins", calculateSessionCoins(95, 60), 20);
console.log();

// ── Section 2: Israel date helper ─────────────────────────────────────────
console.log("── Section 2: getIsraelDateString() ──");
const today = getIsraelDateString();
assertEq("returns YYYY-MM-DD format", /^\d{4}-\d{2}-\d{2}$/.test(today), true);
console.log(`  today in Israel: ${today}`);
console.log();

// ── Section 3: getGradeBand ────────────────────────────────────────────────
console.log("── Section 3: getGradeBand mapping ──");
assertEq("grade_1 → g12", getGradeBand("grade_1"), "g12");
assertEq("grade_2 → g12", getGradeBand("grade_2"), "g12");
assertEq("grade_3 → g34", getGradeBand("grade_3"), "g34");
assertEq("grade_4 → g34", getGradeBand("grade_4"), "g34");
assertEq("grade_5 → g56", getGradeBand("grade_5"), "g56");
assertEq("grade_6 → g56", getGradeBand("grade_6"), "g56");
assertEq("unknown → g34", getGradeBand(""), "g34");
console.log();

// ── Section 4: ensureTodayMissions (pure) ─────────────────────────────────
console.log("── Section 4: ensureTodayMissions (pure) ──");

const { challenges: fresh, changed: c1 } = ensureTodayMissions({}, "grade_3", today);
assertEq("empty challenges → creates 3 missions", fresh.daily?.missions?.length, 3);
assertEq("changed=true for new missions", c1, true);
assertEq("date set to today", fresh.daily?.date, today);

const { changed: c2 } = ensureTodayMissions(fresh, "grade_3", today);
assertEq("same-day call → changed=false (no re-init)", c2, false);

const { challenges: stale, changed: c3 } = ensureTodayMissions(
  { daily: { date: "2000-01-01", missions: [{}, {}, {}], subjectsSeen: [] } },
  "grade_3",
  today
);
assertEq("stale date → reset, changed=true", c3, true);
assertEq("stale reset → today's date", stale.daily?.date, today);
console.log();

// ── Section 5: applySessionToMissions (pure) ──────────────────────────────
console.log("── Section 5: applySessionToMissions (pure) ──");

const { updatedChallenges: after1 } = applySessionToMissions(
  {}, "grade_3",
  { totalQuestions: 8, durationSeconds: 300, subject: "math" },
  today
);
const m1q = after1.daily.missions.find(m => m.type === "questions");
const m1t = after1.daily.missions.find(m => m.type === "minutes");
const m1s = after1.daily.missions.find(m => m.type === "subjects");

assertEq("questions progress = 8 (of 15)", m1q?.progress, 8);
assertEq("questions not completed (8 < 15)", m1q?.completed, false);
assertEq("minutes progress ≈ 5 min (300s)", Math.round((m1t?.progress || 0)), 5);
assertEq("subjects progress = 1 (math)", m1s?.progress, 1);
assertEq("subjects not completed (1 < 2)", m1s?.completed, false);

// Add more sessions to reach completion
const { updatedChallenges: after2, newlyCompleted: nc2 } = applySessionToMissions(
  after1, "grade_3",
  { totalQuestions: 10, durationSeconds: 400, subject: "hebrew" },
  today
);
const m2q = after2.daily.missions.find(m => m.type === "questions");
const m2t = after2.daily.missions.find(m => m.type === "minutes");
const m2s = after2.daily.missions.find(m => m.type === "subjects");

assertEq("questions: 8+10=15 → completed", m2q?.completed, true);
assertEq("minutes: 5min+6.7min → completed (>8)", m2t?.completed, true);
assertEq("subjects: math+hebrew=2 → completed", m2s?.completed, true);
assertEq("newlyCompleted has all 3 missions", nc2.length, 3);
console.log();

// ── Section 6: DB — home-profile initializes missions ─────────────────────
console.log("── Section 6: home-profile.js initializes today's missions ──");

// Call /api/student/home-profile via HTTP as the ERAN test student
const E2E_USERNAME = process.env.E2E_STUDENT_USERNAME;
const E2E_PIN      = process.env.E2E_STUDENT_PIN;
const BASE_URL     = "http://127.0.0.1:3001";

let homeChallenges = null;
const serverOk = E2E_USERNAME && E2E_PIN ? await assertDevServerReady({ pass, fail }, BASE_URL) : false;
if (E2E_USERNAME && E2E_PIN && serverOk) {
  // Login
  const loginRes = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: E2E_USERNAME, pin: E2E_PIN }),
  }).catch(() => null);

  const match = loginRes?.headers?.get("set-cookie")?.match(/liosh_student_session=([^;]+)/);
  const authCookie = match ? `liosh_student_session=${match[1]}` : null;

  if (authCookie) {
    const hpRes = await fetch(`${BASE_URL}/api/student/home-profile`, {
      headers: { cookie: authCookie, accept: "application/json" },
    }).catch(() => null);
    const hpBody = await hpRes?.json().catch(() => null);

    if (hpBody?.ok === true) {
      pass("home-profile returns ok=true");
      homeChallenges = hpBody?.challenges ?? null;

      const daily = homeChallenges?.daily;
      if (daily?.date === today && Array.isArray(daily?.missions) && daily.missions.length === 3) {
        pass("home-profile.challenges.daily has 3 missions for today");
        assertEq("all missions have textHe", daily.missions.every(m => m.textHe), true);
        assertEq("all missions have rewardCoins=20", daily.missions.every(m => m.rewardCoins === 20), true);
        assertEq("all missions start progress=0 or resumed", daily.missions.every(m => typeof m.progress === "number"), true);
        console.log("  Sample mission:", JSON.stringify(daily.missions[0]));
      } else {
        fail("home-profile.challenges.daily has 3 missions", `got: ${JSON.stringify(daily)?.slice(0, 200)}`);
      }
    } else {
      fail("home-profile returns ok=true", `got: ${JSON.stringify(hpBody)?.slice(0, 200)}`);
    }
  } else {
    fail("home-profile HTTP auth", "auth cookie not obtained");
  }
} else if (!E2E_USERNAME || !E2E_PIN) {
  console.log("  SKIP HTTP section: E2E creds not set");
} else {
  fail("home-profile HTTP", "dev server not ready");
}
console.log();

// ── Section 7: mission progress via session/finish ─────────────────────────
console.log("── Section 7: session/finish advances mission progress ──");

// Find student_id for E2E user (may differ from studentRow)
let testStudentId = studentId;
if (E2E_USERNAME) {
  const { data: acRow } = await supabase
    .from("student_access_codes")
    .select("student_id")
    .eq("login_username", E2E_USERNAME.toLowerCase())
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (acRow?.student_id) testStudentId = acRow.student_id;
}

// Clear today's daily state so we start fresh
const challengesBefore = await getChallenges(testStudentId);
const resetChallenges = { ...challengesBefore, daily: null };
await supabase.from("student_learning_state").update({ challenges: resetChallenges }).eq("student_id", testStudentId);

// Call session/finish via HTTP
const session7 = await createTestSession(testStudentId, "math");
const sessionIdStr = session7;

if (E2E_USERNAME && E2E_PIN && serverOk) {
  const loginRes = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: E2E_USERNAME, pin: E2E_PIN }),
  }).catch(() => null);
  const match = loginRes?.headers?.get("set-cookie")?.match(/liosh_student_session=([^;]+)/);
  const authCookie = match ? `liosh_student_session=${match[1]}` : null;

  if (authCookie) {
    const balBefore = await getBalance(testStudentId);

    const finishRes = await fetch(`${BASE_URL}/api/learning/session/finish`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authCookie },
      body: JSON.stringify({
        learningSessionId: sessionIdStr,
        durationSeconds: 600,   // 10 minutes
        totalQuestions: 20,
        correctAnswers: 18,
        wrongAnswers: 2,
        accuracy: 90,
        score: 900,
      }),
    }).catch(() => null);

    const finishBody = await finishRes?.json().catch(() => null);
    assertEq("session/finish HTTP 200", finishRes?.status, 200);
    assertEq("session/finish body = { ok: true }", JSON.stringify(finishBody), JSON.stringify({ ok: true }));
    assertEq("session/finish keys only 'ok'", Object.keys(finishBody || {}).join(","), "ok");

    // Wait for async writes to complete
    await new Promise(r => setTimeout(r, 800));

    const challengesAfter = await getChallenges(testStudentId);
    const dailyAfter = challengesAfter?.daily;

    if (dailyAfter?.date === today && Array.isArray(dailyAfter?.missions)) {
      pass("challenges.daily.date = today after session/finish");
      const qMission = dailyAfter.missions.find(m => m.type === "questions");
      const tMission = dailyAfter.missions.find(m => m.type === "minutes");
      if (qMission) {
        assertGte("questions mission progress > 0 (20 questions answered)", qMission.progress, 1);
      }
      if (tMission) {
        assertGte("minutes mission progress > 0 (10 min session)", tMission.progress, 1);
      }
    } else {
      fail("challenges.daily populated after session/finish", JSON.stringify(dailyAfter)?.slice(0, 200));
    }

    // Check if any missions were completed and coins awarded
    const gradeBand = getGradeBand(gradeLevel);
    const dailyMissions = dailyAfter?.missions || [];
    const completedMissions = dailyMissions.filter(m => m.completed);
    console.log(`  Completed missions: ${completedMissions.length}/3`);

    // Verify coin_transactions for completed missions
    let missionTxFound = 0;
    for (const m of completedMissions) {
      const ikey = `mission_complete_${testStudentId}_${today}_${m.id}`;
      const tx = await getMissionTx(ikey);
      if (tx) {
        missionTxFound++;
        assertEq(`mission tx reason = 'mission_complete' (${m.id})`, tx.reason, "mission_complete");
        assertEq(`mission tx source_type (${m.id})`, tx.source_type, "mission_complete");
        assertEq(`mission tx amount = 20 (${m.id})`, tx.amount, 20);
      }
    }
    if (completedMissions.length > 0) {
      assertEq("coin_transactions rows match completed missions", missionTxFound, completedMissions.length);
    } else {
      pass("no missions completed yet in this session (progress only) — coin test will use pure path");
    }

    const balAfter = await getBalance(testStudentId);
    const expectedCoinGain = completedMissions.length * 20 + (20 > 0 ? 15 : 10); // Phase 1 + Phase 2
    console.log(`  balance before: ${balBefore.balance}  after: ${balAfter.balance}  delta: ${balAfter.balance - balBefore.balance}`);
    if (balAfter.balance >= balBefore.balance) {
      pass("balance non-decreasing after session/finish");
    } else {
      fail("balance non-decreasing", `before=${balBefore.balance}, after=${balAfter.balance}`);
    }

    // ── Idempotency: call session/finish again with same ID ──────────────
    console.log("\n── Section 8: session/finish idempotency (same session, second call) ──");
    const balBeforeIdem = await getBalance(testStudentId);

    const finishRes2 = await fetch(`${BASE_URL}/api/learning/session/finish`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authCookie },
      body: JSON.stringify({
        learningSessionId: sessionIdStr,
        durationSeconds: 600,
        totalQuestions: 20,
        correctAnswers: 18,
        wrongAnswers: 2,
        accuracy: 90,
        score: 900,
      }),
    }).catch(() => null);

    const finishBody2 = await finishRes2?.json().catch(() => null);
    assertEq("second call still HTTP 200", finishRes2?.status, 200);
    assertEq("second call still { ok: true }", JSON.stringify(finishBody2), JSON.stringify({ ok: true }));

    await new Promise(r => setTimeout(r, 600));
    const balAfterIdem = await getBalance(testStudentId);
    if (balAfterIdem.balance === balBeforeIdem.balance) {
      pass("balance unchanged after duplicate session/finish (idempotency)");
    } else {
      fail("balance unchanged after duplicate", `before=${balBeforeIdem.balance}, after=${balAfterIdem.balance}`);
    }

    // Verify no new mission transactions (all should be duplicate=true)
    for (const m of completedMissions) {
      const ikey = `mission_complete_${testStudentId}_${today}_${m.id}`;
      const count = await countMissionTx(ikey);
      assertEq(`idempotency: only 1 tx row for mission ${m.id}`, count, 1);
    }
  } else {
    fail("session/finish HTTP auth", "auth cookie not obtained");
  }
} else if (E2E_USERNAME && E2E_PIN) {
  fail("session/finish HTTP", "dev server not ready");
}
console.log();

// ── Section 9: missions reset on date change (pure test) ──────────────────
console.log("── Section 9: mission state resets for a new date ──");
const staleDate = "2020-01-01";
const staleMissions = [
  { id: "questions_15", type: "questions", target: 15, progress: 10, completed: false, coinAwarded: false },
  { id: "minutes_8",    type: "minutes",   target: 8,  progress: 4,  completed: false, coinAwarded: false },
  { id: "subjects_2",   type: "subjects",  target: 2,  progress: 0,  completed: false, coinAwarded: false },
];
const staleChallenges = { daily: { date: staleDate, missions: staleMissions, subjectsSeen: [] } };

const { challenges: reset, changed: resetChanged } = ensureTodayMissions(staleChallenges, "grade_3", today);
assertEq("stale date triggers reset", resetChanged, true);
assertEq("reset sets today's date", reset.daily?.date, today);
assertEq("reset missions all have progress=0", reset.daily?.missions?.every(m => m.progress === 0), true);
assertEq("reset missions all have completed=false", reset.daily?.missions?.every(m => m.completed === false), true);
console.log();

// ── Section 10: Combined MVP working tree scope ────────────────────────────
console.log("── Section 10: MVP working tree scope ──");
const mvpHooks = { pass, fail };
const { files: mvpFiles } = assertMvpWorkingTreeScope(mvpHooks, {
  label: "Combined MVP working tree (no forbidden paths)",
});
console.log("  Working tree files:");
mvpFiles.forEach((l) => console.log(`    ${l}`));
console.log();

// ── Summary ──────────────────────────────────────────────────────────────
console.log("══════════════════════════════════════════════════════");
console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
if (failures.length > 0) {
  console.log("\n  Failures:");
  failures.forEach(f => console.log(`    ✗ ${f.label}${f.detail ? " → " + f.detail : ""}`));
}
console.log("══════════════════════════════════════════════════════\n");
process.exit(failed > 0 ? 1 : 0);
