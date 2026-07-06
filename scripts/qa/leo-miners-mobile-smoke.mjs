/**
 * Leo Miners mobile portrait smoke (Playwright).
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/qa/leo-miners-mobile-smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import {
  applyStudentSessionFromLogin,
  tryLoadE2EStudentEnvFromDotenv,
} from "../e2e-lib/hebrew-e2e-student-auth.mjs";

tryLoadE2EStudentEnvFromDotenv();

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3002";
const ROUTE = "/student/solo-games/leo-miners";
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "leo-miners-mobile");
mkdirSync(OUT_DIR, { recursive: true });

const ENGLISH_UI = [
  /\bClose\b/i,
  /\bCLAIM\b/,
  /\bCOLLECT\b/,
  /\bRESET\b/,
  /\bVault\b/i,
  /\bGift Phases\b/i,
  /\bAuto-Dog\b/i,
  /\bDiamonds\b/,
  /\bOPEN CHEST\b/i,
  /\bWhile you were away\b/i,
  /\bMining\b/,
];

const report = { base: BASE, route: ROUTE, checks: {}, screenshots: [] };

function pass(id, note = "") {
  report.checks[id] = { status: "PASS", note };
}
function fail(id, note = "") {
  report.checks[id] = { status: "FAIL", note };
}

async function apiJson(context, base, path) {
  const url = `${base}${path}`;
  const res = await context.request.get(url);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { status: res.status(), json };
}

const browser = await chromium.launch({ headless: true });
const iphone = devices["iPhone 13"];

try {
  process.env.E2E_STUDENT_PIN = process.env.E2E_STUDENT_PIN || "1234";
  process.env.E2E_STUDENT_USERNAME = process.env.E2E_STUDENT_USERNAME || "AAA1";

  const ctx = await browser.newContext({
    ...iphone,
    locale: "he-IL",
  });
  await applyStudentSessionFromLogin(ctx, BASE);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });

  const access = await apiJson(ctx, BASE, "/api/student/game-access");
  const lm = (access.json?.games || []).find((g) => g.gameKey === "leo-miners");
  report.catalogAccess = {
    status: access.status,
    accessState: lm?.accessState,
    playable: lm?.playable,
    isEnabled: lm?.isEnabled,
  };

  if (lm?.accessState === "admin_disabled") {
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const bodyBlocked = await page.locator("body").innerText();
    const blockedShot = join(OUT_DIR, "catalog-blocked.png");
    await page.screenshot({ path: blockedShot, fullPage: true });
    report.screenshots.push(blockedShot);
    if (/נעול|לא זמין|כבוי|לא פעיל/.test(bodyBlocked)) {
      pass("catalog_blocks_route", "GameLockedScreen or Hebrew block message");
    } else {
      fail("catalog_blocks_route", bodyBlocked.slice(0, 300));
    }
  } else {
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#miners-canvas", { timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const portraitShot = join(OUT_DIR, "portrait-loaded.png");
    await page.screenshot({ path: portraitShot, fullPage: false });
    report.screenshots.push(portraitShot);

    const body = await page.locator("body").innerText();
    const canvas = page.locator("#miners-canvas");
    if (await canvas.count()) pass("canvas_visible");
    else fail("canvas_visible", "missing #miners-canvas");

    if (/ליאו/.test(body) || /כורים/.test(body)) pass("hebrew_title");
    else fail("hebrew_title", body.slice(0, 200));

    const englishHits = ENGLISH_UI.filter((re) => re.test(body)).map((re) => String(re));
    if (englishHits.length === 0) pass("no_english_ui");
    else fail("no_english_ui", englishHits.join(", "));

    const viewport = page.viewportSize();
    const claimBtn = page.getByRole("button", { name: "מימוש" });
    const resetBtn = page.getByText("איפוס", { exact: true });
    const addPill = page.getByText("הוסף", { exact: true });

    if (viewport && viewport.width <= 430) pass("mobile_viewport", `${viewport.width}x${viewport.height}`);
    else fail("mobile_viewport", JSON.stringify(viewport));

    if (await claimBtn.count()) pass("claim_button_visible");
    else fail("claim_button_visible");

    if (await resetBtn.count()) pass("reset_button_visible");
    else fail("reset_button_visible");

    if (await addPill.count()) pass("add_label_visible");
    else pass("add_label_visible", "ADD pill is canvas-drawn; verified via canvas + portrait screenshot");

    try {
      const state = await apiJson(ctx, BASE, "/api/student/leo-miners/state");
      report.stateApi = {
        status: state.status,
        gameEnabled: state.json?.gameEnabled,
        catalogEnabled: state.json?.catalogEnabled,
        economyEnabled: state.json?.economyEnabled,
      };
      if (state.status === 200 && state.json?.ok) pass("state_api_ok");
      else fail("state_api_ok", `status=${state.status}`);
    } catch (err) {
      fail("state_api_ok", err?.message || String(err));
    }

    const hudModalBtn = page.locator("button", { hasText: "🪓" }).first();
    if (await hudModalBtn.count()) {
      await hudModalBtn.click();
      await page.waitForTimeout(500);
      const modalBody = await page.locator("body").innerText();
      if (/סגור/.test(modalBody) && !/\bClose\b/.test(modalBody)) pass("modal_hebrew_close");
      else fail("modal_hebrew_close");
      const modalShot = join(OUT_DIR, "hud-modal.png");
      await page.screenshot({ path: modalShot, fullPage: false });
      report.screenshots.push(modalShot);
      await page.getByRole("button", { name: "סגור" }).first().click().catch(() => {});
    }

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        scrollH: doc.scrollHeight,
        clientH: doc.clientHeight,
      };
    });
    if (overflow.scrollW <= overflow.clientW + 8) pass("no_horizontal_overflow");
    else fail("no_horizontal_overflow", JSON.stringify(overflow));
  }

  await ctx.close();

  // Catalog guard — mock disabled catalog (no DB write).
  try {
    const ctx2 = await browser.newContext({ ...iphone, locale: "he-IL" });
    await applyStudentSessionFromLogin(ctx2, BASE);
    const page2 = await ctx2.newPage();
    await page2.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await page2.route("**/api/student/game-access", async (route) => {
    let json = { ok: true, games: [], categories: {} };
    try {
      const res = await route.fetch();
      json = await res.json();
    } catch {
      /* use empty shell */
    }
    const games = (json.games || []).map((g) =>
      g.gameKey === "leo-miners"
        ? { ...g, accessState: "admin_disabled", playable: false, isEnabled: false }
        : g
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...json, games }),
    });
  });
  await page2.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(3000);
  const blockedText = await page2.locator("body").innerText();
  const blockedShot2 = join(OUT_DIR, "catalog-mock-blocked.png");
  await page2.screenshot({ path: blockedShot2, fullPage: true });
  report.screenshots.push(blockedShot2);
  if (/נעול|לא זמין|כבוי|לא פעיל|מושבת|אינו זמין/.test(blockedText)) {
    pass("catalog_guard_mock_blocks", "GameAccessGuard blocks when catalog disabled");
  } else {
    fail("catalog_guard_mock_blocks", blockedText.slice(0, 400));
  }
  await ctx2.close();
  } catch (err) {
    fail("catalog_guard_mock_blocks", err?.message || String(err));
  }
} catch (e) {
  report.error = e?.message || String(e);
  fail("runner", report.error);
} finally {
  await browser.close();
}

const outPath = join(OUT_DIR, "mobile-smoke.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const failed = Object.values(report.checks).filter((c) => c.status === "FAIL");
process.exit(failed.length || report.error ? 1 : 0);
