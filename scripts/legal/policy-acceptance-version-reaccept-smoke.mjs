#!/usr/bin/env node
/**
 * Phase D.2G — version bump re-acceptance proof.
 *
 * Proves append-only re-acceptance when TERMS_VERSION changes:
 * - old rows preserved
 * - new row inserted on accept
 * - dashboard gate re-appears automatically
 *
 * Usage (from repo root, after env is available):
 *   node --env-file=.env.local scripts/legal/policy-acceptance-version-reaccept-smoke.mjs --base http://localhost:3002
 *
 * The script temporarily bumps TERMS_VERSION, rebuilds, restarts port 3002,
 * runs browser proof, then reverts the version constant and rebuilds again.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SITE_POLICIES_PATH = path.join(ROOT, "data/legal/sitePolicies.he.js");
const PORT = 3002;

const baseUrl = (() => {
  const idx = process.argv.indexOf("--base");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].replace(/\/$/, "");
  return `http://localhost:${PORT}`;
})();

const TEST_TERMS_SUFFIX = "-d2g-test";

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

function readSitePoliciesSource() {
  return fs.readFileSync(SITE_POLICIES_PATH, "utf8");
}

function readTermsVersionFromSource(source) {
  const match = source.match(/export const TERMS_VERSION = (.+);/);
  if (!match) fail("Could not parse TERMS_VERSION from sitePolicies.he.js");
  const raw = match[1].trim();
  if (raw.startsWith('"') || raw.startsWith("'")) {
    return raw.slice(1, -1);
  }
  if (raw === "POLICY_LAST_UPDATED") {
    const dateMatch = source.match(/export const POLICY_LAST_UPDATED = "([^"]+)"/);
    if (!dateMatch) fail("Could not parse POLICY_LAST_UPDATED");
    return dateMatch[1];
  }
  fail(`Unexpected TERMS_VERSION expression: ${raw}`);
}

function writeTermsVersionBump(source, bumpedVersion) {
  const next = source.replace(
    /export const TERMS_VERSION = .+;/,
    `export const TERMS_VERSION = "${bumpedVersion}";`
  );
  if (next === source) fail("Failed to patch TERMS_VERSION in sitePolicies.he.js");
  fs.writeFileSync(SITE_POLICIES_PATH, next, "utf8");
}

function restoreTermsVersion(source, originalLine) {
  const current = readSitePoliciesSource();
  const next = current.replace(/export const TERMS_VERSION = .+;/, originalLine);
  fs.writeFileSync(SITE_POLICIES_PATH, next, "utf8");
}

function killPortNode(port) {
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "$p=${port}; Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" }
      );
    } catch (_e) {
      /* port may already be free */
    }
    return;
  }
  try {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
  } catch (_e) {
    /* ignore */
  }
}

function buildProject() {
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
}

let serverProc = null;

function startProductionServer() {
  killPortNode(PORT);
  serverProc = spawn("npx next start -p " + PORT, [], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
    windowsHide: true,
  });
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${url}/api/parent/policy-acceptance/status`);
      if (res.status === 401) return true;
    } catch (_e) {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function ensureProductionServer() {
  if (await waitForServer(baseUrl, 8)) return;
  ok("bootstrapping production server on port 3002");
  if (fs.existsSync(path.join(ROOT, ".next"))) {
    fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
  }
  buildProject();
  startProductionServer();
  if (!(await waitForServer(baseUrl, 90))) {
    fail(`Server did not become ready at ${baseUrl}`);
  }
}

async function createEphemeralParent(admin) {
  const password = crypto.randomBytes(24).toString("base64url");
  const runId = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `policy-version-${runId}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "policy-version-reaccept-smoke" },
  });
  if (created.error || !created.data.user?.id) {
    fail(`createUser failed: ${created.error?.message || "unknown"}`);
  }
  return { email, password, userId: created.data.user.id };
}

async function signIn(email, password, supabaseUrl, anonKey) {
  const anon = createClient(supabaseUrl, anonKey);
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) fail(`signIn failed: ${error?.message || "no session"}`);
  return data.session.access_token;
}

