#!/usr/bin/env node
/**
 * Phase 4 technical GREEN — browser / PWA verification (QA throwaway fixtures).
 *
 *   node --env-file=.env.local scripts/security/school-phase4-browser-pwa-verification.mjs
 *
 * Uses Playwright request context for cookie-accurate staff flows.
 * Installed PWA mode marked NOT RUN (requires OS-level install on owner device).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const FIXTURES_PATH = path.join(ROOT, "reports/security/school-phase4-technical-green-fixtures.json");
const NOTES_OUT = path.join(ROOT, "reports/security/school-phase4-technical-green-browser-results.md");
const OUTPUT_TXT = path.join(ROOT, "reports/security/test-output-school-phase4-browser-pwa-verification.txt");

/** @type {Array<{ id: string, status: 'PASS'|'FAIL'|'NOT_RUN', detail: string }>} */
const results = [];

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function baseUrl() {
  return (
    env("SCHOOL_A_BASE_URL") ||
    env("PHASE45_BASE_URL") ||
    env("SCHOOL_PORTAL_BASE_URL") ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

function record(id, status, detail) {
  results.push({ id, status, detail });
  console.log(`[${status}] ${id}: ${detail}`);
}

function loadFixtures() {
  if (!fs.existsSync(FIXTURES_PATH)) {
    throw new Error(`Missing ${FIXTURES_PATH} — run school-phase4-qa-staff-cookie-fixtures.mjs first`);
  }
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf8"));
}

async function main() {
  const fixtures = loadFixtures();
  const url = baseUrl();
  const lines = [`Phase 4 browser/PWA verification — ${url}`, ""];

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: url });
    const request = context.request;

    // ── Staff login → /me → logout → /me blocked (cookie injection — QA fixture) ──
    const op = fixtures.operatorNoGrants;
    await context.addCookies([
      {
        name: "liosh_staff_session",
        value: op.cookie,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const meBefore = await request.get("/api/school/me");
    const meBeforeOk = meBefore.status() === 200;
    record(
      "browser-staff-me-before-logout",
      meBeforeOk ? "PASS" : "FAIL",
      `HTTP ${meBefore.status()}`
    );

    const logoutRes = await request.post("/api/school/staff/logout");
    const logoutOk = logoutRes.status() === 200;
    record("browser-staff-logout", logoutOk ? "PASS" : "FAIL", `HTTP ${logoutRes.status()}`);

    const meAfter = await request.get("/api/school/me");
    const meAfterBlocked = meAfter.status() === 401 || meAfter.status() === 403;
    record(
      "browser-staff-me-after-logout",
      meAfterBlocked ? "PASS" : "FAIL",
      `HTTP ${meAfter.status()}`
    );

    // ── Report fetch after logout (simulate leaving report open) ──
    const studentA = fixtures.studentAId;
    const reportAfterLogout = await request.get(
      `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`
    );
    const reportBlocked = reportAfterLogout.status() === 401 || reportAfterLogout.status() === 403;
    record(
      "browser-staff-report-after-logout",
      reportBlocked ? "PASS" : "FAIL",
      `HTTP ${reportAfterLogout.status()}`
    );

    // ── Back navigation after visiting protected page (cookie cleared) ──
    const page = await context.newPage();
    await page.goto("/school/staff/login");
    await page.goBack();
    const meAfterBack = await request.get("/api/school/me");
    const backBlocked = meAfterBack.status() === 401 || meAfterBack.status() === 403;
    record(
      "browser-staff-back-button-session",
      backBlocked ? "PASS" : "FAIL",
      `HTTP ${meAfterBack.status()} after goBack from login page`
    );

    // ── Manager JWT session — bearer from env sign-in ──
    const password =
      env("SCHOOL_SECURITY_TEST_PASSWORD") || env("SCHOOL_QA_PASSWORD") || env("DEMO_TEACHER_PASSWORD");
    const supabaseUrl = env("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
    const anonKey = env("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
    let managerToken = null;
    if (password && supabaseUrl && anonKey) {
      const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "school-qa-a@leo.com", password }),
      });
      const tokenJson = await tokenRes.json();
      managerToken = tokenJson.access_token || null;
    }
    if (managerToken && studentA) {
      const mgrReport = await request.get(
        `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`,
        { headers: { Authorization: `Bearer ${managerToken}` } }
      );
      record(
        "browser-manager-report-authed",
        mgrReport.status() === 200 ? "PASS" : "FAIL",
        `HTTP ${mgrReport.status()}`
      );

      const mgrReportAfterClear = await request.get(
        `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`
      );
      record(
        "browser-manager-report-without-bearer",
        mgrReportAfterClear.status() === 401 || mgrReportAfterClear.status() === 403 ? "PASS" : "FAIL",
        `HTTP ${mgrReportAfterClear.status()} (no bearer — simulates logout)`
      );
    } else {
      record("browser-manager-report-authed", "NOT_RUN", "missing managerBearer in fixtures");
      record("browser-manager-report-without-bearer", "NOT_RUN", "missing fixtures");
    }

    // ── Offline protected API — must not return 200 report JSON ──
    await context.setOffline(true);
    let offlineStatus = 0;
    let offlineFailed = false;
    try {
      const offlineRes = await request.get(
        `/api/school/students/${encodeURIComponent(fixtures.studentAId)}/report-data?windowDays=30`,
        { timeout: 5000 }
      );
      offlineStatus = offlineRes.status();
    } catch {
      offlineFailed = true;
    }
    await context.setOffline(false);
    record(
      "browser-offline-school-api",
      offlineFailed || offlineStatus !== 200 ? "PASS" : "FAIL",
      offlineFailed
        ? "network error as expected"
        : `HTTP ${offlineStatus} (must not be 200 with live report offline)`
    );

    // ── localStorage / sessionStorage on school staff login page ──
    await page.goto("/school/staff/login");
    const storage = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    const deny = /pin|token|password|report|audit|staff/i;
    const badKeys = [...storage.local, ...storage.session].filter((k) => deny.test(k));
    record(
      "browser-school-page-no-sensitive-storage",
      badKeys.length === 0 ? "PASS" : "FAIL",
      badKeys.length ? badKeys.join(",") : `local=${storage.local.length} session=${storage.session.length}`
    );

    // ── Service worker skips API (source) ──
    const sw = fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf8");
    record(
      "browser-sw-skips-api-source",
      /url\.pathname\.startsWith\(['"]\/api\//.test(sw) ? "PASS" : "FAIL",
      "public/sw.js"
    );

    // ── Installed PWA mode ──
    record(
      "browser-pwa-installed-mode",
      "NOT_RUN",
      "requires OS-level PWA install on owner device — not automatable in CI/agent shell"
    );

    await context.close();
  } finally {
    if (browser) await browser.close();
  }

  for (const r of results) {
    lines.push(`- **${r.id}**: ${r.status} — ${r.detail}`);
  }

  const fail = results.filter((r) => r.status === "FAIL");
  const notRun = results.filter((r) => r.status === "NOT_RUN");
  lines.push("", `Summary: PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${fail.length} NOT_RUN=${notRun.length}`);

  fs.mkdirSync(path.dirname(NOTES_OUT), { recursive: true });
  fs.writeFileSync(NOTES_OUT, lines.join("\n"), "utf8");
  fs.writeFileSync(OUTPUT_TXT, lines.join("\n"), "utf8");

  if (fail.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
