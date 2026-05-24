#!/usr/bin/env node
/**
 * Preflight for parent workflow video pilot — abort capture if any check fails.
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
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
} from "./shared.mjs";

const MIN_QUESTIONS = 1;

function fail(checks, id, message) {
  checks.push({ id, ok: false, message });
  return false;
}

function pass(checks, id, message = "ok") {
  checks.push({ id, ok: true, message });
  return true;
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const checks = [];
  let studentId = null;
  let blockers = [];

  try {
    const parent = selectHelpParentAccount();
    pass(checks, "parent_account_configured");
  } catch (e) {
    fail(checks, "parent_account_configured", e.message);
    blockers.push(e.message);
    writeReport({ ok: false, checks, blockers, baseUrl });
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
    writeReport({ ok: false, checks, blockers, baseUrl });
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
    const students = Array.isArray(listJson.students) ? listJson.students : [];
    const demo = students.find((s) => s?.full_name === DEMO_CHILD_NAME);
    if (!demo?.id) {
      fail(checks, "demo_child_on_dashboard", `child "${DEMO_CHILD_NAME}" not found (${students.length} students)`);
      blockers.push(`demo child missing: ${students.map((s) => s.full_name).join(", ")}`);
    } else {
      studentId = demo.id;
      pass(checks, "demo_child_on_dashboard", studentId);
      const others = students.filter((s) => s.id !== demo.id).map((s) => s.full_name);
      if (others.length) {
        checks.push({
          id: "other_children_warning",
          ok: true,
          message: `Other children on dashboard: ${others.join(", ")} — capture must crop/highlight demo card only`,
        });
      }
    }
  }

  if (studentId) {
    const qs = new URLSearchParams({ period: "week" });
    const reportRes = await fetch(
      new URL(`/api/parent/students/${encodeURIComponent(studentId)}/report-data`, baseUrl).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const reportJson = await reportRes.json().catch(() => ({}));
    if (!reportRes.ok || !reportJson?.ok) {
      fail(checks, "short_report_data", reportJson?.error || String(reportRes.status));
      blockers.push("report-data API failed");
    } else {
      const tq = Number(reportJson?.summary?.totalAnswers ?? 0) || 0;
      if (tq < MIN_QUESTIONS) {
        fail(checks, "short_report_nonempty", `totalQuestions=${tq} (need >= ${MIN_QUESTIONS})`);
        blockers.push("Run: npm run help:seed-demo-report");
      } else {
        pass(checks, "short_report_nonempty", `totalQuestions=${tq}`);
      }
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route("**/api/parent/copilot-turn", async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: `Bearer ${token}`,
    };
    await route.continue({ headers });
  });
  const page = await context.newPage();

  try {
    await authenticateParent({
      context,
      page,
      account: parent,
      baseUrl,
      mode: "ui",
      log: () => {},
    });
    pass(checks, "parent_ui_login");

    await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector("h2:has-text('הילדים שלי')", { timeout: 30_000 });

    const demoCard = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
    await demoCard.scrollIntoViewIfNeeded({ timeout: 30_000 });
    await demoCard.waitFor({ state: "visible", timeout: 15_000 });

    const cardText = await demoCard.innerText();
    if (!cardText.includes("ישראל")) {
      fail(checks, "dashboard_child_visible", "ישראל ישראלי card not visible on dashboard");
      blockers.push("dashboard missing demo child");
    } else {
      pass(checks, "dashboard_child_visible");
    }

    const linkInCard = demoCard.locator('a:has-text("דוח הורים")');
    const reportLink = page.locator(`a[href*="parent-report"][href*="studentId"]`).filter({ hasText: "דוח הורים" });
    if ((await linkInCard.count()) === 0 && (await reportLink.count()) === 0) {
      fail(checks, "report_link_works", "דוח הורים link not found");
      blockers.push("no report link");
    } else {
      const link = (await linkInCard.count()) > 0 ? linkInCard.first() : reportLink.first();
      const href = await link.getAttribute("href");
      const reportUrl = new URL(href, baseUrl);
      reportUrl.searchParams.set("period", "week");
      await page.goto(reportUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      pass(checks, "report_link_works");
    }

    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return t.includes("דוח") && !t.includes("טוען") && (t.includes("שאלות") || t.includes("זמן"));
      },
      undefined,
      { timeout: 90_000 }
    );
    const shortText = await page.locator("body").innerText();
    if (shortText.includes("לא ניתן") || shortText.includes("שגיאה")) {
      fail(checks, "short_report_loads", "error text on short report");
      blockers.push("short report error");
    } else if (!/\d+/.test(shortText)) {
      fail(checks, "short_report_loads", "no numeric summary visible");
      blockers.push("short report empty");
    } else {
      pass(checks, "short_report_loads");
    }

    const detUrl = new URL(page.url());
    detUrl.pathname = "/learning/parent-report-detailed";
    detUrl.searchParams.set("period", "week");
    await page.goto(detUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return t.includes("מקיף") || t.includes("סיכום") || t.includes("מקצוע");
      },
      undefined,
      { timeout: 90_000 }
    );
    const detText = await page.locator("body").innerText();
    if (detText.includes("500") || detText.includes("Internal Server")) {
      fail(checks, "detailed_report_opens", "500 on detailed report");
      blockers.push("detailed 500");
    } else {
      pass(checks, "detailed_report_opens");
    }

    const copilot = page.locator('text=שאלו על הדוח').first();
    await copilot.scrollIntoViewIfNeeded({ timeout: 30_000 });
    if (!(await copilot.isVisible())) {
      fail(checks, "copilot_visible", "Copilot panel not visible");
      blockers.push("copilot not visible");
    } else {
      pass(checks, "copilot_visible");
    }

    const useField = page.getByPlaceholder("שאלה על הדוח…");
    await useField.waitFor({ state: "visible", timeout: 15_000 });
    await useField.fill(DEMO_QUESTION);
    await page.getByRole("button", { name: "שלח" }).click();

    await page.waitForFunction(
      (q) => {
        const t = document.body?.innerText || "";
        const idx = t.indexOf(q);
        if (idx < 0) return false;
        const afterQ = t.slice(idx + q.length, idx + q.length + 500);
        return (
          !afterQ.includes("מעבד את הדוח") &&
          !afterQ.includes("אירעה שגיאה טכנית") &&
          afterQ.trim().length > 30
        );
      },
      DEMO_QUESTION,
      { timeout: 45_000 }
    ).catch(() => null);

    const after = await page.locator("body").innerText();
    const hasError =
      after.includes("אירעה שגיאה טכנית") ||
      after.includes("copilot-turn failed") ||
      after.includes("SERVER_SNAPSHOT_UNAVAILABLE");
    const qIdx = after.indexOf(DEMO_QUESTION);
    const afterQ = qIdx >= 0 ? after.slice(qIdx + DEMO_QUESTION.length, qIdx + DEMO_QUESTION.length + 600) : "";
    const hasAnswer =
      qIdx >= 0 &&
      !hasError &&
      afterQ.trim().length > 30 &&
      !afterQ.includes("אירעה שגיאה");

    if (hasError || !hasAnswer) {
      fail(
        checks,
        "copilot_useful_answer",
        hasError ? "copilot error response" : "no substantial Hebrew answer after question"
      );
      blockers.push("copilot answer failed");
    } else {
      pass(checks, "copilot_useful_answer");
    }

    const whiteCheck = await page.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      return document.body?.innerText?.trim().length > 20;
    });
    if (!whiteCheck) {
      fail(checks, "no_blank_page", "page appears blank");
      blockers.push("blank page");
    } else {
      pass(checks, "no_blank_page");
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
  }

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writeReport({ ok, checks, blockers, baseUrl, studentId });
  console.log(JSON.stringify({ ok, blockers, checks }, null, 2));
  process.exit(ok ? 0 : 1);
}

function writeReport(report) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(preflightPath, `${JSON.stringify({ ...report, at: new Date().toISOString() }, null, 2)}\n`);
}

main().catch((e) => {
  console.error("BLOCKER:", e.message);
  process.exit(1);
});
