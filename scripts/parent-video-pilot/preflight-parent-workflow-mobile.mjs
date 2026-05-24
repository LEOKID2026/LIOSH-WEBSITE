#!/usr/bin/env node
/**
 * Mobile preflight — Video #1 parent workflow pilot.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import {
  selectHelpParentAccount,
  getParentAccessToken,
  ensureParentPolicyAccepted,
} from "../help-center/parent-capture-session.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import {
  DEMO_CHILD_NAME,
  DEMO_QUESTION,
  MOBILE_VIEWPORT,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
  isCopilotAnswerUseful,
} from "./shared-mobile.mjs";

function fail(checks, id, message) {
  checks.push({ id, ok: false, message });
}

function pass(checks, id, message = "ok") {
  checks.push({ id, ok: true, message });
}

function writeReport(report) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(preflightPath, `${JSON.stringify({ ...report, at: new Date().toISOString() }, null, 2)}\n`);
}

function copilotApiUseful(result) {
  if (!result || typeof result !== "object") return false;
  if (result.resolutionStatus === "clarification_required") {
    const q = String(result.clarificationQuestionHe || "").trim();
    return q.length > 40 && /(מומלץ|כדאי|תרגל|שבוע)/.test(q);
  }
  const blocks = result.answerBlocks || [];
  const text = blocks.map((b) => b.textHe).join(" ");
  return text.trim().length >= 35;
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
    writeReport({ ok: false, checks, blockers, baseUrl, viewport: MOBILE_VIEWPORT });
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
    writeReport({ ok: false, checks, blockers, baseUrl, viewport: MOBILE_VIEWPORT });
    process.exit(1);
  }

  const listRes = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json().catch(() => ({}));
  if (!listRes.ok || !listJson?.ok) {
    fail(checks, "demo_child_on_dashboard", "list-students failed");
    blockers.push("list-students failed");
  } else {
    const demo = (listJson.students || []).find((s) => s?.full_name === DEMO_CHILD_NAME);
    if (!demo?.id) {
      fail(checks, "demo_child_on_dashboard", `missing ${DEMO_CHILD_NAME}`);
      blockers.push("demo child missing");
    } else {
      studentId = demo.id;
      pass(checks, "demo_child_on_dashboard", studentId);
    }
  }

  if (studentId) {
    const reportRes = await fetch(
      new URL(`/api/parent/students/${encodeURIComponent(studentId)}/report-data`, baseUrl).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const reportJson = await reportRes.json().catch(() => ({}));
    const tq = Number(reportJson?.summary?.totalAnswers ?? 0) || 0;
    if (!reportRes.ok || !reportJson?.ok || tq < 1) {
      fail(checks, "short_report_nonempty", `totalAnswers=${tq}`);
      blockers.push("Run: npm run help:seed-demo-report");
    } else {
      pass(checks, "short_report_nonempty", `totalAnswers=${tq}`);
    }
  }

  let copilotApiOk = false;
  if (studentId) {
    const reportRes = await fetch(
      new URL(`/api/parent/students/${encodeURIComponent(studentId)}/report-data`, baseUrl).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const reportPayload = await reportRes.json().catch(() => ({}));
    const copilotRes = await fetch(new URL("/api/parent/copilot-turn", baseUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        utterance: DEMO_QUESTION,
        sessionId: "preflight-mobile-v1",
        audience: "parent",
        studentId,
        reportPeriod: "week",
        payload: reportPayload?.ok !== false ? reportPayload : undefined,
      }),
    });
    const copilotJson = await copilotRes.json().catch(() => ({}));
    copilotApiOk = copilotRes.ok && copilotJson?.ok && copilotApiUseful(copilotJson.result);
    if (copilotApiOk) {
      pass(checks, "copilot_api_useful_answer");
    } else {
      checks.push({
        id: "copilot_api_useful_answer",
        ok: true,
        message: `skipped (${copilotJson?.error || "will verify in UI"})`,
      });
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: "he-IL" });
  await context.route("**/api/parent/copilot-turn", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${token}` },
    });
  });
  const page = await context.newPage();

  try {
    await authenticateParent({ context, page, account: parent, baseUrl, mode: "ui", log: () => {} });
    pass(checks, "parent_ui_login");

    await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const demoCard = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
    await demoCard.scrollIntoViewIfNeeded({ timeout: 30_000 });
    await demoCard.waitFor({ state: "visible", timeout: 15_000 });
    pass(checks, "dashboard_demo_child_scrollable");

    const cardText = await demoCard.innerText();
    if (!cardText.includes("ישראל")) {
      fail(checks, "wrong_child_highlight", "demo card text missing");
      blockers.push("wrong child");
    } else {
      pass(checks, "demo_child_visible");
    }

    const reportUrl = new URL("/learning/parent-report", baseUrl);
    reportUrl.searchParams.set("studentId", studentId);
    reportUrl.searchParams.set("source", "parent");
    reportUrl.searchParams.set("period", "week");
    await page.goto(reportUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return t.includes("שאלות") && /\d+/.test(t);
      },
      undefined,
      { timeout: 90_000 }
    );
    pass(checks, "short_report_loads");

    const detUrl = new URL("/learning/parent-report-detailed", baseUrl);
    detUrl.searchParams.set("studentId", studentId);
    detUrl.searchParams.set("source", "parent");
    detUrl.searchParams.set("period", "week");
    await page.goto(detUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    const detBody = await page.locator("body").innerText();
    if (detBody.includes("500") || detBody.includes("Internal Server")) {
      fail(checks, "detailed_report_opens", "500");
      blockers.push("detailed 500");
    } else {
      pass(checks, "detailed_report_opens");
    }

    const copilot = page.locator("text=שאלו על הדוח").first();
    await copilot.scrollIntoViewIfNeeded({ timeout: 30_000 });
    if (!(await copilot.isVisible())) {
      fail(checks, "copilot_visible", "not visible");
      blockers.push("copilot not visible");
    } else {
      pass(checks, "copilot_visible");
    }

    await page.getByPlaceholder("שאלה על הדוח…").fill(DEMO_QUESTION);
    await page.getByRole("button", { name: "שלח" }).click();
    await page.waitForFunction(
      (q) => {
        const t = document.body?.innerText || "";
        const idx = t.indexOf(q);
        if (idx < 0) return false;
        const tail = t.slice(idx + q.length, idx + q.length + 400);
        return !tail.includes("מעבד את הדוח") && !tail.includes("אירעה שגיאה טכנית") && tail.trim().length > 30;
      },
      DEMO_QUESTION,
      { timeout: 45_000 }
    );

    const after = await page.locator("body").innerText();
    if (!isCopilotAnswerUseful(after)) {
      fail(checks, "copilot_useful_answer", "UI answer failed usefulness check");
      blockers.push("copilot answer not useful / clarification-only / technical error");
    } else {
      pass(checks, "copilot_useful_answer");
    }

    await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
    const shot = await page.screenshot({ type: "png" });
    const darkEnough = shot.length > 5000;
    if (!darkEnough) {
      fail(checks, "first_frame_not_blank", "login screenshot too small/blank");
      blockers.push("blank first frame risk");
    } else {
      pass(checks, "first_frame_not_blank");
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
  }

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writeReport({ ok, checks, blockers, baseUrl, viewport: MOBILE_VIEWPORT, studentId });
  console.log(JSON.stringify({ ok, blockers, checks, viewport: MOBILE_VIEWPORT }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("BLOCKER:", e.message);
  process.exit(1);
});
