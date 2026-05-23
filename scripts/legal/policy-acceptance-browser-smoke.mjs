#!/usr/bin/env node
/**
 * Phase D.2D — Browser smoke: page-only scroll for parent policy acceptance.
 *
 * Usage:
 *   npm run build
 *   npx next start -p 3110
 *   node --env-file=.env.local scripts/legal/policy-acceptance-browser-smoke.mjs --base http://localhost:3110
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { isCurrentPolicyAccepted } from "../../lib/parent-server/policy-acceptance.server.js";

const baseUrl = (() => {
  const idx = process.argv.indexOf("--base");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].replace(/\/$/, "");
  return String(process.env.POLICY_BROWSER_SMOKE_BASE_URL || "http://localhost:3110").replace(/\/$/, "");
})();

const POLICY_ROOT = "[data-policy-acceptance-root]";
const SCREENSHOT_PATH = path.join(process.cwd(), "reports", "legal", "policy-acceptance-d2d-scroll.png");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) fail(`Missing ${name}`);
  return v;
}

async function createEphemeralParent(admin) {
  const password = crypto.randomBytes(24).toString("base64url");
  const runId = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `policy-browser-${runId}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "policy-browser-smoke" },
  });
  if (created.error || !created.data.user?.id) {
    fail(`createUser failed: ${created.error?.message || "unknown"}`);
  }
  return { email, password, userId: created.data.user.id };
}

async function cleanupParent(admin, userId) {
  if (!userId) return;
  await admin.from("parent_policy_acceptances").delete().eq("parent_user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

async function gotoLoginForm(page) {
  await page.context().clearCookies();
  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const emailField = page.getByPlaceholder("אימייל הורה");
  if ((await emailField.count()) === 0) {
    const loginTab = page.getByRole("button", { name: "כניסה" }).first();
    if ((await loginTab.count()) > 0) await loginTab.click();
  }
  await emailField.waitFor({ state: "visible", timeout: 20_000 });
}

async function scrollPageToBottom(page) {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.85, 200);
    let lastY = -1;
    for (let i = 0; i < 40; i += 1) {
      window.scrollBy(0, step);
      await new Promise((r) => setTimeout(r, 40));
      const y = window.scrollY;
      if (y === lastY) break;
      lastY = y;
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

/** Strict D.2D audit: no internal scroll traps inside acceptance root. */
async function assertPageOnlyScroll(page) {
  const audit = await page.evaluate(() => {
    const root = document.querySelector("[data-policy-acceptance-root]");
    if (!root) return { ok: false, reason: "missing data-policy-acceptance-root" };

    const offenders = [];
    const nodes = [root, ...root.querySelectorAll("*")];
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      const ox = style.overflowX;
      const oy = style.overflowY;
      const maxH = style.maxHeight;
      const h = style.height;

      if (ox === "hidden" || ox === "clip") {
        offenders.push({
          kind: "overflow-x-trap",
          tag: el.tagName,
          className: String(el.className || "").slice(0, 100),
          ox,
          oy,
        });
      }
      if (oy === "auto" || oy === "scroll") {
        offenders.push({
          kind: "overflow-y-scrollbox",
          tag: el.tagName,
          className: String(el.className || "").slice(0, 100),
          ox,
          oy,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        });
      }
      if (maxH && maxH !== "none" && maxH !== "0px") {
        offenders.push({
          kind: "max-height",
          tag: el.tagName,
          className: String(el.className || "").slice(0, 100),
          maxHeight: maxH,
        });
      }
      if (h && h !== "auto" && h.endsWith("px") && el !== document.documentElement && el !== document.body) {
        const px = parseFloat(h);
        if (px > 0 && px < el.scrollHeight - 4) {
          offenders.push({
            kind: "fixed-height",
            tag: el.tagName,
            className: String(el.className || "").slice(0, 100),
            height: h,
          });
        }
      }
    }

    const docEl = document.documentElement;
    const bodyScrollable = docEl.scrollHeight > window.innerHeight + 8;
    return {
      ok: offenders.length === 0,
      mode: root.getAttribute("data-policy-scroll-mode"),
      bodyScrollable,
      docScrollHeight: docEl.scrollHeight,
      viewportHeight: window.innerHeight,
      offenders: offenders.slice(0, 12),
    };
  });

  if (!audit.ok) {
    fail(`D.2D scroll audit failed: ${JSON.stringify(audit, null, 2)}`);
  }
  if (audit.mode !== "page-only") {
    fail(`D.2D: expected data-policy-scroll-mode=page-only, got ${audit.mode}`);
  }
  ok(`D.2D — page-only scroll audit (${audit.docScrollHeight}px doc height)`);
  return audit;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ephemeral = null;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "he-IL", viewport: { width: 1280, height: 800 } });

  try {
    await gotoLoginForm(page);
    await page.getByPlaceholder("אימייל הורה").fill("wrong-parent@example.com");
    await page.getByPlaceholder("סיסמה").fill("wrong-password-123");
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.getByText(/פרטי ההתחברות שגויים/).waitFor({ state: "visible", timeout: 20_000 });
    ok("A — Hebrew wrong-credentials error");

    await gotoLoginForm(page);
    await page.getByRole("button", { name: "הרשמה" }).click();
    await page.locator(POLICY_ROOT).waitFor({ state: "visible", timeout: 10_000 });
    await assertPageOnlyScroll(page);
    ok("D — signup shows page-only policy section");

    ephemeral = await createEphemeralParent(admin);
    await gotoLoginForm(page);
    await page.getByPlaceholder("אימייל הורה").fill(ephemeral.email);
    await page.getByPlaceholder("סיסמה").fill(ephemeral.password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/parent/dashboard", { timeout: 20_000 });
    await page.locator(POLICY_ROOT).waitFor({ state: "visible", timeout: 15_000 });

    await page.evaluate(() => window.scrollTo(0, 0));
    await assertPageOnlyScroll(page);

    fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true });
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    ok(`D.2D — screenshot saved: ${SCREENSHOT_PATH}`);

    const checkbox = page.locator(`${POLICY_ROOT} input[type="checkbox"]`);
    if (!(await checkbox.isDisabled())) fail("checkbox should be disabled before page bottom");

    await scrollPageToBottom(page);
    await page.waitForFunction(() => {
      const cb = document.querySelector("[data-policy-acceptance-root] input[type='checkbox']");
      return cb && !cb.disabled;
    }, { timeout: 10_000 });

    if (await page.locator('button:has-text("אני מסכים/ה וממשיך/ה")').isEnabled()) {
      fail("approve should stay disabled until checkbox checked");
    }

    await page.locator('button:has-text("אינני מסכים/ה")').click();
    await page.locator("text=לא ניתן להמשיך לאזור ההורים").waitFor({ state: "visible" });
    ok("B — decline blocks dashboard");

    await page.getByRole("button", { name: "קראו שוב את המדיניות" }).click();
    await page.locator(POLICY_ROOT).waitFor({ state: "visible" });
    await scrollPageToBottom(page);
    await page.locator(`${POLICY_ROOT} input[type="checkbox"]`).check();
    await page.locator('button:has-text("אני מסכים/ה וממשיך/ה")').click();
    await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ state: "visible", timeout: 15_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    if ((await page.locator(POLICY_ROOT).count()) > 0) {
      fail("gate reappeared after accept + refresh");
    }
    ok("B — accept unlocks dashboard; refresh stays unlocked");

    const stale = isCurrentPolicyAccepted({
      terms_version: "1999-01-01",
      privacy_version: "1999-01-01",
    });
    if (stale) fail("C: stale version should not be accepted");
    ok("C — version mismatch logic");

    console.log("\nPASS: Phase D.2D browser smoke (page-only scroll)");
  } finally {
    await browser.close();
    if (ephemeral) await cleanupParent(admin, ephemeral.userId);
  }
}

main().catch((err) => fail(err?.message || String(err)));