async function fetchStatusAccepted(accessToken) {
  const res = await fetch(`${baseUrl}/api/parent/policy-acceptance/status`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) fail(`status API returned non-JSON (${res.status})`);
  const payload = await res.json();
  return { ok: res.ok, payload };
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
    if (!root) return { ok: false, reason: "missing data-policy-acceptance-root" };
    const offenders = [];
    const nodes = [root, ...root.querySelectorAll("*")];
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      const ox = style.overflowX;
      const oy = style.overflowY;
      if (ox === "hidden" || ox === "clip") {
        offenders.push({ kind: "overflow-x-trap", className: String(el.className || "").slice(0, 80), ox, oy });
      }
      if (oy === "auto" || oy === "scroll") {
        offenders.push({ kind: "overflow-y-scrollbox", className: String(el.className || "").slice(0, 80), ox, oy });
      }
    }
    return {
      ok: offenders.length === 0,
      mode: root.getAttribute("data-policy-scroll-mode"),
      offenders: offenders.slice(0, 8),
    };
  });
  if (!audit.ok) fail(`scroll audit failed: ${JSON.stringify(audit)}`);
  if (audit.mode !== "page-only") fail(`expected page-only scroll mode, got ${audit.mode}`);
  return audit;
}

async function cleanupParent(admin, userId) {
  if (!userId) return;
  await admin.from("parent_policy_acceptances").delete().eq("parent_user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const originalSource = readSitePoliciesSource();
  const originalTermsLine = originalSource.match(/export const TERMS_VERSION = .+;/)[0];
  const baselineTermsVersion = readTermsVersionFromSource(originalSource);
  const bumpedTermsVersion = `${baselineTermsVersion}${TEST_TERMS_SUFFIX}`;

  let ephemeral = null;
  let reverted = false;

  const revertVersion = () => {
    if (reverted) return;
    restoreTermsVersion(originalSource, originalTermsLine);
    reverted = true;
    ok(`reverted TERMS_VERSION to baseline (${baselineTermsVersion})`);
  };

  process.on("SIGINT", () => {
    revertVersion();
    process.exit(1);
  });

  let succeeded = false;

  try {
    ephemeral = await createEphemeralParent(admin);
    const { email, password, userId } = ephemeral;

    const { error: insertErr } = await admin.from("parent_policy_acceptances").insert({
      parent_user_id: userId,
      terms_version: baselineTermsVersion,
      privacy_version: baselineTermsVersion,
      source: "parent_dashboard",
      locale: "he",
    });
    if (insertErr) fail(`baseline acceptance insert failed: ${insertErr.message}`);

    await ensureProductionServer();

    {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ locale: "he-IL" });
      try {
        await page.route("**/api/parent/policy-acceptance/status", (route) =>
          route.fulfill({
            status: 404,
            contentType: "text/html",
            body: "<!DOCTYPE html><html><body>Not Found</body></html>",
          })
        );
        await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
        await page.getByPlaceholder("אימייל הורה").fill(email);
        await page.getByPlaceholder("סיסמה").fill(password);
        await page.locator("form").getByRole("button", { name: "כניסה" }).click();
        await page.waitForURL("**/parent/dashboard**", { timeout: 30_000 });
        await page.waitForTimeout(1000);
        const dashboardVisible = (await page.getByRole("heading", { name: "דשבורד הורים" }).count()) > 0;
        const retryVisible = (await page.getByRole("button", { name: "נסו שוב" }).count()) > 0;
        const heMsg = (await page.getByText("לא ניתן לבדוק כרגע את אישור תנאי השימוש ומדיניות הפרטיות").count()) > 0;
        if (dashboardVisible || !retryVisible || !heMsg) {
          fail("fail-closed gate did not block dashboard on HTML 404 status response");
        }
        ok("fail-closed — Hebrew retry panel blocks dashboard on non-JSON status failure");
      } finally {
        await browser.close();
      }
    }

    const tokenBefore = await signIn(email, password, supabaseUrl, anonKey);
    const statusBefore = await fetchStatusAccepted(tokenBefore);
    if (!statusBefore.ok || !statusBefore.payload?.accepted) {
      fail(`expected accepted=true before bump, got ${JSON.stringify(statusBefore.payload)}`);
    }
    ok(`A — parent accepted on baseline TERMS_VERSION=${baselineTermsVersion}`);

    const { data: rowsBeforeBump, error: rowsBeforeErr } = await admin
      .from("parent_policy_acceptances")
      .select("id, terms_version, privacy_version")
      .eq("parent_user_id", userId)
      .order("accepted_at", { ascending: true });
    if (rowsBeforeErr) fail(rowsBeforeErr.message);
    if ((rowsBeforeBump || []).length !== 1) fail(`expected 1 row before bump, got ${rowsBeforeBump?.length}`);
    const oldRowId = rowsBeforeBump[0].id;

    writeTermsVersionBump(originalSource, bumpedTermsVersion);
    ok(`B — temporarily bumped TERMS_VERSION to ${bumpedTermsVersion}`);

    if (fs.existsSync(path.join(ROOT, ".next"))) {
      fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
    }
    buildProject();
    startProductionServer();
    if (!(await waitForServer(baseUrl, 90))) fail(`Server did not become ready after version bump at ${baseUrl}`);

    const tokenAfterBump = await signIn(email, password, supabaseUrl, anonKey);
    const statusAfterBump = await fetchStatusAccepted(tokenAfterBump);
    if (!statusAfterBump.ok || statusAfterBump.payload?.accepted !== false) {
      fail(`expected accepted=false after bump, got ${JSON.stringify(statusAfterBump.payload)}`);
    }
    ok("C — status API returns accepted=false after version bump");

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ locale: "he-IL", viewport: { width: 1280, height: 800 } });
    try {
      await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("אימייל הורה").fill(email);
      await page.getByPlaceholder("סיסמה").fill(password);
      await page.locator("form").getByRole("button", { name: "כניסה" }).click();
      await page.waitForURL("**/parent/dashboard**", { timeout: 30_000 });
      await page.waitForSelector("[data-policy-acceptance-root]", { timeout: 20_000 });

      const dashboardVisible = (await page.getByRole("heading", { name: "דשבורד הורים" }).count()) > 0;
      if (dashboardVisible) fail("dashboard visible after version bump — gate should block");
      ok("D — dashboard hidden; full policy panel auto-shown after version bump");

      await assertPageOnlyScroll(page);
      ok("E — page-only scroll audit PASS on fresh server");

      await scrollPageToBottom(page);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "אני מסכים/ה וממשיך/ה" }).click();
      await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ state: "visible", timeout: 30_000 });
      ok("F — accept on bumped version unlocks dashboard");

      await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ state: "visible", timeout: 20_000 });
      ok("G — refresh keeps dashboard unlocked after new acceptance");
    } finally {
      await browser.close();
    }

    const { data: rowsAfter, error: rowsAfterErr } = await admin
      .from("parent_policy_acceptances")
      .select("id, terms_version, privacy_version")
      .eq("parent_user_id", userId)
      .order("accepted_at", { ascending: true });
    if (rowsAfterErr) fail(rowsAfterErr.message);
    if ((rowsAfter || []).length !== 2) fail(`expected 2 rows after accept, got ${rowsAfter?.length}`);

    const oldStillThere = rowsAfter.some((r) => r.id === oldRowId && r.terms_version === baselineTermsVersion);
    const newRow = rowsAfter.find((r) => r.terms_version === bumpedTermsVersion);
    if (!oldStillThere) fail("old acceptance row was removed — append-only violated");
    if (!newRow) fail(`new row with bumped version ${bumpedTermsVersion} not found`);
    ok("H — old row preserved; new row inserted for bumped version");

    revertVersion();
    succeeded = true;

    if (fs.existsSync(path.join(ROOT, ".next"))) {
      fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
    }
    try {
      buildProject();
      startProductionServer();
      if (!(await waitForServer(baseUrl, 90))) {
        console.warn("WARN: post-revert rebuild server did not become ready — run scripts\\dev\\restart-local-3002.bat manually");
      }
    } catch (rebuildErr) {
      console.warn(`WARN: post-revert rebuild failed (${rebuildErr.message}) — TERMS_VERSION was reverted; run npm run build manually`);
    }

    console.log("\nPASS: Phase D.2G version re-acceptance proof");
    console.log(JSON.stringify({
      baselineTermsVersion,
      bumpedTermsVersion,
      rowCountAfter: rowsAfter.length,
      oldRowPreserved: oldStillThere,
      newRowVersion: newRow.terms_version,
    }, null, 2));
  } finally {
    if (!reverted) revertVersion();
    await cleanupParent(admin, ephemeral?.userId);
    if (!succeeded && serverProc && !serverProc.killed) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /PID ${serverProc.pid} /T /F`, { stdio: "ignore" });
        } else {
          process.kill(-serverProc.pid, "SIGTERM");
        }
      } catch (_e) {
        /* ignore */
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
