/**
 * Phase 1C — RLS verification (non-destructive).
 *
 * Does not print secrets.
 *
 * Modes:
 * - Default: loads optional .env.local / .env if present, then full flow.
 * - `--no-dotenv`: never reads .env*; requires vars in shell.
 * - `--anon-only`: SELECT-only anon checks; no auth users, no INSERT/UPDATE/DELETE.
 * - Combine: `node scripts/verify-learning-rls.mjs --no-dotenv --anon-only`
 *
 * Auto-setup (optional, NOT used with --anon-only): LEARNING_RLS_AUTO_SETUP=1 + service role
 * Creates two users with email prefix rls-verify-, runs checks, then deletes only those Auth users
 * in a finally block (and if B creation fails after A, deletes A). Deletion uses Admin API;
 * public rows cascade from auth.users — no arbitrary row deletes.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PROJECT_ROOT = process.cwd();
const EMAIL_PREFIX = "rls-verify-";

const CLI_NO_DOTENV = process.argv.includes("--no-dotenv");
const CLI_ANON_ONLY = process.argv.includes("--anon-only");

const PRIVATE_TABLES = [
  "parent_profiles",
  "students",
  "student_access_codes",
  "student_sessions",
  "learning_sessions",
  "answers",
  "parent_reports",
  "student_coin_balances",
  "coin_transactions",
  "student_inventory",
];

/** Primary column returned by generic selects (Phase 1 tables use `id` except coin balances). */
function selectPkColumn(table) {
  if (table === "student_coin_balances") return "student_id";
  return "id";
}

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function loadEnv() {
  if (CLI_NO_DOTENV) {
    return;
  }
  loadDotEnvFile(path.join(PROJECT_ROOT, ".env.local"));
  loadDotEnvFile(path.join(PROJECT_ROOT, ".env"));
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    fail(`Missing required env: ${name}`);
    return "";
  }
  return String(v).trim();
}

