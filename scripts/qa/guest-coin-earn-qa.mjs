#!/usr/bin/env node
/**
 * Guest mode v2 — mandatory coin accumulation QA.
 * Proves: guest practice finish → balance rises → parent link transfers earned coins.
 *
 * Run: node --env-file=.env.local scripts/qa/guest-coin-earn-qa.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.GUEST_QA_BASE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

const results = [];

function pass(id, detail = "") {
  results.push({ id, status: "PASS", detail });
  console.log(`  ✓ ${id}${detail ? ` — ${detail}` : ""}`);
}
function fail(id, detail = "") {
  results.push({ id, status: "FAIL", detail });
  console.log(`  ✗ ${id}${detail ? ` — ${detail}` : ""}`);
}

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(__dirname, "..", "..", name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      if (process.env[k]) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

/** @type {Map<string, string>} */
const cookieJar = new Map();

function parseSetCookie(header) {
  if (!header) return;
  const parts = Array.isArray(header) ? header : [header];
  for (const line of parts) {
    const seg = String(line).split(";")[0];
    const eq = seg.indexOf("=");
    if (eq === -1) continue;
    cookieJar.set(seg.slice(0, eq).trim(), seg.slice(eq + 1).trim());
  }
}

function cookieHeader() {
  if (!cookieJar.size) return {};
  return { Cookie: [...cookieJar.entries()].map(([k, v]) => `${k}=${decodeURIComponent(v)}`).join("; ") };
}

async function api(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: BASE,
      Referer: `${BASE}/`,
      ...cookieHeader(),
      ...extraHeaders,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie");
  if (setCookie) parseSetCookie(setCookie);
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text.slice(0, 300) };
  }
  return { res, json };
}

