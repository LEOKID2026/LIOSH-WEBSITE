#!/usr/bin/env node
/**
 * Preflight — Video #3 desktop (add child + student credentials).
 * Uses isolated capture parent — must NOT touch ישראל ישראלי or E2E_PARENT_EMAIL.
 */
import { chromium } from "playwright";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import { getParentAccessToken, ensureParentPolicyAccepted } from "../help-center/parent-capture-session.mjs";
import {
  resolveIsolatedCaptureParent,
  cleanupIsolatedCaptureParent,
  requireServiceRoleAdmin,
} from "./lib/isolated-capture-parent.mjs";
import {
  DISPOSABLE_CHILD_NAME,
  DISPOSABLE_CHILD_GRADE,
  VIEWPORT,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
  TITLE,
  PILOT_ID,
} from "./shared-add-students-desktop.mjs";
import { fail, pass, writePreflightReport } from "./lib/preflight-kit.mjs";

const DEMO_CHILD = "ישראל ישראלי";
const PROBE_CHILD = "preflight-probe-child";

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const checks = [];
  const blockers = [];
  let parentCtx = null;
  let probeStudentId = null;

  const e2eEmail = String(process.env.E2E_PARENT_EMAIL || process.env.HELP_CAPTURE_PARENT_EMAIL || "").trim();

  try {
    parentCtx = await resolveIsolatedCaptureParent();
    if (e2eEmail && parentCtx.email === e2eEmail) {
      fail(checks, "not_shared_qa_parent", "isolated parent must not be E2E_PARENT_EMAIL");
      blockers.push("isolated parent equals shared QA parent");
    } else {
      pass(checks, "not_shared_qa_parent", parentCtx.email);
    }
  } catch (e) {
    fail(checks, "isolated_parent_ready", e.message);
    blockers.push(e.message);
    writePreflightReport(outDir, preflightPath, { ok: false, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
    process.exit(1);
  }

  let token;
  try {
    token = await getParentAccessToken({ email: parentCtx.email, password: parentCtx.password });
    await ensureParentPolicyAccepted(baseUrl, token, () => {});
    pass(checks, "isolated_parent_login");
  } catch (e) {
    fail(checks, "isolated_parent_login", e.message);
    blockers.push(`isolated login: ${e.message}`);
    await cleanupIsolatedCaptureParent(parentCtx);
    writePreflightReport(outDir, preflightPath, { ok: false, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
    process.exit(1);
  }

  const listRes = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json().catch(() => ({}));
  if (!listRes.ok || !listJson?.ok) {
    fail(checks, "list_students", listJson?.error || String(listRes.status));
    blockers.push("list-students failed");
  } else {
    pass(checks, "list_students");
    const demoOnAccount = (listJson.students || []).find((s) => s?.full_name === DEMO_CHILD);
    if (demoOnAccount) {
      fail(checks, "no_demo_child_on_isolated", `found ${DEMO_CHILD} on isolated account`);
      blockers.push("isolated account must not include demo child");
    } else {
      pass(checks, "no_demo_child_on_isolated");
    }
  }

  const createRes = await fetch(new URL("/api/parent/create-student", baseUrl).toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: PROBE_CHILD, gradeLevel: DISPOSABLE_CHILD_GRADE }),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createJson?.student?.id) {
    fail(checks, "create_student_api", createJson?.error || String(createRes.status));
    blockers.push("create-student API failed");
  } else {
    probeStudentId = createJson.student.id;
    parentCtx.createdStudentIds = [...(parentCtx.createdStudentIds || []), probeStudentId];
    pass(checks, "create_student_api", probeStudentId);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();

  try {
    await authenticateParent({
      context,
      page,
      account: { email: parentCtx.email, password: parentCtx.password },
      baseUrl,
      mode: "ui",
      log: () => {},
    });
    pass(checks, "parent_ui_login");

    await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector('h2:has-text("הוספת ילד")', { timeout: 30_000 });
    pass(checks, "add_child_form_visible");

    const nameInput = page.getByPlaceholder("שם הילד");
    const gradeSelect = page.locator('form:has(h2:has-text("הוספת ילד")) select').first();
    if ((await nameInput.count()) === 0 || (await gradeSelect.count()) === 0) {
      fail(checks, "add_child_form_controls", "name/grade controls missing");
      blockers.push("add-child form controls missing");
    } else {
      pass(checks, "add_child_form_controls");
    }

    if (probeStudentId) {
      const probeCard = page.locator("div.rounded.border").filter({ hasText: PROBE_CHILD }).first();
      await probeCard.scrollIntoViewIfNeeded({ timeout: 20_000 }).catch(() => null);
      if ((await probeCard.count()) === 0) {
        fail(checks, "probe_child_on_dashboard", "probe child not visible");
        blockers.push("probe child not on dashboard");
      } else {
        pass(checks, "probe_child_on_dashboard");
      }
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
  }

  if (probeStudentId) {
    try {
      const admin = parentCtx.admin || requireServiceRoleAdmin();
      await admin.from("students").delete().eq("id", probeStudentId);
      parentCtx.createdStudentIds = (parentCtx.createdStudentIds || []).filter((id) => id !== probeStudentId);
      pass(checks, "probe_child_cleaned");
    } catch (e) {
      fail(checks, "probe_child_cleaned", e.message);
    }
  }

  await cleanupIsolatedCaptureParent(parentCtx);

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writePreflightReport(outDir, preflightPath, { ok, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
  console.log(JSON.stringify({ ok, blockers, checks }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("BLOCKER:", e.message);
  process.exit(1);
});
