#!/usr/bin/env node
/**
 * Preflight — Video #6 desktop (Copilot follow-up questions).
 */
import { chromium } from "playwright";
import {
  selectHelpParentAccount,
  getParentAccessToken,
  ensureParentPolicyAccepted,
} from "../help-center/parent-capture-session.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import {
  DEMO_CHILD_NAME,
  COPILOT_Q1,
  COPILOT_Q2,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
  TITLE,
  PILOT_ID,
  isCopilotTurnFailure,
} from "./shared-parent-copilot-desktop.mjs";
import { fail, pass, writePreflightReport } from "./lib/preflight-kit.mjs";

const MIN_QUESTIONS = 1;

async function askCopilot(page, question) {
  const field = page.getByPlaceholder("שאלה על הדוח…");
  await field.waitFor({ state: "visible", timeout: 15_000 });
  await field.fill("");
  await field.fill(question);
  await page.getByRole("button", { name: "שלח" }).click();
  await page
    .waitForFunction(
      (q) => {
        const t = document.body?.innerText || "";
        const idx = t.indexOf(q);
        if (idx < 0) return false;
        const tail = t.slice(idx + q.length, idx + q.length + 500);
        return !tail.includes("מעבד את הדוח") && tail.trim().length > 20;
      },
      question,
      { timeout: 45_000 }
    )
    .catch(() => null);
  return page.locator("body").innerText();
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const checks = [];
  const blockers = [];
  let studentId = null;

  try {
    selectHelpParentAccount();
    pass(checks, "parent_account_configured");
  } catch (e) {
    fail(checks, "parent_account_configured", e.message);
    blockers.push(e.message);
    writePreflightReport(outDir, preflightPath, { ok: false, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
    process.exit(1);
  }

  const parent = selectHelpParentAccount();
  let token;
  try {
    token = await getParentAccessToken(parent);
    await ensureParentPolicyAccepted(baseUrl, token, () => {});
    pass(checks, "parent_qa_login");
  } catch (e) {
    fail(checks, "parent_qa_login", e.message);
    blockers.push(`parent QA login: ${e.message}`);
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
    const demo = (listJson.students || []).find((s) => s?.full_name === DEMO_CHILD_NAME);
    if (!demo?.id) {
      fail(checks, "demo_child_on_dashboard", `child "${DEMO_CHILD_NAME}" not found`);
      blockers.push("demo child missing — run help:seed-demo-report");
    } else {
      studentId = demo.id;
      pass(checks, "demo_child_on_dashboard", studentId);
    }
  }

  if (studentId) {
    const reportRes = await fetch(
      `${new URL(`/api/parent/students/${encodeURIComponent(studentId)}/report-data`, baseUrl).toString()}?period=week`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const reportJson = await reportRes.json().catch(() => ({}));
    const tq = Number(reportJson?.summary?.totalAnswers ?? 0) || 0;
    if (tq < MIN_QUESTIONS) {
      fail(checks, "report_data_nonempty", `totalQuestions=${tq}`);
      blockers.push("Run: npm run help:seed-demo-report");
    } else {
      pass(checks, "report_data_nonempty", `totalQuestions=${tq}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.route("**/api/parent/copilot-turn", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${token}` },
    });
  });
  const page = await context.newPage();

  try {
    await authenticateParent({ context, page, account: parent, baseUrl, mode: "ui", log: () => {} });
    pass(checks, "parent_ui_login");

    const detUrl = new URL(`${baseUrl}/learning/parent-report-detailed`);
    detUrl.searchParams.set("studentId", studentId);
    detUrl.searchParams.set("period", "week");
    detUrl.searchParams.set("source", "parent");
    await page.goto(detUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return t.includes("שאלו על הדוח") && !t.includes("טוען דוח מקיף");
      },
      undefined,
      { timeout: 90_000 }
    );
    pass(checks, "detailed_report_opens");

    await page.locator("text=שאלו על הדוח").first().scrollIntoViewIfNeeded({ timeout: 30_000 });
    pass(checks, "copilot_visible");

    const afterQ1 = await askCopilot(page, COPILOT_Q1);
    if (isCopilotTurnFailure(afterQ1, COPILOT_Q1)) {
      fail(checks, "copilot_q1_useful", "Q1 weak/error/rate-limit");
      blockers.push("copilot Q1 failed");
    } else {
      pass(checks, "copilot_q1_useful");
    }

    const afterQ2 = await askCopilot(page, COPILOT_Q2);
    if (isCopilotTurnFailure(afterQ2, COPILOT_Q2)) {
      fail(checks, "copilot_q2_useful", "Q2 weak/error/rate-limit");
      blockers.push("copilot Q2 failed");
    } else {
      pass(checks, "copilot_q2_useful");
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
  }

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writePreflightReport(outDir, preflightPath, { ok, checks, blockers, baseUrl, studentId, title: TITLE, pilot: PILOT_ID });
  console.log(JSON.stringify({ ok, blockers, checks }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("BLOCKER:", e.message);
  process.exit(1);
});