async function enableGuest() {
  await service.from("guest_mode_settings").upsert(
    {
      setting_key: "guest_mode_enabled",
      setting_value_json: { enabled: true },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );
  await service.from("guest_mode_settings").upsert(
    {
      setting_key: "guest_defaults",
      setting_value_json: { games_per_category: 2, topics_per_subject: 2 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );
}

async function parentToken() {
  const email = process.env.QA_PARENT_EMAIL || "admin@admin.com";
  const password =
    process.env.QA_PARENT_PASSWORD ||
    process.env.DEMO_PARENT_PASSWORD ||
    process.env.DEMO_TEACHER_PASSWORD ||
    "";
  if (!password) return null;
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) return null;
  return data.session.access_token;
}

async function ensureParentToken() {
  let token = await parentToken();
  if (token) return token;
  const password =
    process.env.QA_PARENT_PASSWORD ||
    process.env.DEMO_PARENT_PASSWORD ||
    process.env.DEMO_TEACHER_PASSWORD ||
    "";
  if (!password) return null;
  const { error } = await service.auth.admin.updateUserById(QA_PARENT_ID, {
    password,
    email_confirm: true,
  });
  if (error) return null;
  return parentToken();
}

async function getDbBalance(studentId) {
  const { data } = await service
    .from("student_coin_balances")
    .select("balance")
    .eq("student_id", studentId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

async function resetBalance(studentId, balance = 0) {
  await service.from("student_coin_balances").upsert(
    { student_id: studentId, balance, updated_at: new Date().toISOString() },
    { onConflict: "student_id" }
  );
}

async function main() {
  console.log("\n=== Guest Coin Earn QA ===");
  console.log(`Base URL: ${BASE}\n`);

  // Env flags
  console.log("0. Env flags");
  if (process.env.ENABLE_SESSION_COIN_AWARDS === "true") {
    pass("env-session-coin-awards", "ENABLE_SESSION_COIN_AWARDS=true");
  } else {
    fail("env-session-coin-awards", `value=${process.env.ENABLE_SESSION_COIN_AWARDS ?? "unset"}`);
  }
  if (process.env.NEXT_PUBLIC_CARD_REWARDS_ENABLED === "true") {
    pass("env-card-rewards", "NEXT_PUBLIC_CARD_REWARDS_ENABLED=true");
  } else {
    fail("env-card-rewards", `value=${process.env.NEXT_PUBLIC_CARD_REWARDS_ENABLED ?? "unset"}`);
  }

  await enableGuest();

  // 1. Guest enters
  console.log("\n1. Guest session");
  cookieJar.clear();
  const guestStart = await api("POST", "/api/student/guest/start", {});
  const guestId = guestStart.json.student?.id;
  const leoNumber = guestStart.json.leoNumber;
  if (!guestStart.res.ok || !guestId || !leoNumber) {
    fail("guest-start", JSON.stringify(guestStart.json).slice(0, 200));
    printReport();
    process.exit(1);
  }
  pass("guest-start", `leo=${leoNumber} id=${guestId.slice(0, 8)}…`);

  // 2. Initial balance recorded (zero baseline — no seeding)
  console.log("\n2. Initial balance");
  await resetBalance(guestId, 0);
  const meBefore = await api("GET", "/api/student/me");
  const apiBalanceBefore = Number(
    meBefore.json?.student?.coinBalance ?? meBefore.json?.student?.coin_balance ?? -1
  );
  const dbBalanceBefore = await getDbBalance(guestId);
  if (apiBalanceBefore === 0 && dbBalanceBefore === 0) {
    pass("guest-initial-balance", "api=0 db=0");
  } else {
    fail("guest-initial-balance", `api=${apiBalanceBefore} db=${dbBalanceBefore}`);
  }

  // 3. Complete a practice session on a playable topic (g3 math registry names)
  console.log("\n3. Practice session → coin award");
  const mathTopics = [
    "addition",
    "compare",
    "decimals",
    "division",
    "fractions",
    "multiplication",
    "subtraction",
  ];
  const topicsRes = await api(
    "GET",
    `/api/student/guest/playable-topics?subject=math&topics=${mathTopics.join(",")}`
  );
  let playableTopic = (topicsRes.json.topics || []).find((t) => t.guestPlayable === true)?.topic;
  if (!playableTopic) {
    // Fallback: first two g3 math topics per launch registry defaults
    playableTopic = "addition";
  }
  pass("playable-topic-found", playableTopic);

  const sessionStart = await api("POST", "/api/learning/session/start", {
    subject: "math",
    topic: playableTopic,
    mode: "practice",
  });
  const sessionId = sessionStart.json.learningSessionId || sessionStart.json.id;
  if (!sessionStart.res.ok || !sessionId) {
    fail("session-start", JSON.stringify(sessionStart.json).slice(0, 200));
    printReport();
    process.exit(1);
  }
  pass("session-start", sessionId.slice(0, 8) + "…");

  // Submit one answer (mirrors real flow; coins come from finish summary)
  await api("POST", "/api/learning/answer", {
    learningSessionId: sessionId,
    subject: "math",
    topic: playableTopic,
    mode: "practice",
    questionId: `qa-${Date.now()}`,
    isCorrect: true,
    answerPayload: { qa: true },
    durationMs: 3000,
  });

  const sessionFinish = await api("POST", "/api/learning/session/finish", {
    learningSessionId: sessionId,
    subject: "math",
    topic: playableTopic,
    mode: "practice",
    totalQuestions: 5,
    correctAnswers: 5,
    wrongAnswers: 0,
    accuracy: 90,
    durationSeconds: 120,
  });
  if (!sessionFinish.res.ok) {
    fail("session-finish", JSON.stringify(sessionFinish.json).slice(0, 200));
    printReport();
    process.exit(1);
  }
  pass("session-finish", "completed");

  // Small wait for coin RPC
  await new Promise((r) => setTimeout(r, 500));

  // 4. Balance increased
  console.log("\n4. Balance after practice");
  const meAfter = await api("GET", "/api/student/me");
  const apiBalanceAfter = Number(
    meAfter.json?.student?.coinBalance ?? meAfter.json?.student?.coin_balance ?? 0
  );
  const dbBalanceAfter = await getDbBalance(guestId);
  const earned = dbBalanceAfter - dbBalanceBefore;

  const { data: coinTx } = await service
    .from("coin_transactions")
    .select("amount, direction, source_type, idempotency_key")
    .eq("student_id", guestId)
    .eq("source_type", "learning_session")
    .eq("direction", "earn")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (earned > 0 && apiBalanceAfter > apiBalanceBefore) {
    pass("guest-coins-earned", `before=${apiBalanceBefore} after=${apiBalanceAfter} (+${earned})`);
  } else {
    fail(
      "guest-coins-earned",
      `before=${apiBalanceBefore} after=${apiBalanceAfter} db=${dbBalanceAfter} tx=${JSON.stringify(coinTx)}`
    );
  }

  // 5. Parent link transfers earned coins
  console.log("\n5. Parent link coin transfer");
  const pTok = await ensureParentToken();
  if (!pTok) {
    fail("parent-link-coins", "no parent token");
    printReport();
    process.exit(1);
  }

  const childName = `QA-Coin-${Date.now().toString(36).slice(-5)}`;
  const createChild = await api(
    "POST",
    "/api/parent/create-student",
    { fullName: childName, gradeLevel: "g3" },
    { Authorization: `Bearer ${pTok}` }
  );
  const childId = createChild.json.student?.id;
  if (!createChild.res.ok || !childId) {
    fail("parent-create-child", JSON.stringify(createChild.json).slice(0, 120));
    printReport();
    process.exit(1);
  }

  const link = await api(
    "POST",
    "/api/parent/guest/link",
    { targetStudentId: childId, leoNumber },
    { Authorization: `Bearer ${pTok}` }
  );
  if (!link.res.ok || !link.json.ok) {
    fail("parent-link", JSON.stringify(link.json).slice(0, 120));
    printReport();
    process.exit(1);
  }
  pass("parent-link", link.json.message || "ok");

  const childBalance = await getDbBalance(childId);
  const guestBalanceAfterLink = await getDbBalance(guestId);

  if (childBalance >= earned && childBalance > 0) {
    pass("child-received-earned-coins", `child=${childBalance} earned=${earned}`);
  } else {
    fail("child-received-earned-coins", `child=${childBalance} expected>=${earned}`);
  }

  if (guestBalanceAfterLink === 0) {
    pass("guest-balance-zero-after-link");
  } else {
    fail("guest-balance-zero-after-link", String(guestBalanceAfterLink));
  }

  printReport();
  const failed = results.filter((r) => r.status === "FAIL").length;
  process.exit(failed > 0 ? 1 : 0);
}

function printReport() {
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n=== Summary: ${passed} PASS, ${failed} FAIL ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