function optionalEnv(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

async function assertZeroRows(client, table, label) {
  const col = selectPkColumn(table);
  const { data, error } = await client.from(table).select(col).limit(5);
  if (error) {
    fail(`${label}: ${table} select failed unexpectedly: ${error.message}`);
    return;
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length !== 0) {
    fail(`${label}: ${table} expected 0 rows for anon/unauthorized access, got ${rows.length}`);
  } else {
    pass(`${label}: ${table} returns no rows`);
  }
}

async function assertHasRows(client, table, label, filter) {
  const col = selectPkColumn(table);
  let q = client.from(table).select(col).limit(5);
  if (filter) {
    q = filter(q);
  }
  const { data, error } = await q;
  if (error) {
    fail(`${label}: ${table} select failed: ${error.message}`);
    return false;
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length < 1) {
    fail(`${label}: ${table} expected at least 1 row`);
    return false;
  }
  pass(`${label}: ${table} returned expected rows`);
  return true;
}

async function assertEmpty(client, table, label, filter) {
  const col = selectPkColumn(table);
  let q = client.from(table).select(col).limit(5);
  if (filter) {
    q = filter(q);
  }
  const { data, error } = await q;
  if (error) {
    fail(`${label}: ${table} select failed: ${error.message}`);
    return false;
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length !== 0) {
    fail(`${label}: ${table} expected 0 rows, got ${rows.length}`);
    return false;
  }
  pass(`${label}: ${table} returned no rows`);
  return true;
}

async function assertInsertFails(client, table, payload, label) {
  const ret = selectPkColumn(table);
  const { error } = await client.from(table).insert(payload).select(ret).limit(1);
  if (!error) {
    fail(`${label}: insert into ${table} should have failed but succeeded`);
    return;
  }
  pass(`${label}: insert into ${table} rejected (${error.code || "no-code"})`);
}

/**
 * Client must not change coin balance via PostgREST update.
 * Accepts RLS error or an update that returns no rows / does not expose 999; re-read must match baseline.
 */
async function verifyStudentCoinBalanceUpdateBlocked(paClient, studentAId, label, options) {
  const { expectedBalance } = options || {};

  const readBal = async () => {
    const { data, error } = await paClient
      .from("student_coin_balances")
      .select("student_id,balance,lifetime_earned,lifetime_spent")
      .eq("student_id", studentAId)
      .maybeSingle();
    return { data, error };
  };

  const { data: before, error: eBefore } = await readBal();
  if (eBefore || !before) {
    fail(`${label}: student_coin_balances baseline read failed (${eBefore?.message || "no row"})`);
    return;
  }
  if (typeof expectedBalance === "number" && before.balance !== expectedBalance) {
    fail(
      `${label}: student_coin_balances baseline balance expected ${expectedBalance}, got ${before.balance}`
    );
    return;
  }

  const baseline = before.balance;

  const { data: updData, error: updErr } = await paClient
    .from("student_coin_balances")
    .update({ balance: 999 })
    .eq("student_id", studentAId)
    .select("student_id,balance,lifetime_earned,lifetime_spent");

  const returnedRows = Array.isArray(updData) ? updData : updData != null ? [updData] : [];

  if (!updErr) {
    for (const r of returnedRows) {
      if (r && Number(r.balance) === 999) {
        fail(`${label}: student_coin_balances update response shows balance 999`);
        return;
      }
    }
  }

  const { data: after, error: eAfter } = await readBal();
  if (eAfter || !after) {
    fail(`${label}: student_coin_balances post-update read failed (${eAfter?.message || "no row"})`);
    return;
  }
  if (after.balance === 999) {
    fail(`${label}: student_coin_balances balance became 999 — client update must not apply`);
    return;
  }
  if (after.balance !== baseline) {
    fail(
      `${label}: student_coin_balances balance changed (${baseline} -> ${after.balance}) after forbidden update`
    );
    return;
  }

  if (updErr) {
    pass(`${label}: student_coin_balances update rejected (${updErr.code || "no-code"}); still ${baseline}`);
  } else if (returnedRows.length === 0) {
    pass(`${label}: student_coin_balances update returned 0 rows; still ${baseline}`);
  } else {
    pass(`${label}: student_coin_balances update did not apply 999; still ${baseline}`);
  }
}

async function runAnonChecks(url, anonKey) {
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  pass("anon client: starting private table checks");
  for (const table of PRIVATE_TABLES) {
    await assertZeroRows(anon, table, "anon");
  }

  const { data: rules } = await anon.from("coin_reward_rules").select("id").limit(1);
  if (Array.isArray(rules) && rules.length === 0) {
    pass("anon: coin_reward_rules returns no rows");
  } else {
    fail(`anon: coin_reward_rules expected 0 rows, got ${Array.isArray(rules) ? rules.length : "?"}`);
  }

  const { data: spend } = await anon.from("coin_spend_rules").select("id").limit(1);
  if (Array.isArray(spend) && spend.length === 0) {
    pass("anon: coin_spend_rules returns no rows");
  } else {
    fail(`anon: coin_spend_rules expected 0 rows, got ${Array.isArray(spend) ? spend.length : "?"}`);
  }

  const { data: shop } = await anon.from("shop_items").select("id").limit(1);
  if (Array.isArray(shop) && shop.length === 0) {
    pass("anon: shop_items returns no rows");
  } else {
    fail(`anon: shop_items expected 0 rows, got ${Array.isArray(shop) ? shop.length : "?"}`);
  }
}

function makeAuthedClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    fail(`${label}: sign-in failed: ${error?.message || "no session"}`);
    return null;
  }
  return data.session.user.id;
}

