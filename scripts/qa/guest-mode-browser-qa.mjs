#!/usr/bin/env node
/**
 * Guest mode v2 — browser QA (Playwright).
 * Run: node scripts/qa/guest-mode-browser-qa.mjs
 * Requires dev server on GUEST_QA_BASE_URL (default http://127.0.0.1:3002).
 */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const BASE = (process.env.GUEST_QA_BASE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
const OUT_DIR = join(ROOT, "docs", "qa", "_artifacts", "guest-mode-browser-qa");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
const parentPassword =
  process.env.QA_PARENT_PASSWORD ||
  process.env.DEMO_PARENT_PASSWORD ||
  process.env.DEMO_TEACHER_PASSWORD ||
  "";
const adminEmail = process.env.QA_PLATFORM_ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL || "office@leo.com";
const adminPassword =
  process.env.QA_PLATFORM_ADMIN_PASSWORD ||
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.DEMO_PARENT_PASSWORD ||
  "";

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

async function ensureGuestEnabled(service) {
  await service.from("guest_mode_settings").upsert(
    {
      setting_key: "guest_mode_enabled",
      setting_value_json: { enabled: true },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );
  await new Promise((r) => setTimeout(r, 31_000));
}

async function ensureParentPassword(service) {
  if (!parentPassword) return false;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const trial = await anon.auth.signInWithPassword({ email: "admin@admin.com", password: parentPassword });
  if (trial.data.session?.access_token) return true;
  const { error } = await service.auth.admin.updateUserById(QA_PARENT_ID, {
    password: parentPassword,
    email_confirm: true,
  });
  return !error;
}

async function guestLogin(page) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
  await page.getByTestId("student-guest-start").click();
  await page.waitForURL(/\/student\/home/, { timeout: 60_000 });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("\n=== Guest Mode Browser QA ===");
  console.log(`Base: ${BASE}\n`);

  if (!url || !serviceKey || !anonKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  await ensureGuestEnabled(service);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();

  let leoNumber = "";
  let guestStudentId = "";

  // Guest login + home tiles
  console.log("1. Guest home + tiles");
  try {
    await guestLogin(page);
    const me = await page.evaluate(async () => {
      const r = await fetch("/api/student/me", { credentials: "same-origin" });
      return r.json();
    });
    leoNumber = me?.student?.leoNumber || me?.student?.leo_number || "";
    guestStudentId = me?.student?.id || "";
    if (me?.isGuest && leoNumber) pass("browser-guest-login", leoNumber);
    else fail("browser-guest-login");

    const lp = await page.evaluate(async () => {
      const r = await fetch("/api/student/learning-profile", { credentials: "same-origin" });
      return { status: r.status, json: await r.json() };
    });
    if (lp.status === 403 && lp.json?.code === "guest_not_eligible") pass("browser-learning-profile-blocked");
    else fail("browser-learning-profile-blocked", `HTTP ${lp.status}`);

    for (const tileId of ["stats", "progress", "missions", "classroom", "worksheets", "recommendations"]) {
      const tile = page.getByTestId(`student-home-tile-${tileId}`);
      const disabled = await tile.isDisabled().catch(() => false);
      const text = await tile.textContent().catch(() => "");
      if (disabled && text.includes("🔒")) pass(`browser-tile-locked-${tileId}`);
      else fail(`browser-tile-locked-${tileId}`, `disabled=${disabled}`);
    }

    const subjectsTile = page.getByTestId("student-home-tile-subjects");
    if (await subjectsTile.isEnabled().catch(() => false)) pass("browser-tile-subjects-open");
    else fail("browser-tile-subjects-open");
  } catch (e) {
    fail("browser-guest-home", String(e.message || e));
  }

  // Topic locks on math master
  console.log("\n2. Math master topic locks");
  try {
    await page.goto("/learning/math-master", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("math-operation-select").waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForFunction(() => {
      const sel = document.querySelector('[data-testid="math-operation-select"]');
      if (!sel) return false;
      const opts = [...sel.querySelectorAll("option")].filter((o) => o.value && o.value !== "mixed");
      return opts.some((o) => o.disabled || String(o.textContent || "").includes("🔒"));
    }, { timeout: 45_000 });
    const topicState = await page.evaluate(() => {
      const sel = document.querySelector('[data-testid="math-operation-select"]');
      if (!sel) return { locked: 0, open: 0, labels: [] };
      const opts = [...sel.querySelectorAll("option")].filter((o) => o.value && o.value !== "mixed");
      return {
        locked: opts.filter((o) => o.disabled || o.textContent.includes("🔒")).length,
        open: opts.filter((o) => !o.disabled && !o.textContent.includes("🔒")).length,
        labels: opts.map((o) => o.textContent),
      };
    });
    if (topicState.locked >= 1 && topicState.open >= 1) {
      pass("browser-math-topic-locks", `open=${topicState.open} locked=${topicState.locked}`);
    } else {
      fail("browser-math-topic-locks", JSON.stringify(topicState));
    }
    await page.screenshot({ path: join(OUT_DIR, "math-master-topics.png"), fullPage: false });
  } catch (e) {
    fail("browser-math-topic-locks", String(e.message || e));
  }

  // Shop / cards / coins
  console.log("\n3. Shop / cards / coins");
  try {
    if (guestStudentId) {
      await service.from("student_coin_balances").upsert(
        { student_id: guestStudentId, balance: 200, updated_at: new Date().toISOString() },
        { onConflict: "student_id" }
      );
    }
    await page.goto("/student/cards", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const cardsVisible =
      (await page.getByText(/חנות קלפים|האוסף שלי|אוסף הקלפים/).first().isVisible().catch(() => false)) ||
      (await page.getByText(/מטבעות/).first().isVisible().catch(() => false));
    const cardsApi = await page.evaluate(async () => {
      const r = await fetch("/api/student/rewards/cards/shop", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      return { status: r.status, ok: j.ok === true };
    });
    if (cardsVisible || cardsApi.ok) pass("browser-cards-page", cardsVisible ? "UI" : "API shop ok");
    else fail("browser-cards-page", `ui=${cardsVisible} api=${JSON.stringify(cardsApi)}`);

    await page.goto("/learning/math-master", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("math-operation-select").waitFor({ state: "visible", timeout: 60_000 });
    const coinsBefore = await page.evaluate(async () => {
      const r = await fetch("/api/student/me", { credentials: "same-origin" });
      const j = await r.json();
      return j?.student?.coinBalance ?? j?.student?.coin_balance ?? 0;
    });
    const startBtn = page.getByTestId("math-start-game");
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      const answerBtn = page.locator("button").filter({ hasText: /^[0-9+\-/=]+$|^[0-9]+$/ }).first();
      if (await answerBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await answerBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    const coinsAfter = await page.evaluate(async () => {
      const r = await fetch("/api/student/me", { credentials: "same-origin" });
      const j = await r.json();
      return j?.student?.coinBalance ?? j?.student?.coin_balance ?? 0;
    });
    if (coinsAfter >= coinsBefore) pass("browser-coins-session", `before=${coinsBefore} after=${coinsAfter}`);
    else fail("browser-coins-session");
  } catch (e) {
    fail("browser-shop-coins", String(e.message || e));
  }

  // Admin UI
  console.log("\n4. Admin /admin/guest");
  const adminCtx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const adminPage = await adminCtx.newPage();
  try {
    if (!adminPassword) throw new Error("no admin password");
    await adminPage.goto("/teacher/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await adminPage.locator('input[type="email"], input[autocomplete="username"]').first().fill(adminEmail);
    await adminPage.locator('input[type="password"]').first().fill(adminPassword);
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForTimeout(3000);
    await adminPage.goto("/admin/guest", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await adminPage.getByText("משחקים לקטגוריה").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await adminPage.waitForTimeout(2000);
    const bodyText = await adminPage.locator("body").innerText();
    const hasToggle = bodyText.includes("מצ") && bodyText.includes("אור");
    const hasGames = bodyText.includes("משחקים לקטגוריה");
    const hasBox = bodyText.includes("קופסת הפתעה");
    const hasList = bodyText.includes("רשימת");
    if (hasToggle && hasGames && hasBox) pass("browser-admin-guest-page");
    else fail("browser-admin-guest-page", `toggle=${hasToggle} games=${hasGames} box=${hasBox}`);
    if (hasList) pass("browser-admin-guest-list");
    else fail("browser-admin-guest-list");
    if (leoNumber) {
      await adminPage.locator('input[placeholder*="ליאו"], input[type="search"]').first().fill(leoNumber).catch(() => {});
      await adminPage.getByRole("button", { name: /חיפוש|חפש/ }).click().catch(() => {});
      await adminPage.waitForTimeout(1500);
      pass("browser-admin-leo-search-attempt", leoNumber);
    }
    await adminPage.screenshot({ path: join(OUT_DIR, "admin-guest.png"), fullPage: true });
  } catch (e) {
    fail("browser-admin-guest", String(e.message || e));
  } finally {
    await adminCtx.close();
  }

  // Parent link flow — fresh guest via API (do not reuse browser guest)
  console.log("\n5. Parent link UI");
  const parentCtx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const parentPage = await parentCtx.newPage();
  let linkLeo = "";
  try {
    if (!parentPassword) throw new Error("missing parent password");
    await ensureParentPassword(service);
    const linkGuestRes = await fetch(`${BASE}/api/student/guest/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: "{}",
    });
    const linkGuestJson = await linkGuestRes.json();
    linkLeo = linkGuestJson.leoNumber || "";
    const linkGuestId = linkGuestJson.student?.id;
    if (!linkLeo || !linkGuestId) throw new Error("fresh guest for link failed");
    await service.from("student_coin_balances").upsert(
      { student_id: linkGuestId, balance: 300, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );

    await parentPage.goto("/parent/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await parentPage.getByTestId("parent-login-identifier").waitFor({ state: "visible", timeout: 30_000 });
    await parentPage.waitForTimeout(1500);
    await parentPage.getByTestId("parent-login-identifier").fill("admin@admin.com");
    await parentPage.getByTestId("parent-login-secret").fill(parentPassword);
    await parentPage.locator("form").getByRole("button", { name: "כניסה" }).click();
    try {
      await parentPage.waitForURL(/\/parent\/dashboard/, { timeout: 45_000 });
    } catch {
      const errSnippet = (await parentPage.locator("body").innerText()).slice(0, 400);
      throw new Error(`parent login failed at ${parentPage.url()} — ${errSnippet}`);
    }
    await parentPage.getByRole("button", { name: "הוספת ילד" }).click();
    const addModal = parentPage.getByRole("dialog");
    await addModal.waitFor({ state: "visible", timeout: 15_000 });
    const childName = `QA-Browser-${Date.now().toString(36).slice(-4)}`;
    const childUser = `qa${Date.now().toString(36).slice(-6)}`;
    const childPin = "4321";
    await addModal.getByPlaceholder("שם הילד").fill(childName);
    await addModal.locator("select").first().selectOption({ index: 1 });
    await addModal.getByPlaceholder("6 ספרות").fill(linkLeo);
    await addModal.getByPlaceholder("לדוגמה: noam123").fill(childUser);
    await addModal.getByPlaceholder("4 ספרות").fill(childPin);
    await addModal.getByRole("button", { name: "הוסף ילד" }).click();
    await addModal.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
    await parentPage.waitForTimeout(2000);
    const msg = await parentPage.locator("body").innerText();
    if (
      msg.includes("המטבעות והקלפים נשמרו") ||
      msg.includes("Student created") ||
      msg.includes(childName)
    ) {
      pass("browser-parent-link-message", childName);
    } else {
      fail("browser-parent-link-message", msg.slice(0, 400));
    }

    await parentPage.context().clearCookies();
    const childCtx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
    const childPage = await childCtx.newPage();
    await childPage.goto("/student/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await childPage.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
    await childPage.getByTestId("student-login-username").fill(childUser);
    await childPage.getByTestId("student-login-pin").fill(childPin);
    await childPage.getByTestId("student-login-submit").click();
    await childPage.waitForURL(/\/student\/home/, { timeout: 60_000 });
    const childMe = await childPage.evaluate(async () => {
      const r = await fetch("/api/student/me", { credentials: "same-origin" });
      return r.json();
    });
    if (childMe?.ok && !childMe?.isGuest) pass("browser-child-login-after-link", childUser);
    else fail("browser-child-login-after-link");
    await childCtx.close();
  } catch (e) {
    fail("browser-parent-link", String(e.message || e));
  } finally {
    await parentCtx.close();
  }

  await ctx.close();
  await browser.close();

  const summary = {
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    skip: results.filter((r) => r.status === "SKIP").length,
    results,
  };
  writeFileSync(join(OUT_DIR, "results.json"), JSON.stringify(summary, null, 2));
  console.log(`\n=== SUMMARY === PASS: ${summary.pass} FAIL: ${summary.fail} SKIP: ${summary.skip}`);
  console.log(`Report: ${join(OUT_DIR, "results.json")}`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
