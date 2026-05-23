#!/usr/bin/env node
/**
 * Phase D.2H — global version bump validation (read-only DB + browser where creds exist).
 *
 * Usage:
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/legal/policy-acceptance-global-version-d2h.mjs --base http://localhost:3002
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../data/legal/sitePolicies.he.js";
import {
  getPolicyAcceptanceServiceRole,
  resolveParentPolicyAcceptanceStatus,
} from "../../lib/parent-server/policy-acceptance.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REPORT_PATH = path.join(ROOT, "reports", "legal", "policy-acceptance-d2h-global-bump.json");

const baseUrl = (() => {
  const idx = process.argv.indexOf("--base");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].replace(/\/$/, "");
  return "http://localhost:3002";
})();

const TARGET_EMAILS = ["18eran@gmail.com", "admin@admin.com"];

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

async function findUserIdByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) fail(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function fetchAcceptanceRows(admin, parentUserId) {
  const { data, error } = await admin
    .from("parent_policy_acceptances")
    .select("id, terms_version, privacy_version, accepted_at, source, created_at")
    .eq("parent_user_id", parentUserId)
    .order("accepted_at", { ascending: true });
  if (error) fail(error.message);
  return data || [];
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

async function assertPageOnlyScroll(page) {
  const audit = await page.evaluate(() => {
    const root = document.querySelector("[data-policy-acceptance-root]");
    if (!root) return { ok: false, reason: "missing root" };
    const offenders = [];
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const s = getComputedStyle(el);
      if (s.overflowX === "hidden" || s.overflowX === "clip") offenders.push({ kind: "overflow-x", cls: el.className });
      if (s.overflowY === "auto" || s.overflowY === "scroll") offenders.push({ kind: "overflow-y", cls: el.className });
    }
    return { ok: offenders.length === 0, mode: root.getAttribute("data-policy-scroll-mode"), offenders: offenders.slice(0, 5) };
  });
  if (!audit.ok) fail(`scroll audit: ${JSON.stringify(audit)}`);
  if (audit.mode !== "page-only") fail(`expected page-only, got ${audit.mode}`);
}

async function assertAppendOnly(rowsBefore, rowsAfter, label) {
  const hasNew = rowsAfter.some(
    (r) => r.terms_version === TERMS_VERSION && r.privacy_version === PRIVACY_VERSION
  );
  if (!hasNew) fail(`${label}: missing new-version row after accept`);

  if (rowsBefore.length > 0 && rowsBefore[0].id !== "baseline") {
    for (const old of rowsBefore) {
      const still = rowsAfter.find((r) => r.id === old.id);
      if (!still) fail(`${label}: old row ${old.id} was deleted`);
    }
    ok(`${label} — old acceptance rows preserved (${rowsBefore.length} → ${rowsAfter.length} rows)`);
  } else if (rowsAfter.length >= 2) {
    ok(`${label} — append-only: ${rowsAfter.length} rows including new ${TERMS_VERSION}`);
  }
}

async function browserGateFlow(email, password) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "he-IL", viewport: { width: 1280, height: 800 } });
  const result = { email, steps: [] };
  try {
    await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("אימייל הורה").fill(email);
    await page.getByPlaceholder("סיסמה").fill(password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/parent/dashboard**", { timeout: 30_000 });
    await page.waitForTimeout(1500);

    const policyRootLocator = page.locator("[data-policy-acceptance-root]");
    const retryLocator = page.getByRole("button", { name: "נסו שוב" });
    await Promise.race([
      policyRootLocator.waitFor({ state: "visible", timeout: 25_000 }),
      retryLocator.waitFor({ state: "visible", timeout: 25_000 }),
    ]).catch(() => {});

    const dashboardBefore = (await page.getByRole("heading", { name: "דשבורד הורים" }).count()) > 0;
    const policyRoot = (await policyRootLocator.count()) > 0;
    if (dashboardBefore || !policyRoot) {
      const bodyText = await page.locator("body").innerText();
      fail(`${email}: expected policy gate, dashboardBefore=${dashboardBefore} policyRoot=${policyRoot} snippet=${bodyText.slice(0, 200)}`);
    }
    result.steps.push("gate_blocks_dashboard");

    await assertPageOnlyScroll(page);
    result.steps.push("page_only_scroll");

    await page.getByRole("button", { name: "אינני מסכים/ה" }).click();
    await page.getByText("לא ניתן להמשיך ללא אישור").waitFor({ state: "visible", timeout: 10_000 });
    result.steps.push("decline_blocks");

    await page.getByRole("button", { name: "קראו שוב את המדיניות" }).click();
    await page.locator("[data-policy-acceptance-root]").waitFor({ state: "visible" });

    await scrollPageToBottom(page);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "אני מסכים/ה וממשיך/ה" }).click();
    await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ state: "visible", timeout: 30_000 });
    result.steps.push("accept_unlocks_dashboard");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ state: "visible", timeout: 20_000 });
    result.steps.push("refresh_stays_unlocked");
  } finally {
    await browser.close();
  }
  return result;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceRole = getPolicyAcceptanceServiceRole();

  ok(`active versions TERMS=${TERMS_VERSION} PRIVACY=${PRIVACY_VERSION}`);

  const report = {
    phase: "D.2H",
    oldVersion: "2026-05-23",
    newVersion: TERMS_VERSION,
    generatedAt: new Date().toISOString(),
    parents: {},
    browser: {},
  };

  for (const email of TARGET_EMAILS) {
    const userId = await findUserIdByEmail(admin, email);
    if (!userId) {
      report.parents[email] = { found: false };
      console.warn(`WARN: user not found: ${email}`);
      continue;
    }

    const rowsBeforeAccept = await fetchAcceptanceRows(admin, userId);
    const status = await resolveParentPolicyAcceptanceStatus(serviceRole, userId);

    report.parents[email] = {
      found: true,
      parentUserId: userId,
      rowsBeforeAccept,
      statusApi: status,
    };

    if (status.accepted) {
      ok(`${email} — already accepted current version ${TERMS_VERSION} (gate would not show)`);
    } else {
      ok(`${email} — status accepted=false (must re-accept ${TERMS_VERSION}/${PRIVACY_VERSION})`);
    }

    if (email === "admin@admin.com" && !status.accepted) {
      const password = String(process.env.E2E_PARENT_PASSWORD || "").trim();
      if (!password) fail("Missing E2E_PARENT_PASSWORD for admin browser test");
      report.browser.admin = await browserGateFlow(email, password);
      ok("admin@admin.com — full browser gate/decline/accept flow PASS");

      const rowsAfter = await fetchAcceptanceRows(admin, userId);
      report.parents[email].rowsAfterAccept = rowsAfter;
      assertAppendOnly(rowsBeforeAccept, rowsAfter, email);
      report.parents[email].rowCountBefore = rowsBeforeAccept.length;
      report.parents[email].rowCountAfter = rowsAfter.length;
    }
  }

  // Full browser proof with synthetic parent that only has the OLD global version row.
  const oldVersion = report.oldVersion;
  const ephemeralPassword = crypto.randomBytes(24).toString("base64url");
  const ephemeralEmail = `policy-d2h-${Date.now().toString(36)}@example.com`;
  const created = await admin.auth.admin.createUser({
    email: ephemeralEmail,
    password: ephemeralPassword,
    email_confirm: true,
  });
  if (created.error || !created.data.user?.id) fail(`ephemeral createUser failed: ${created.error?.message}`);
  const ephemeralUserId = created.data.user.id;

  const { error: insertErr } = await admin.from("parent_policy_acceptances").insert({
    parent_user_id: ephemeralUserId,
    terms_version: oldVersion,
    privacy_version: oldVersion,
    source: "parent_dashboard",
    locale: "he",
  });
  if (insertErr) fail(`ephemeral baseline insert failed: ${insertErr.message}`);

  const ephemeralStatus = await resolveParentPolicyAcceptanceStatus(serviceRole, ephemeralUserId);
  if (ephemeralStatus.accepted !== false) {
    fail(`ephemeral parent with only ${oldVersion} row should have accepted=false`);
  }

  report.browser.syntheticOldVersionParent = await browserGateFlow(ephemeralEmail, ephemeralPassword);
  ok(`synthetic parent (old ${oldVersion} only) — full browser re-acceptance PASS`);

  const ephemeralRowsAfter = await fetchAcceptanceRows(admin, ephemeralUserId);
  report.browser.syntheticOldVersionParent.rowsAfter = ephemeralRowsAfter;
  assertAppendOnly(
    [{ id: "baseline", terms_version: oldVersion }],
    ephemeralRowsAfter,
    "synthetic"
  );

  await admin.from("parent_policy_acceptances").delete().eq("parent_user_id", ephemeralUserId);
  await admin.auth.admin.deleteUser(ephemeralUserId);

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  ok(`report written: ${REPORT_PATH}`);
  console.log("\nPASS: Phase D.2H global version bump validation");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
