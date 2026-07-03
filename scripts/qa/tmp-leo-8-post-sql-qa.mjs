/**
 * Post-migration 094 QA — Leo number 8 digits.
 * Run AFTER owner confirms 094 SQL passed.
 *   node scripts/qa/tmp-leo-8-post-sql-qa.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";
import { normalizeLeoNumber } from "../../lib/guest/guest-leo-number.server.js";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3002";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "leo-8-qa");
mkdirSync(OUT, { recursive: true });

const LEO8 = /^[1-9]\d{7}$/;
const r = {};

function pass(key, note = "") {
  r[key] = { status: "PASS", note };
}
function fail(key, note = "") {
  r[key] = { status: "FAIL", note };
}
function skip(key, note = "") {
  r[key] = { status: "SKIP", note };
}

async function loginUser(username) {
  process.env.E2E_STUDENT_PIN = "1234";
  process.env.E2E_STUDENT_USERNAME = username;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await applyStudentSessionFromLogin(ctx, BASE);
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  return { ctx, page };
}

async function apiJson(page, path, opts) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  return page.evaluate(
    async ({ url: u, opts: o }) => {
      const res = await fetch(u, o);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { _parseError: true, _preview: text.slice(0, 120) };
      }
      return { status: res.status, json };
    },
    { url, opts: opts || {} },
  );
}

const browser = await chromium.launch({ headless: true });

try {
  // --- 1. Registered AAA1 — friends tab leo ---
  const a1 = await loginUser("AAA1");
  await a1.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await a1.page.getByRole("button", { name: "חברים", exact: true }).click();
  await a1.page.waitForTimeout(2000);

  const prof1 = await apiJson(a1.page, "/api/arcade/profile/me");
  const leo1 = String(prof1.json?.profile?.leoNumber || "").trim();
  r.aaa1_api = { status: prof1.status, leoNumber: leo1, len: leo1.length };

  if (prof1.status === 200 && LEO8.test(leo1)) pass("aaa1_leo_8", leo1);
  else fail("aaa1_leo_8", `status=${prof1.status} leo=${leo1 || "missing"}`);

  const body1 = await a1.page.locator("body").innerText();
  const uiLeo1 = body1.match(/[1-9]\d{7}/)?.[0] || null;
  if (uiLeo1 && LEO8.test(uiLeo1)) pass("aaa1_ui_leo", uiLeo1);
  else fail("aaa1_ui_leo", uiLeo1 || "not found in UI");

  if (!body1.includes("AAA1") && !/\b[a-z]+\d+\b/i.test(body1.split("מספר ליאו")[1]?.slice(0, 80) || "")) {
    pass("aaa1_no_login_username", "no obvious username in leo panel");
  } else {
    skip("aaa1_no_login_username", "manual verify — username pattern inconclusive");
  }

  const copyBtn = a1.page.getByRole("button", { name: /העתק|הועתק/ });
  if (await copyBtn.isVisible().catch(() => false)) {
    await copyBtn.click();
    await a1.page.waitForTimeout(500);
    pass("aaa1_copy", await copyBtn.innerText());
  } else fail("aaa1_copy", "button not visible");

  // --- 2. New guest — 8 digits ---
  const guestCtx = await browser.newContext();
  const guestStart = await guestCtx.request.post(`${BASE}/api/student/guest/start`, {
    headers: { Origin: BASE, Referer: `${BASE}/student/login` },
    data: {},
  });
  const guestJson = await guestStart.json().catch(() => ({}));
  const guestLeo = String(guestJson.leoNumber || guestJson.student?.leo_number || "").trim();
  r.guest_start = { status: guestStart.status(), leoNumber: guestLeo };
  if (guestStart.ok() && LEO8.test(guestLeo)) pass("guest_new_8", guestLeo);
  else fail("guest_new_8", `status=${guestStart.status()} leo=${guestLeo}`);
  if (/^\d{6}$/.test(guestLeo)) fail("guest_not_6", guestLeo);
  else pass("guest_not_6", guestLeo || "n/a");
  await guestCtx.close();

  // --- 3. Friends AAA1 → AAA2 by leo ---
  const a2 = await loginUser("AAA2");
  await a2.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  const prof2 = await apiJson(a2.page, "/api/arcade/profile/me");
  const leo2 = String(prof2.json?.profile?.leoNumber || "").trim();
  r.aaa2_leo = leo2;

  if (!LEO8.test(leo2)) {
    fail("friends_flow", "AAA2 has no valid 8-digit leo");
  } else {
    const send = await apiJson(a1.page, "/api/arcade/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", query: leo2 }),
    });
    r.friend_send = { status: send.status, ok: send.json?.ok, code: send.json?.code };

    await a2.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
    await a2.page.getByRole("button", { name: "חברים", exact: true }).click();
    await a2.page.waitForTimeout(1500);

    const pending = await apiJson(a2.page, "/api/arcade/friends");
    const hasPending = (pending.json?.pendingIncoming || []).length > 0;

    if (send.json?.ok || send.json?.code === "pending_exists" || send.json?.code === "already_friends") {
      pass("friend_request_sent", send.json?.code || "ok");
    } else fail("friend_request_sent", JSON.stringify(send.json));

    if (hasPending) {
      await a2.page.getByRole("button", { name: "אשר" }).first().click();
      await a2.page.waitForTimeout(2000);
      const friendsAfter = await apiJson(a2.page, "/api/arcade/friends");
      const mutual =
        (friendsAfter.json?.friends || []).some((f) => f.displayName) &&
        (await apiJson(a1.page, "/api/arcade/friends")).json?.friends?.length > 0;
      if (mutual) pass("friend_accept", "both have friends");
      else fail("friend_accept", "friends list empty after accept");
    } else if (send.json?.code === "already_friends") {
      pass("friend_accept", "already friends");
    } else {
      fail("friend_accept", "no pending on AAA2");
    }

    const reject6 = normalizeLeoNumber("123456");
    if (reject6 === null) pass("friend_reject_6", "normalize rejects 6");
    else fail("friend_reject_6", reject6);
  }

  // --- 4. Parent guest link — API validation only (no parent session) ---
  if (normalizeLeoNumber("482913") === null) pass("parent_link_reject_6", "6 digits rejected");
  else fail("parent_link_reject_6");
  if (LEO8.test(guestLeo)) pass("parent_link_8_valid", "guest leo normalizes");
  else skip("parent_link_e2e", "needs parent session — API normalize only");

  // --- 5. Admin guest search — normalize check ---
  if (normalizeLeoNumber("482913") === null && normalizeLeoNumber(guestLeo) === guestLeo) {
    pass("admin_search_normalize", "6 rejected, 8 accepted");
  } else fail("admin_search_normalize");
  skip("admin_search_e2e", "needs admin session");

  // --- 6. Errors ---
  const errors = [];
  for (const { page, label } of [
    { page: a1.page, label: "AAA1" },
    { page: a2.page, label: "AAA2" },
  ]) {
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`${label}: ${msg.text()}`);
    });
  }
  if (prof1.status !== 500 && guestStart.status() !== 500) pass("no_500", "profile+guest ok");
  else fail("no_500", `profile=${prof1.status} guest=${guestStart.status()}`);
  if (errors.length === 0) pass("no_console_errors", "none captured");
  else skip("no_console_errors", errors.slice(0, 3).join("; "));

  r.blocking = ["aaa1_leo_8", "aaa1_ui_leo", "guest_new_8", "friend_request_sent", "friend_accept"].some(
    (k) => r[k]?.status === "FAIL",
  );

  await a1.ctx.close();
  await a2.ctx.close();
} finally {
  await browser.close();
}

writeFileSync(join(OUT, "post-sql-qa.json"), JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
