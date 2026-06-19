/**
 * Safety + integration verification for admin manual coin credit (read-only audit + optional live credit).
 * Usage: node --env-file=.env.local scripts/qa/verify-admin-manual-coin-safety.mjs
 *        node --env-file=.env.local scripts/qa/verify-admin-manual-coin-safety.mjs --live-credit
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const MIGRATION_062_ALLOWED = new Set([
  "teacher",
  "school",
  "student",
  "parent_settings",
]);

const CODE_TARGET_TYPES = new Set([
  "teacher",
  "school",
  "student",
  "parent_settings",
  "password_setup_email",
  "user_lifecycle",
  "entitlement",
  "school_registration",
]);

function loadEnvLocal() {
  const p = resolve(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const liveCredit = process.argv.includes("--live-credit");

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("MISSING_ENV: NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { creditAdminManualCoins, getAdminStudentCoinInfo } = await import(
  pathToFileURL(resolve(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js")).href
);

const report = {
  migrationSafe: null,
  existingTargetTypes: [],
  unexpectedInDb: [],
  missingFromMigration062: [],
  constraintWouldFail: false,
  liveCredit: null,
  flags: {},
  staticChecks: {},
};

async function fetchDistinctTargetTypes() {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("target_type")
    .limit(5000);

  if (error) {
    return { ok: false, error: error.message };
  }

  const counts = Object.create(null);
  for (const row of data || []) {
    const t = row?.target_type;
    if (!t) continue;
    counts[t] = (counts[t] || 0) + 1;
  }
  return { ok: true, counts };
}

async function pickTestStudent() {
  const { data, error } = await supabase
    .from("students")
    .select("id,full_name,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) {
    const { data: anyStudent } = await supabase
      .from("students")
      .select("id,full_name,is_active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!anyStudent?.id) return { ok: false, error: "no_students" };
    return { ok: true, student: anyStudent };
  }
  return { ok: true, student: data };
}

async function runLiveCredit(studentId) {
  const adminUserId = "00000000-0000-4000-8000-000000000001";
  const clientRequestId = `safety-verify-${crypto.randomUUID()}`;

  const before = await getAdminStudentCoinInfo(supabase, studentId);
  if (!before.ok) return { ok: false, step: "before", error: before };

  const credit = await creditAdminManualCoins(supabase, {
    adminUserId,
    studentId,
    amount: 50,
    category: "bonus",
    note: "safety-verify-script",
    clientRequestId,
  });

  const after = await getAdminStudentCoinInfo(supabase, studentId);

  let txRow = null;
  if (credit.ok && credit.transactionId) {
    const { data } = await supabase
      .from("coin_transactions")
      .select("id,student_id,direction,amount,reason,source_type,metadata,balance_after,created_at")
      .eq("id", credit.transactionId)
      .maybeSingle();
    txRow = data;
  }

  let auditRow = null;
  const { data: audits } = await supabase
    .from("admin_audit_log")
    .select("id,target_type,target_id,action,created_at,after_state")
    .eq("target_type", "student")
    .eq("target_id", studentId)
    .eq("action", "admin_manual_coin_credit")
    .order("created_at", { ascending: false })
    .limit(1);
  auditRow = audits?.[0] || null;

  const { data: balanceRow } = await supabase
    .from("student_coin_balances")
    .select("balance")
    .eq("student_id", studentId)
    .maybeSingle();

  return {
    ok: credit.ok,
    credit,
    beforeBalance: before.balance,
    afterBalance: after.ok ? after.balance : null,
    balanceTable: balanceRow?.balance ?? null,
    txRow,
    auditRow,
    auditOk: credit.auditOk,
    duplicate: credit.duplicate === true,
  };
}

// --- static checks ---
const serverSrc = readFileSync(resolve(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js"), "utf8");
const flagsSrc = readFileSync(resolve(ROOT, "lib/admin-server/admin-manual-coin-credit.flags.js"), "utf8");
const apiSrc = readFileSync(resolve(ROOT, "pages/api/admin/students/[studentId]/coin-credit.js"), "utf8");
const uiSrc = readFileSync(resolve(ROOT, "components/admin/rewards/AdminManualCoinsTab.jsx"), "utf8");

report.staticChecks.noDirectBalanceUpdate = !/student_coin_balances[\s\S]*?\.update/.test(serverSrc);
report.staticChecks.noMaxCap = !/Math\.min\(.*amount|MAX.*COIN|max.*amount/i.test(serverSrc);
report.staticChecks.usesApplyArcadeOnly = /applyArcadeCoinMove/.test(serverSrc) && /direction:\s*["']earn["']/.test(serverSrc);
report.staticChecks.apiGuardsFlag = /isAdminManualCoinCreditEnabled/.test(apiSrc);
report.staticChecks.uiHebrewLabels = /פיצוי/.test(uiSrc) && /הוסף מטבעות לילד/.test(uiSrc);
report.staticChecks.serverFlag = /ENABLE_ADMIN_MANUAL_COIN_CREDIT/.test(flagsSrc);
report.staticChecks.clientFlagInRewards = readFileSync(
  resolve(ROOT, "lib/rewards/reward-feature-flags.client.js"),
  "utf8"
).includes("NEXT_PUBLIC_ENABLE_ADMIN_MANUAL_COIN_CREDIT");

report.flags.envServer = process.env.ENABLE_ADMIN_MANUAL_COIN_CREDIT === "true";
report.flags.envClient = process.env.NEXT_PUBLIC_ENABLE_ADMIN_MANUAL_COIN_CREDIT === "true";

// --- DB audit target_type audit ---
const typesResult = await fetchDistinctTargetTypes();
if (!typesResult.ok) {
  console.log(JSON.stringify({ ...report, dbError: typesResult.error }, null, 2));
  process.exit(1);
}

report.existingTargetTypes = Object.entries(typesResult.counts).map(([type, count]) => ({ type, count }));

for (const { type } of report.existingTargetTypes) {
  if (!MIGRATION_062_ALLOWED.has(type)) {
    report.unexpectedInDb.push(type);
  }
}

for (const t of CODE_TARGET_TYPES) {
  if (!MIGRATION_062_ALLOWED.has(t)) {
    report.missingFromMigration062.push(t);
  }
}

report.constraintWouldFail = report.unexpectedInDb.length > 0;
report.migrationSafe = !report.constraintWouldFail;

if (liveCredit && report.migrationSafe) {
  const studentPick = await pickTestStudent();
  if (studentPick.ok) {
    report.liveCredit = {
      studentId: studentPick.student.id,
      studentName: studentPick.student.full_name,
      ...(await runLiveCredit(studentPick.student.id)),
    };
  } else {
    report.liveCredit = { ok: false, error: studentPick.error };
  }
} else if (liveCredit && !report.migrationSafe) {
  report.liveCredit = { skipped: true, reason: "migration_unsafe" };
}

console.log(JSON.stringify(report, null, 2));

if (!report.migrationSafe) {
  process.exit(3);
}
