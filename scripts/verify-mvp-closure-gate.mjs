/**
 * Child World MVP closure gate — Phases 1 + 2 + 2.5 + 2.6
 * Usage: npx tsx scripts/verify-mvp-closure-gate.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://127.0.0.1:3001";

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
process.env.ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN = "true";

const {
  getWorkingTreeFiles,
  isMvpApprovedFile,
  MVP_FORBIDDEN_PREFIXES,
} = await import(pathToFileURL(resolve(ROOT, "scripts/lib/mvp-verify-helpers.mjs")).href);
const { assertDevServerReady } = await import(
  pathToFileURL(resolve(ROOT, "scripts/lib/mvp-verify-http-preflight.mjs")).href
);

const suites = [];
function suite(name, ok, detail) {
  suites.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForDevServer() {
  const hooks = {
    pass: () => {},
    fail: () => {},
  };
  return assertDevServerReady(hooks, BASE, { retries: 12, delayMs: 2000 });
}

function runScript(label, scriptPath) {
  const r = spawnSync("npx", ["tsx", scriptPath], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const m = out.match(/PASSED:\s*(\d+)\s*FAILED:\s*(\d+)/i) || out.match(/Results:\s*(\d+) passed,\s*(\d+) failed/i);
  const passed = m ? Number(m[1]) : null;
  const failed = m ? Number(m[2]) : null;
  const ok = r.status === 0;
  suite(
    label,
    ok,
    ok ? (passed != null ? `${passed} checks` : "exit 0") : (failed != null ? `${failed} failed` : `exit ${r.status}`)
  );
  return { ok, out };
}

async function loginStudent(username, pin) {
  const res = await fetch(`${BASE}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, pin }),
  }).catch(() => null);
  const match = res?.headers?.get("set-cookie")?.match(/liosh_student_session=([^;]+)/);
  return match ? `liosh_student_session=${match[1]}` : null;
}

console.log("\n══════════════════════════════════════════════════════");
console.log("  Child World MVP Closure Gate");
console.log("  " + new Date().toISOString());
console.log("══════════════════════════════════════════════════════\n");

// ── Dev server (HTTP suites need it) ───────────────────────────────────────
console.log("── Dev server preflight ──");
const serverReady = await waitForDevServer();
if (!serverReady) {
  suite("Dev server ready for HTTP tests", false, "run: npm run dev");
} else {
  suite("Dev server ready for HTTP tests", true);
}
console.log();

// ── 1–4: Phase verification scripts ───────────────────────────────────────
console.log("── Phase test suites ──");
runScript("Phase 1 coin awards", "scripts/verify-phase1-coin-awards.mjs");
runScript("Phase 2 daily missions", "scripts/verify-phase2-missions.mjs");
runScript("Phase 2.5 /student/home UI", "scripts/verify-phase25-ui.mjs");
runScript("Phase 2.6 monthly persistence", "scripts/verify-phase26-monthly-persistence.mjs");
console.log();

// ── 5: /student/home HTTP 200 for ERAN + AAA1–AAA12 ───────────────────────
console.log("── /student/home HTTP 200 (ERAN + AAA1–AAA12) ──");
const httpSuiteHooks = {
  pass: (l) => suite(l, true),
  fail: (l, d) => suite(l, false, d),
};
const serverOk = serverReady && (await assertDevServerReady(httpSuiteHooks, BASE, { retries: 3, delayMs: 500 }));
const accounts = [];
if (process.env.E2E_STUDENT_USERNAME) {
  accounts.push({
    label: "ERAN",
    username: process.env.E2E_STUDENT_USERNAME,
    pin: process.env.E2E_STUDENT_PIN || "7479",
  });
}
for (let i = 1; i <= 12; i++) {
  accounts.push({ label: `AAA${i}`, username: `AAA${i}`, pin: "1234" });
}
let homeOk = 0;
let homeFail = 0;
if (!serverOk) {
  suite("All student homes (13 accounts)", false, "dev server not ready");
} else for (const acc of accounts) {
  const cookie = await loginStudent(acc.username, acc.pin);
  if (!cookie) {
    homeFail++;
    suite(`${acc.label} /student/home`, false, "login failed");
    continue;
  }
  const res = await fetch(`${BASE}/student/home`, { headers: { cookie }, redirect: "manual" }).catch(() => null);
  if (res?.status === 200) {
    homeOk++;
    suite(`${acc.label} /student/home HTTP 200`, true);
  } else {
    homeFail++;
    suite(`${acc.label} /student/home HTTP 200`, false, `status=${res?.status}`);
  }
}
if (serverOk) {
  suite("All student homes (13 accounts)", homeFail === 0, `${homeOk}/${accounts.length} OK`);
}
console.log();

// ── 6: session/finish returns exactly { ok: true } ────────────────────────
console.log("── /api/learning/session/finish response shape ──");
if (!serverOk) {
  suite("session/finish body exactly { ok: true }", false, "dev server not ready");
} else {
const eranCookie = await loginStudent(
  process.env.E2E_STUDENT_USERNAME || "ERAN",
  process.env.E2E_STUDENT_PIN || "7479"
);
if (eranCookie) {
  const startRes = await fetch(`${BASE}/api/learning/session/start`, {
    method: "POST",
    headers: { cookie: eranCookie, "content-type": "application/json" },
    body: JSON.stringify({ subject: "math" }),
  }).catch(() => null);
  const startBody = await startRes?.json().catch(() => null);
  const sessionId = startBody?.sessionId || startBody?.learningSessionId || startBody?.id;

  if (sessionId) {
    const finishRes = await fetch(`${BASE}/api/learning/session/finish`, {
      method: "POST",
      headers: { cookie: eranCookie, "content-type": "application/json" },
      body: JSON.stringify({
        learningSessionId: sessionId,
        durationSeconds: 60,
        accuracy: 85,
        totalQuestions: 5,
        correctCount: 4,
      }),
    }).catch(() => null);
    const finishBody = await finishRes?.json().catch(() => null);
    const keys = finishBody ? Object.keys(finishBody).sort().join(",") : "";
    suite("session/finish HTTP 200", finishRes?.status === 200, `status=${finishRes?.status}`);
    suite("session/finish body exactly { ok: true }", keys === "ok" && finishBody?.ok === true, `keys=[${keys}] body=${JSON.stringify(finishBody)}`);
  } else {
    suite("session/finish shape test", false, "could not start session");
  }
} else {
  suite("session/finish shape test", false, "ERAN login failed");
}
}
console.log();

// ── 7–9: Forbidden paths unchanged (git diff vs HEAD) ─────────────────────
console.log("── Forbidden paths untouched (git diff HEAD) ──");
const allTouched = getWorkingTreeFiles(ROOT);
for (const prefix of MVP_FORBIDDEN_PREFIXES) {
  const hits = allTouched.filter((f) => f.includes(prefix));
  suite(`No changes under ${prefix}`, hits.length === 0, hits.join(", ") || undefined);
}
const unexpected = allTouched.filter((f) => f !== ".env.local" && !isMvpApprovedFile(f));
suite("Only MVP-scoped files changed (excl. .env.local)", unexpected.length === 0, unexpected.join(", ") || "clean");
console.log();

// ── 10: Migrations unchanged ───────────────────────────────────────────────
console.log("── Migrations ──");
const migrationHits = allTouched.filter((f) => f.startsWith("supabase/migrations/"));
suite("No migration files changed", migrationHits.length === 0, migrationHits.join(", ") || undefined);
console.log();

// ── 11: .env.local not for commit ───────────────────────────────────────────
console.log("── .env.local commit safety ──");
const gitignore = readFileSync(resolve(ROOT, ".gitignore"), "utf8");
suite(".env.local listed in .gitignore", gitignore.includes(".env*.local") || gitignore.includes(".env.local"));
let staged = "";
try {
  staged = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" });
} catch {
  staged = "";
}
suite(".env.local not staged for commit", !staged.split("\n").some((f) => f.includes(".env.local")));
console.log();

// ── 12–14: Admin monthly reward route ───────────────────────────────────────
console.log("── Admin monthly persistence route ──");
const adminToken = (process.env.ENGINE_REVIEW_ADMIN_TOKEN || "").trim();

const noToken = await fetch(`${BASE}/api/admin/monthly-persistence-award`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ dryRun: true }),
}).catch(() => null);
suite("Admin route rejects missing x-admin-token", noToken?.status === 401, `status=${noToken?.status}`);

const badToken = await fetch(`${BASE}/api/admin/monthly-persistence-award`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-token": "invalid-token" },
  body: JSON.stringify({ dryRun: true }),
}).catch(() => null);
suite("Admin route rejects invalid x-admin-token", badToken?.status === 401, `status=${badToken?.status}`);

const { createClient } = await import("@supabase/supabase-js");
const {
  evaluateMonthlyPersistenceReward,
  awardMonthlyPersistenceReward,
  buildMonthlyPersistenceIdempotencyKey,
} = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js")).href
);
const { getIsraelMonthBoundsForYearMonth } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/israel-calendar.server.js")).href
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: studentRow } = await supabase.from("students").select("id").limit(1).maybeSingle();
const testStudentId = studentRow?.id;
const testYm = "2099-08";
const testMonth = getIsraelMonthBoundsForYearMonth(testYm);
const testStartedAt = new Date(new Date(testMonth.startIso).getTime() + 3600_000).toISOString();

if (testStudentId) {
  const idemKey = buildMonthlyPersistenceIdempotencyKey(testStudentId, testYm);
  await supabase.from("coin_transactions").delete().eq("idempotency_key", idemKey);
  await supabase
    .from("learning_sessions")
    .delete()
    .eq("student_id", testStudentId)
    .gte("started_at", testMonth.startIso)
    .lt("started_at", testMonth.endIso);

  await supabase.from("learning_sessions").insert({
    id: crypto.randomUUID(),
    student_id: testStudentId,
    subject: "math",
    status: "completed",
    started_at: testStartedAt,
    ended_at: testStartedAt,
    duration_seconds: 105 * 60,
  });

  const dryEval = await evaluateMonthlyPersistenceReward(supabase, {
    studentId: testStudentId,
    yearMonthIsrael: testYm,
  });
  const txBefore = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("idempotency_key", idemKey)
    .maybeSingle();
  suite("Dry-run monthly reward writes nothing", !txBefore.data?.id && dryEval.wouldAward === 10_000);

  const first = await awardMonthlyPersistenceReward(supabase, {
    studentId: testStudentId,
    yearMonthIsrael: testYm,
  });
  const second = await awardMonthlyPersistenceReward(supabase, {
    studentId: testStudentId,
    yearMonthIsrael: testYm,
  });
  suite("Real-run monthly reward is idempotent", first.awarded === true && second.duplicate === true);

  if (adminToken) {
    const good = await fetch(`${BASE}/api/admin/monthly-persistence-award`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ dryRun: true, yearMonthIsrael: testYm, studentIds: [testStudentId] }),
    }).catch(() => null);
    suite("Admin route accepts valid x-admin-token (dry-run)", good?.status === 200, `status=${good?.status}`);
  }

  await supabase.from("coin_transactions").delete().eq("idempotency_key", idemKey);
  await supabase
    .from("learning_sessions")
    .delete()
    .eq("student_id", testStudentId)
    .gte("started_at", testMonth.startIso)
    .lt("started_at", testMonth.endIso);
} else {
  suite("Admin dry-run / idempotency DB checks", false, "no test student");
}
console.log();

// ── Summary ─────────────────────────────────────────────────────────────────
const passed = suites.filter((s) => s.ok).length;
const failed = suites.filter((s) => !s.ok).length;

console.log("══════════════════════════════════════════════════════");
console.log(`  CLOSURE GATE: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════════════════════\n");

console.log("── Changed files (working tree) ──");
for (const f of allTouched) console.log(`  ${f.startsWith("??") ? "" : ""}${f}`);
if (allTouched.includes(".env.local")) console.log("  (.env.local modified locally — gitignored, do not commit)");

const safeToCommit =
  failed === 0 &&
  !staged.split("\n").some((f) => f.includes(".env.local")) &&
  unexpected.filter((f) => f !== ".env.local").length === 0;

console.log(`\nMVP safe to commit/push: ${safeToCommit ? "YES (exclude .env.local)" : "NO — see failures above"}\n`);

process.exit(failed > 0 ? 1 : 0);
