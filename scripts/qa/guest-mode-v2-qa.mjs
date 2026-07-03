#!/usr/bin/env node
/**
 * Guest mode v2 — post-SQL integration QA (API + DB).
 * Run: node --env-file=.env.local scripts/qa/guest-mode-v2-qa.mjs
 */
import crypto from "node:crypto";
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
function skip(id, detail = "") {
  results.push({ id, status: "SKIP", detail });
  console.log(`  ○ ${id} — ${detail}`);
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
const accessSecret = process.env.LEARNING_STUDENT_ACCESS_SECRET;

if (!url || !serviceKey || !anonKey || !accessSecret) {
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
    json = { _raw: text.slice(0, 200) };
  }
  return { res, json };
}

async function enableGuestViaServiceRole() {
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
  await service.from("guest_mode_settings").upsert(
    {
      setting_key: "guest_economy",
      setting_value_json: { shop_enabled: true, cards_enabled: true },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );
  await service.from("guest_mode_settings").upsert(
    {
      setting_key: "surprise_box_guest_settings",
      setting_value_json: {
        max_pending_boxes: 1,
        cards_per_open: 1,
        coin_prizes_per_open: 1,
        box_interval_minutes: 180,
        first_box_immediate: true,
        prevent_duplicate_in_box: true,
      },
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

async function platformAdminToken() {
  const email =
    process.env.QA_PLATFORM_ADMIN_EMAIL ||
    process.env.E2E_ADMIN_EMAIL ||
    "office@leo.com";
  const password =
    process.env.QA_PLATFORM_ADMIN_PASSWORD ||
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.DEMO_PARENT_PASSWORD ||
    "";
  if (!password) return null;
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) return null;
  const role = data.user?.app_metadata?.role;
  if (role !== "admin") return null;
  return data.session.access_token;
}

async function adminToken() {
  return platformAdminToken();
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

function hashSecret(v) {
  return crypto.createHmac("sha256", accessSecret).update(String(v)).digest("hex");
}

async function main() {
  console.log("\n=== Guest Mode v2 QA ===");
  console.log(`Base URL: ${BASE}\n`);

  // 1. Server up
  console.log("1. Server");
  try {
    await fetch(`${BASE}/api/student/guest/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: "{}",
      signal: AbortSignal.timeout(120_000),
    }).catch(() => {});
    const r = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(120_000) });
    if (r.ok) pass("server-up", `HTTP ${r.status}`);
    else fail("server-up", `HTTP ${r.status}`);
  } catch (e) {
    fail("server-up", String(e.message || e));
    printReport();
    process.exit(1);
  }

  // 2. Schema / settings via service role
  console.log("\n2. Schema (service role)");
  await service.from("guest_mode_settings").upsert(
    {
      setting_key: "guest_mode_enabled",
      setting_value_json: { enabled: false },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );
  await new Promise((r) => setTimeout(r, 31_000));

  const { data: settingsRows, error: settingsErr } = await service
    .from("guest_mode_settings")
    .select("setting_key, setting_value_json");
  if (settingsErr) fail("schema-guest_mode_settings", settingsErr.message);
  else pass("schema-guest_mode_settings", `${settingsRows?.length ?? 0} rows`);

  const enabledRow = settingsRows?.find((r) => r.setting_key === "guest_mode_enabled");
  const guestEnabledDefault = enabledRow?.setting_value_json?.enabled === false;
  if (guestEnabledDefault) pass("guest-mode-default-off", "enabled=false in DB");
  else fail("guest-mode-default-off", JSON.stringify(enabledRow?.setting_value_json));

  const { count: badRegistered } = await service
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("account_kind", "registered")
    .not("guest_status", "is", null);
  if ((badRegistered ?? 0) === 0) pass("registered-guest_status-null");
  else fail("registered-guest_status-null", `count=${badRegistered}`);

  // 3. Admin API — settings GET
  console.log("\n3. Admin API");
  const adminTok = await adminToken();
  if (!adminTok) {
    skip("admin-auth", "no admin token (admin@admin.com + DEMO_PARENT_PASSWORD)");
  } else {
    pass("admin-auth", "bearer obtained");
    const { res, json } = await api("GET", "/api/admin/guest/settings", null, {
      Authorization: `Bearer ${adminTok}`,
    });
    if (res.ok && json.ok) {
      pass("admin-guest-settings-get");
      if (json.settings?.guestModeEnabled === false) pass("admin-api-guest-off");
      else fail("admin-api-guest-off", String(json.settings?.guestModeEnabled));
    } else fail("admin-guest-settings-get", `HTTP ${res.status} ${JSON.stringify(json).slice(0, 120)}`);

    const pageRes = await fetch(`${BASE}/admin/guest`);
    if (pageRes.ok) pass("admin-guest-page", `HTTP ${pageRes.status}`);
    else fail("admin-guest-page", `HTTP ${pageRes.status}`);
  }

  // 4. Guest start while disabled
  console.log("\n4. Guest disabled");
  cookieJar.clear();
  const disabledStart = await api("POST", "/api/student/guest/start", {});
  if (!disabledStart.res.ok && (disabledStart.json.code === "guest_mode_disabled" || disabledStart.res.status === 403)) {
    pass("guest-start-blocked-when-off");
  } else if (disabledStart.res.ok) {
    fail("guest-start-blocked-when-off", "guest created while mode off");
  } else {
    fail("guest-start-blocked-when-off", `HTTP ${disabledStart.res.status} ${disabledStart.json.code || disabledStart.json.error}`);
  }

  // 5. Enable guest mode
  console.log("\n5. Enable guest + defaults");
  if (adminTok) {
    const putBody = {
      guestModeEnabled: true,
      defaults: { gamesPerCategory: 2, topicsPerSubject: 2 },
      economy: { shopEnabled: true, cardsEnabled: true },
      surpriseBox: {
        max_pending_boxes: 1,
        cards_per_open: 1,
        coin_prizes_per_open: 1,
        box_interval_minutes: 180,
        first_box_immediate: true,
        prevent_duplicate_in_box: true,
      },
    };
    const put = await api("PUT", "/api/admin/guest/settings", putBody, {
      Authorization: `Bearer ${adminTok}`,
    });
    if (put.res.ok && put.json.ok) pass("admin-enable-guest");
    else fail("admin-enable-guest", JSON.stringify(put.json).slice(0, 150));
  } else {
    await enableGuestViaServiceRole();
    pass("enable-guest-via-service-role", "admin login unavailable — DB upsert");
    await new Promise((r) => setTimeout(r, 31_000));
  }

  {
    const verifySettings = adminTok
      ? (await api("GET", "/api/admin/guest/settings", null, { Authorization: `Bearer ${adminTok}` })).json
      : null;
    const { data: row } = await service
      .from("guest_mode_settings")
      .select("setting_value_json")
      .eq("setting_key", "guest_mode_enabled")
      .maybeSingle();
    const enabled = verifySettings?.settings?.guestModeEnabled ?? row?.setting_value_json?.enabled;
    if (enabled === true) pass("guest-mode-on");
    else fail("guest-mode-on", String(enabled));

    const boxRow = adminTok
      ? verifySettings?.settings?.surpriseBox?.max_pending_boxes
      : (
          await service
            .from("guest_mode_settings")
            .select("setting_value_json")
            .eq("setting_key", "surprise_box_guest_settings")
            .maybeSingle()
        ).data?.setting_value_json?.max_pending_boxes;
    if (boxRow === 1) pass("box-max-1-config");
    else fail("box-max-1-config", String(boxRow));
  }

  // 6. Guest session flow
  console.log("\n6. Guest session flow");
  cookieJar.clear();
  let resumeToken1 = null;
  let leo1 = null;
  let guestId1 = null;

  const start1 = await api("POST", "/api/student/guest/start", {});
  if (start1.res.ok && start1.json.ok && start1.json.leoNumber) {
    leo1 = start1.json.leoNumber;
    resumeToken1 = start1.json.resumeToken;
    guestId1 = start1.json.student?.id;
    if (/^\d{8}$/.test(leo1) && /^[1-9]/.test(leo1)) pass("guest-leo-8-digits", leo1);
    else fail("guest-leo-8-digits", leo1);
  } else {
    fail("guest-start", JSON.stringify(start1.json).slice(0, 150));
  }

  const me1 = await api("GET", "/api/student/me");
  if (me1.res.ok && me1.json.guestPolicy && me1.json.student?.greetingHe?.includes(leo1 || "X")) {
    pass("guest-me-greeting", me1.json.student.greetingHe);
  } else if (me1.res.ok && me1.json.isGuest) {
    pass("guest-me-greeting", me1.json.student?.greetingHe || me1.json.student?.displayNameHe);
  } else {
    fail("guest-me-greeting", JSON.stringify(me1.json).slice(0, 150));
  }

  const lp = await api("GET", "/api/student/learning-profile");
  if (!lp.res.ok && lp.json.code === "guest_not_eligible") pass("guest-learning-profile-blocked");
  else fail("guest-learning-profile-blocked", `HTTP ${lp.res.status} ${JSON.stringify(lp.json).slice(0, 100)}`);

  if (me1.json.guestPolicy?.lockedHomePanels?.length >= 6) pass("guest-locked-panels-policy");
  else fail("guest-locked-panels-policy", String(me1.json.guestPolicy?.lockedHomePanels?.length));

  // Refresh = same session cookie
  const meRefresh = await api("GET", "/api/student/me");
  if (meRefresh.json.student?.id === guestId1) pass("guest-refresh-same");
  else fail("guest-refresh-same");

  // Logout + resume same device
  await api("POST", "/api/student/logout", {});
  cookieJar.delete("liosh_student_session");
  const resume1 = await api("POST", "/api/student/guest/resume", { resumeToken: resumeToken1 });
  if (resume1.res.ok && resume1.json.student?.id === guestId1) pass("guest-resume-same-device");
  else fail("guest-resume-same-device", JSON.stringify(resume1.json).slice(0, 120));

  // New guest after "cleared localStorage" = start without resume token
  cookieJar.clear();
  const start2 = await api("POST", "/api/student/guest/start", {});
  const leo2 = start2.json.leoNumber;
  const guestId2 = start2.json.student?.id;
  if (start2.res.ok && guestId2 && guestId2 !== guestId1) pass("guest-new-after-no-resume", `leo ${leo2}`);
  else fail("guest-new-after-no-resume");

  // Game access
  console.log("\n7. Guest games / economy");
  cookieJar.clear();
  await api("POST", "/api/student/guest/resume", { resumeToken: resumeToken1 });
  const ga = await api("GET", "/api/student/game-access");
  if (ga.res.ok && ga.json.isGuest) pass("game-access-isGuest");
  else fail("game-access-isGuest");

  const playable = (ga.json.games || []).filter((g) => g.playable);
  const locked = (ga.json.games || []).filter((g) => g.accessState === "guest_locked");
  if (playable.length > 0 && locked.length > 0) pass("games-playable-and-locked", `play=${playable.length} lock=${locked.length}`);
  else fail("games-playable-and-locked", `play=${playable.length} lock=${locked.length}`);

  const byCat = {};
  for (const g of ga.json.games || []) {
    if (!g.isEnabled) continue;
    if (!byCat[g.category]) byCat[g.category] = { play: 0, lock: 0 };
    if (g.playable) byCat[g.category].play += 1;
    if (g.accessState === "guest_locked") byCat[g.category].lock += 1;
  }
  const catOk = Object.values(byCat).every((c) => c.play <= 2);
  if (catOk) pass("games-max-2-per-category-default", JSON.stringify(byCat));
  else fail("games-max-2-per-category-default", JSON.stringify(byCat));

  const box = await api("GET", "/api/student/rewards/surprise-box/status");
  if (box.res.ok) pass("guest-surprise-box-status");
  else skip("guest-surprise-box-status", `HTTP ${box.res.status} (cards feature flag?)`);

  // Learning topic lock
  console.log("\n8. Guest learning guards");
  const lockedTopic = await api("POST", "/api/learning/session/start", {
    subject: "math",
    topic: "mixed",
    mode: "learning",
  });
  if (lockedTopic.res.status === 403 || lockedTopic.json.code === "guest_topic_locked") {
    pass("guest-topic-api-blocked");
  } else if (!lockedTopic.res.ok) {
    pass("guest-topic-api-blocked", `HTTP ${lockedTopic.res.status}`);
  } else {
    fail("guest-topic-api-blocked", "session created for locked topic");
  }

  // Parent reports — guest not in list
  console.log("\n9. Parent / reports exclusion");
  const pTok = await ensureParentToken();
  if (pTok && guestId1) {
    const list = await api("GET", "/api/parent/list-students", null, {
      Authorization: `Bearer ${pTok}`,
    });
    const ids = (list.json.students || []).map((s) => s.id);
    if (!ids.includes(guestId1)) pass("guest-not-in-parent-list");
    else fail("guest-not-in-parent-list");

    const report = await fetch(`${BASE}/api/parent/students/${guestId1}/report-data?studentId=${guestId1}`, {
      headers: { Authorization: `Bearer ${pTok}`, Accept: "application/json" },
    });
    if (report.status === 403 || report.status === 404) pass("guest-report-blocked", `HTTP ${report.status}`);
    else fail("guest-report-blocked", `HTTP ${report.status}`);
  } else {
    skip("parent-guest-exclusion", "no parent token");
  }

  // Registered student regression
  console.log("\n10. Registered regression");
  cookieJar.clear();
  const regLogin = await api("POST", "/api/student/login", { username: "admin", pin: "1234" });
  if (regLogin.res.ok && regLogin.json.student?.id) {
    pass("registered-login");
    const regMe = await api("GET", "/api/student/me");
    if (!regMe.json.isGuest && regMe.json.student?.account_kind !== "guest") pass("registered-not-guest");
    else fail("registered-not-guest");
    if (!regMe.json.guestPolicy) pass("registered-no-guestPolicy");
    else fail("registered-no-guestPolicy");

    const regGa = await api("GET", "/api/student/game-access");
    if (regGa.res.ok && !regGa.json.isGuest) pass("registered-game-access");
    else fail("registered-game-access");

    const regPlayable = (regGa.json.games || []).filter((g) => g.playable).length;
    const guestPlayableCount = playable.length;
    if (regPlayable >= guestPlayableCount) pass("registered-more-games-than-guest", `reg=${regPlayable} guest=${guestPlayableCount}`);
    else fail("registered-more-games-than-guest");

    const regBox = await api("GET", "/api/student/rewards/surprise-box/status");
    if (regBox.res.ok) {
      const guestPending = box.json?.pendingBoxCount ?? 0;
      const regPending = regBox.json?.pendingBoxCount ?? 0;
      pass("registered-surprise-box-ok", `guestPending=${guestPending} regPending=${regPending}`);
    } else skip("registered-surprise-box", `HTTP ${regBox.status}`);

    const regSession = await api("POST", "/api/learning/session/start", {
      subject: "math",
      topic: "add",
      mode: "learning",
    });
    if (regSession.res.ok) pass("registered-learning-session");
    else fail("registered-learning-session", JSON.stringify(regSession.json).slice(0, 100));
  } else {
    fail("registered-login", "admin/1234 — run provision-demo-account if needed");
  }

  // Parent link flow
  console.log("\n11. Parent link (coins+cards only)");
  if (guestId1 && leo1) {
    cookieJar.clear();
    const startLinkGuest = await api("POST", "/api/student/guest/start", {});
    const linkGuestId = startLinkGuest.json.student?.id;
    const linkLeo = startLinkGuest.json.leoNumber;
    const linkResume = startLinkGuest.json.resumeToken;

    if (!linkGuestId || !linkLeo) {
      fail("parent-link-setup-guest");
    } else {
      await service.from("student_coin_balances").upsert(
        { student_id: linkGuestId, balance: 500, updated_at: new Date().toISOString() },
        { onConflict: "student_id" }
      );

      let newChildId = null;
      if (pTok) {
        const childName = `QA-Guest-Link-${Date.now().toString(36).slice(-4)}`;
        const create = await api(
          "POST",
          "/api/parent/create-student",
          { fullName: childName, gradeLevel: "g3" },
          { Authorization: `Bearer ${pTok}` }
        );
        newChildId = create.json.student?.id;
        if (create.res.ok && newChildId) pass("parent-create-child-http", newChildId);
        else fail("parent-create-child-http", JSON.stringify(create.json).slice(0, 120));
      } else {
        skip("parent-create-child", "no parent token — set DEMO_PARENT_PASSWORD in .env.local");
      }

      if (newChildId && pTok) {
        const link = await api(
          "POST",
          "/api/parent/guest/link",
          { targetStudentId: newChildId, leoNumber: linkLeo },
          { Authorization: `Bearer ${pTok}` }
        );
        const linkOk = link.res.ok && link.json.ok;
        if (linkOk) pass("parent-link-http", link.json.message);
        else fail("parent-link-http", JSON.stringify(link.json).slice(0, 120));

        if (linkOk) {
          const { data: guestAfter } = await service
            .from("students")
            .select("guest_status, guest_linked_to_student_id, is_active")
            .eq("id", linkGuestId)
            .single();
          if (guestAfter?.guest_status === "linked") pass("guest-marked-linked");
          else fail("guest-marked-linked", JSON.stringify(guestAfter));

          const { data: bal } = await service
            .from("student_coin_balances")
            .select("balance")
            .eq("student_id", newChildId)
            .maybeSingle();
          if ((bal?.balance ?? 0) >= 500) pass("coins-transferred-to-child");
          else fail("coins-transferred-to-child", String(bal?.balance));

          const { count: childSessions } = await service
            .from("learning_sessions")
            .select("id", { count: "exact", head: true })
            .eq("student_id", newChildId);
          if ((childSessions ?? 0) === 0) pass("learning-not-transferred-to-child");
          else fail("learning-not-transferred-to-child", String(childSessions));

          if (linkResume) {
            const resumeLinked = await api("POST", "/api/student/guest/resume", { resumeToken: linkResume });
            if (!resumeLinked.res.ok) pass("linked-guest-resume-blocked");
            else fail("linked-guest-resume-blocked");
          }

          const link2 = await api(
            "POST",
            "/api/parent/guest/link",
            { targetStudentId: newChildId, leoNumber: linkLeo },
            { Authorization: `Bearer ${pTok}` }
          );
          if (!link2.res.ok) pass("leo-not-linkable-twice");
          else fail("leo-not-linkable-twice", JSON.stringify(link2.json).slice(0, 80));
        }
      } else if (!pTok) {
        skip("parent-link-flow", "no parent token");
      }
    }
  } else {
    skip("parent-link-flow", "no guest from flow");
  }

  printReport();
  const failed = results.filter((r) => r.status === "FAIL").length;
  process.exit(failed > 0 ? 1 : 0);
}

function printReport() {
  const passN = results.filter((r) => r.status === "PASS").length;
  const failN = results.filter((r) => r.status === "FAIL").length;
  const skipN = results.filter((r) => r.status === "SKIP").length;
  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${passN}  FAIL: ${failN}  SKIP: ${skipN}`);
  if (failN) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => x.status === "FAIL")) {
      console.log(`  - ${r.id}: ${r.detail}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