async function fetchFirstStudentId(client, parentUid, label) {
  const { data, error } = await client
    .from("students")
    .select("id")
    .eq("parent_id", parentUid)
    .limit(1)
    .maybeSingle();
  if (error) {
    fail(`${label}: could not list students: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/**
 * Deletes Auth users only for this script's auto-setup run.
 * Requires email prefix rls-verify- and Admin getUserById id/email match before deleteUser.
 */
async function cleanupAutoSetupAuthUsers(admin, parentA, parentB) {
  const candidates = [
    { label: "parent-a", email: parentA?.email, userId: parentA?.userId },
    { label: "parent-b", email: parentB?.email, userId: parentB?.userId },
  ];

  for (const { label, email, userId } of candidates) {
    if (!userId || !email || !email.startsWith(EMAIL_PREFIX)) {
      continue;
    }

    const { data: got, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !got.user) {
      console.warn(`WARN: cleanup ${label}: could not verify user before delete (${getErr?.message || "not found"})`);
      continue;
    }
    if (got.user.id !== userId) {
      console.warn(`WARN: cleanup ${label}: id mismatch, skipping delete`);
      continue;
    }
    if ((got.user.email || "").toLowerCase() !== email.toLowerCase()) {
      console.warn(`WARN: cleanup ${label}: email mismatch, skipping delete`);
      continue;
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.warn(`WARN: cleanup ${label}: deleteUser failed (${delErr.message})`);
    } else {
      pass(`cleanup: deleted auto-setup auth user (${label})`);
    }
  }
}

/** After delete: ensure run user ids do not resolve; scan Auth list for run emails (paginated). */
async function verifyAutoSetupAuthUsersRemoved(admin, parentA, parentB) {
  const targets = new Map();
  for (const e of [parentA?.email, parentB?.email]) {
    if (e && e.startsWith(EMAIL_PREFIX)) {
      targets.set(e.toLowerCase(), true);
    }
  }

  const ids = [parentA?.userId, parentB?.userId].filter(Boolean);
  for (const userId of ids) {
    const { data } = await admin.auth.admin.getUserById(userId);
    if (data?.user) {
      fail("cleanup verify: test Auth user id still resolves after delete");
      return;
    }
  }

  if (targets.size === 0) {
    pass("cleanup verify: no run emails to match against list");
    return;
  }

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn(`WARN: cleanup verify: listUsers failed (${error.message})`);
      return;
    }
    const users = data?.users || [];
    for (const u of users) {
      const em = (u.email || "").toLowerCase();
      if (em && targets.has(em)) {
        fail("cleanup verify: test email still present in Auth after delete");
        return;
      }
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 500) {
      console.warn("WARN: cleanup verify: stopped email scan after 500 pages");
      break;
    }
  }
  pass("cleanup verify: run Auth ids gone; run emails not found in Auth list");
}

async function runAuthenticatedChecks(url, anonKey, serviceRoleKey, options) {
  const { parentA, parentB, mutateData } = options;

  const paClient = makeAuthedClient(url, anonKey);
  const pbClient = makeAuthedClient(url, anonKey);

  const admin = serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  let studentAId = null;
  let studentBId = null;

  const uidA = await signIn(paClient, parentA.email, parentA.password, "parent-a");
  if (!uidA) return;

  const { data: profileA, error: profileErr } = await paClient
    .from("parent_profiles")
    .select("id")
    .eq("id", uidA)
    .maybeSingle();
  if (profileErr || !profileA || profileA.id !== uidA) {
    fail(`parent-a: could not read own parent_profiles row (${profileErr?.message || "missing"})`);
    return;
  }
  pass("parent-a: can read own parent_profiles");

  if (mutateData) {
    const insStudentA = await paClient
      .from("students")
      .insert({
        full_name: "RLS verify student A",
        grade_level: "test",
        parent_id: uidA,
      })
      .select("id")
      .single();

    if (insStudentA.error || !insStudentA.data?.id) {
      fail(`parent-a: insert student failed: ${insStudentA.error?.message || "no id"}`);
      return;
    }
    studentAId = insStudentA.data.id;
    pass("parent-a: inserted own student (auto-setup)");
  } else {
    studentAId = await fetchFirstStudentId(paClient, uidA, "parent-a");
    if (!studentAId) {
      fail(
        "parent-a: no student rows found — add at least one student for parent A or run with LEARNING_RLS_AUTO_SETUP=1"
      );
      return;
    }
    pass("parent-a: using existing student row from database");
  }

  await assertHasRows(paClient, "students", "parent-a", q =>
    q.eq("parent_id", uidA).eq("id", studentAId)
  );

  const uidB = await signIn(pbClient, parentB.email, parentB.password, "parent-b");
  if (!uidB) return;

  const { data: profileB, error: profileBErr } = await pbClient
    .from("parent_profiles")
    .select("id")
    .eq("id", uidB)
    .maybeSingle();
  if (profileBErr || !profileB || profileB.id !== uidB) {
    fail(`parent-b: could not read own parent_profiles row (${profileBErr?.message || "missing"})`);
    return;
  }
  pass("parent-b: can read own parent_profiles");

  if (mutateData) {
    const insStudentB = await pbClient
      .from("students")
      .insert({
        full_name: "RLS verify student B",
        grade_level: "test",
        parent_id: uidB,
      })
      .select("id")
      .single();

    if (insStudentB.error || !insStudentB.data?.id) {
      fail(`parent-b: insert student failed: ${insStudentB.error?.message || "no id"}`);
      return;
    }
    studentBId = insStudentB.data.id;
    pass("parent-b: inserted own student (auto-setup)");
  } else {
    studentBId = await fetchFirstStudentId(pbClient, uidB, "parent-b");
    if (!studentBId) {
      fail(
        "parent-b: no student rows found — add at least one student for parent B or run with LEARNING_RLS_AUTO_SETUP=1"
      );
      return;
    }
    pass("parent-b: using existing student row from database");
  }

  await assertHasRows(pbClient, "students", "parent-b", q =>
    q.eq("parent_id", uidB).eq("id", studentBId)
  );

  await assertEmpty(paClient, "parent_profiles", "parent-a-cannot-read-b-profile", q =>
    q.eq("id", uidB)
  );
  await assertEmpty(pbClient, "parent_profiles", "parent-b-cannot-read-a-profile", q =>
    q.eq("id", uidA)
  );

  await paClient.auth.signOut();
  await signIn(paClient, parentA.email, parentA.password, "parent-a-reauth");

  await assertEmpty(paClient, "students", "parent-a-cross", q => q.eq("id", studentBId));

  await pbClient.auth.signOut();
  await signIn(pbClient, parentB.email, parentB.password, "parent-b-reauth");

  await assertEmpty(pbClient, "students", "parent-b-cross", q => q.eq("id", studentAId));

  await paClient.auth.signOut();
  await signIn(paClient, parentA.email, parentA.password, "parent-a-after-cross");

  await assertEmpty(paClient, "student_access_codes", "parent-a-select");

  if (mutateData) {
    const insCode = await paClient.from("student_access_codes").insert({
      student_id: studentAId,
      code_hash: "rls-verify-code-hash",
      pin_hash: "rls-verify-pin-hash",
      is_active: true,
    });
    if (insCode.error) {
      fail(`parent-a: insert student_access_codes failed: ${insCode.error.message}`);
      return;
    }
    pass("parent-a: inserted student_access_codes for owned student (auto-setup)");
    await assertEmpty(paClient, "student_access_codes", "parent-a-after-insert");
  } else {
    pass("parent-a: skipping insert into student_access_codes (manual mode — non-destructive)");
  }

  await assertEmpty(paClient, "student_sessions", "parent-a");

  let balanceReadable = false;

  if (mutateData && admin) {
    const { error: balErr } = await admin.from("student_coin_balances").upsert(
      {
        student_id: studentAId,
        balance: 7,
        lifetime_earned: 7,
        lifetime_spent: 0,
      },
      { onConflict: "student_id" }
    );
    if (balErr) {
      fail(`service-role: upsert student_coin_balances failed: ${balErr.message}`);
      return;
    }
    pass("service-role: seeded student_coin_balances for student A (auto-setup)");
    balanceReadable = true;
  } else if (!mutateData) {
    const { data: balRow, error: balReadErr } = await paClient
      .from("student_coin_balances")
      .select("student_id")
      .eq("student_id", studentAId)
      .maybeSingle();
    if (balReadErr) {
      fail(`parent-a: read student_coin_balances failed: ${balReadErr.message}`);
      return;
    }
    if (balRow?.student_id) {
      pass("parent-a: can read existing student_coin_balances for owned student");
      balanceReadable = true;
    } else {
      console.warn(
        "WARN: No student_coin_balances row for parent A student — skipping balance read assertion (optional)"
      );
    }
  }

  if (balanceReadable) {
    await assertHasRows(paClient, "student_coin_balances", "parent-a-balance", q =>
      q.eq("student_id", studentAId)
    );
  }

  await assertInsertFails(
    paClient,
    "student_coin_balances",
    {
      student_id: studentAId,
      balance: 1,
      lifetime_earned: 1,
      lifetime_spent: 0,
    },
    "parent-a"
  );

  await assertInsertFails(
    paClient,
    "coin_transactions",
    {
      student_id: studentAId,
      direction: "earn",
      amount: 1,
      reason: "rls-verify",
      idempotency_key: `rls-verify-${crypto.randomUUID()}`,
    },
    "parent-a"
  );

  if (balanceReadable) {
    await verifyStudentCoinBalanceUpdateBlocked(paClient, studentAId, "parent-a", {
      expectedBalance: mutateData ? 7 : undefined,
    });
  }
}

async function autoCreateParents(admin, runId) {
  const password = crypto.randomBytes(24).toString("base64url");
  const emailA = `${EMAIL_PREFIX}pa-${runId}@example.com`;
  const emailB = `${EMAIL_PREFIX}pb-${runId}@example.com`;

  const createdA = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { source: "learning-rls-verify" },
  });

  if (createdA.error || !createdA.data.user) {
    fail(`auto-setup: create parent A failed: ${createdA.error?.message || "unknown"}`);
    return { ok: false, parentA: null, parentB: null };
  }

  const parentA = {
    email: emailA,
    password,
    userId: createdA.data.user.id,
  };

  const createdB = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { source: "learning-rls-verify" },
  });

  if (createdB.error || !createdB.data.user) {
    fail(`auto-setup: create parent B failed: ${createdB.error?.message || "unknown"}`);
    return { ok: false, parentA, parentB: null };
  }

  const parentB = {
    email: emailB,
    password,
    userId: createdB.data.user.id,
  };

  return { ok: true, parentA, parentB };
}

async function main() {
  loadEnv();

  if (CLI_ANON_ONLY) {
    const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
    const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
    if (process.exitCode) return;

    if (!url.includes("ajxwmlwbzxwffrtlfuoe.supabase.co")) {
      fail("NEXT_PUBLIC_LEARNING_SUPABASE_URL must point at the learning Supabase project");
      return;
    }

    console.log("Learning RLS verification (--anon-only, read-only SELECT) starting…");
    await runAnonChecks(url, anonKey);
    return;
  }

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const serviceRoleKey = optionalEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  if (!url.includes("ajxwmlwbzxwffrtlfuoe.supabase.co")) {
    fail("NEXT_PUBLIC_LEARNING_SUPABASE_URL must point at the learning Supabase project");
    return;
  }

  console.log("Learning RLS verification starting…");

  await runAnonChecks(url, anonKey);

  const autoSetup = optionalEnv("LEARNING_RLS_AUTO_SETUP") === "1";
  const emailA = optionalEnv("LEARNING_RLS_PARENT_A_EMAIL");
  const passA = optionalEnv("LEARNING_RLS_PARENT_A_PASSWORD");
  const emailB = optionalEnv("LEARNING_RLS_PARENT_B_EMAIL");
  const passB = optionalEnv("LEARNING_RLS_PARENT_B_PASSWORD");

  let parentA = null;
  let parentB = null;

  if (autoSetup) {
    if (!serviceRoleKey) {
      fail("LEARNING_RLS_AUTO_SETUP=1 requires LEARNING_SUPABASE_SERVICE_ROLE_KEY for user creation/cleanup");
      return;
    }
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const runId = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
    const created = await autoCreateParents(admin, runId);
    if (!created.ok) {
      await cleanupAutoSetupAuthUsers(admin, created.parentA, created.parentB);
      return;
    }
    parentA = created.parentA;
    parentB = created.parentB;
    pass(`auto-setup: created ${EMAIL_PREFIX}* test users (cleanup runs after checks)`);

    try {
      await runAuthenticatedChecks(url, anonKey, serviceRoleKey, {
        parentA,
        parentB,
        mutateData: true,
      });
    } finally {
      await cleanupAutoSetupAuthUsers(admin, parentA, parentB);
      await verifyAutoSetupAuthUsersRemoved(admin, parentA, parentB);
    }
    return;
  } else if (emailA && passA && emailB && passB) {
    const paSession = makeAuthedClient(url, anonKey);
    const pbSession = makeAuthedClient(url, anonKey);
    const { data: sa } = await paSession.auth.signInWithPassword({ email: emailA, password: passA });
    const { data: sb } = await pbSession.auth.signInWithPassword({ email: emailB, password: passB });
    await paSession.auth.signOut();
    await pbSession.auth.signOut();
    if (!sa.session?.user?.id || !sb.session?.user?.id) {
      fail("manual credentials: sign-in failed for parent A or B");
      return;
    }
    parentA = { email: emailA, password: passA, userId: sa.session.user.id };
    parentB = { email: emailB, password: passB, userId: sb.session.user.id };
    pass("manual credentials: both parents sign-in OK");
  } else {
    console.log(
      "SKIP: authenticated parent checks (set LEARNING_RLS_PARENT_A_EMAIL/PASSWORD + LEARNING_RLS_PARENT_B_EMAIL/PASSWORD, or LEARNING_RLS_AUTO_SETUP=1)"
    );
    return;
  }

  await runAuthenticatedChecks(url, anonKey, serviceRoleKey, {
    parentA,
    parentB,
    mutateData: false,
  });
}

await main();

if (process.exitCode) {
  console.log("RLS verification finished with failures.");
} else {
  console.log("RLS verification finished.");
}
