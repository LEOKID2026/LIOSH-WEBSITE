#!/usr/bin/env node
/**
 * Preflight — Video #5 mobile (short vs detailed report, no Copilot).
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
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
  TITLE,
  PILOT_ID,
  MOBILE_VIEWPORT,
} from "./shared-how-to-read-report-mobile.mjs";

const MIN_QUESTIONS = 1;

function fail(checks, id, message) {
  checks.push({ id, ok: false, message });
  return false;
}

function pass(checks, id, message = "ok") {
  checks.push({ id, ok: true, message });
  return true;
}

async function assertNotCopilotFocused(page, checks, blockers) {
  const state = await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="שאלה על הדוח"]');
    const focused = input && document.activeElement === input;
    const copilotHeader = [...document.querySelectorAll("div, section")].find((d) =>
      d.innerText?.trim().startsWith("שאלו על הדוח")
    );
    let copilotDominant = false;
    if (copilotHeader) {
      const r = copilotHeader.getBoundingClientRect();
      const area = Math.max(1, r.width * r.height);
      const visibleH = Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top);
      const visibleW = Math.min(window.innerWidth, r.right) - Math.max(0, r.left);
      const visibleArea = Math.max(0, visibleW) * Math.max(0, visibleH);
      copilotDominant = visibleArea / area > 0.45 && r.top < window.innerHeight * 0.35;
    }
    return { focused, copilotDominant, hasCopilot: !!copilotHeader };
  });
  if (state.focused) {
    fail(checks, "no_copilot_focus", "Copilot input is focused");
    blockers.push("accidental Copilot focus");
    return false;
  }
  if (state.copilotDominant) {
    fail(checks, "no_copilot_focus", "Copilot panel dominates viewport (scroll away before capture)");
    blockers.push("Copilot dominates viewport");
    return false;
  }
  pass(checks, "no_copilot_focus", state.hasCopilot ? "Copilot present but not focused/dominant" : "no Copilot on page");
  return true;
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const checks = [];
  let blockers = [];
  let studentId = null;

  try {
    selectHelpParentAccount();
    pass(checks, "parent_account_configured");
  } catch (e) {
    fail(checks, "parent_account_configured", e.message);
    blockers.push(e.message);
    writeReport({ ok: false, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
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
    blockers.push(`parent QA login / policy: ${e.message}`);
    writeReport({ ok: false, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
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
      fail(
        checks,
        "demo_child_on_dashboard",
        `child "${DEMO_CHILD_NAME}" not found (${students.length} students)`
      );
      blockers.push(`demo child missing: ${students.map((s) => s.full_name).join(", ")}`);
    } else {
      studentId = demo.id;
      pass(checks, "demo_child_on_dashboard", studentId);
    }
  }

  if (studentId) {
    const qs = new URLSearchParams({ period: "week" });
    const reportRes = await fetch(
      `${new URL(`/api/parent/students/${encodeURIComponent(studentId)}/report-data`, baseUrl).toString()}?${qs}`,
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
      if (!reportJson?.detailed && !reportJson?.summary) {
        fail(checks, "detailed_payload_available", "no summary in report-data");
        blockers.push("detailed payload missing");
      } else {
        pass(checks, "detailed_payload_available");
      }
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
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

    const policyGate = await page
      .locator("text=יש לאשר")
      .first()
      .isVisible()
      .catch(() => false);
    if (policyGate) {
      fail(checks, "policy_gate_clear", "policy acceptance gate still blocking");
      blockers.push("policy gate on login/dashboard");
    } else {
      pass(checks, "policy_gate_clear");
    }

    await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const bodyAfterDash = await page.locator("body").innerText();
    if (bodyAfterDash.includes("500") && bodyAfterDash.includes("Internal Server")) {
      fail(checks, "dashboard_not_500", "500 on dashboard");
      blockers.push("dashboard 500");
    } else if (bodyAfterDash.trim().length < 30) {
      fail(checks, "dashboard_not_blank", "dashboard blank");
      blockers.push("dashboard blank");
    } else {
      pass(checks, "dashboard_not_500");
    }

    await page.waitForSelector("h2:has-text('הילדים שלי')", { timeout: 30_000 }).catch(() => null);
    const demoCard = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
    await demoCard.scrollIntoViewIfNeeded({ timeout: 30_000 });
    await demoCard.waitFor({ state: "visible", timeout: 15_000 });
    pass(checks, "dashboard_child_visible");

    const linkInCard = demoCard.locator('a[href*="parent-report"]').first();
    if ((await linkInCard.count()) === 0) {
      fail(checks, "report_link_works", "parent-report link not on demo card");
      blockers.push("no report link");
    } else {
      const href = await linkInCard.getAttribute("href");
      const reportUrl = new URL(href, baseUrl);
      reportUrl.searchParams.set("period", "week");
      await page.goto(reportUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      pass(checks, "report_link_works");
    }

    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          t.includes("דוח") &&
          !t.includes("טוען את הדוח") &&
          (t.includes("שאלות") || t.includes("זמן כולל"))
        );
      },
      undefined,
      { timeout: 90_000 }
    );

    const shortText = await page.locator("body").innerText();
    if (shortText.includes("לא ניתן") || shortText.match(/שגיאה|error/i)) {
      fail(checks, "short_report_loads", "error on short report");
      blockers.push("short report error");
    } else if (!/\d+/.test(shortText)) {
      fail(checks, "short_report_loads", "no numeric data on short report");
      blockers.push("short report empty");
    } else {
      pass(checks, "short_report_loads");
    }

    if (!shortText.includes("זמן כולל") || !shortText.includes("שאלות")) {
      fail(checks, "short_kpi_cards_present", "KPI labels missing");
      blockers.push("KPI cards missing");
    } else {
      pass(checks, "short_kpi_cards_present");
    }

    const hasDiagnostic =
      shortText.includes("מה הכי בולט עכשיו") ||
      shortText.includes("דורש תשומת לב") ||
      shortText.includes("תוצאות טובות");
    if (!hasDiagnostic) {
      fail(checks, "short_diagnostic_present", "diagnostic/summary narrative missing");
      blockers.push("short diagnostic missing — seed report");
    } else {
      pass(checks, "short_diagnostic_present");
    }

    await assertNotCopilotFocused(page, checks, blockers);

    const detUrl = new URL(page.url());
    detUrl.pathname = "/learning/parent-report-detailed";
    detUrl.searchParams.set("period", "week");
    await page.goto(detUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });

    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          !t.includes("טוען דוח מקיף") &&
          (t.includes("דוח מקיף") || t.includes("סיכום לתקופה") || t.includes("מה עשינו"))
        );
      },
      undefined,
      { timeout: 90_000 }
    );

    const detText = await page.locator("body").innerText();
    if (detText.includes("500") && detText.includes("Internal Server")) {
      fail(checks, "detailed_report_opens", "500 on detailed report");
      blockers.push("detailed 500");
    } else if (detText.trim().length < 40) {
      fail(checks, "detailed_report_opens", "detailed report blank");
      blockers.push("detailed blank");
    } else {
      pass(checks, "detailed_report_opens");
    }

    if (!detText.includes("סיכום לתקופה")) {
      fail(checks, "section_period_summary", "סיכום לתקופה missing");
      blockers.push("section סיכום לתקופה missing");
    } else {
      pass(checks, "section_period_summary");
    }

    if (!detText.includes("מה עשינו בתקופה")) {
      fail(checks, "section_activity", "מה עשינו בתקופה missing");
      blockers.push("section מה עשינו missing");
    } else {
      pass(checks, "section_activity");
    }

    await page.evaluate(() => {
      const h = [...document.querySelectorAll("h2")].find((x) =>
        x.textContent?.includes("סיכום לתקופה")
      );
      h?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    await page.waitForTimeout(400);
    await assertNotCopilotFocused(page, checks, blockers);

    await page.evaluate(() => {
      const h = [...document.querySelectorAll("h2")].find((x) =>
        x.textContent?.includes("מה עשינו בתקופה")
      );
      h?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    await page.waitForTimeout(400);
    await assertNotCopilotFocused(page, checks, blockers);

    const loadingOnly = await page.evaluate(() => {
      const t = document.body?.innerText?.trim() || "";
      return t.length < 25 || /^טוען/.test(t);
    });
    if (loadingOnly) {
      fail(checks, "no_loading_only_screen", "page stuck on loading");
      blockers.push("loading-only screen");
    } else {
      pass(checks, "no_loading_only_screen");
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
  }

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writeReport({ ok, checks, blockers, baseUrl, studentId, title: TITLE, pilot: PILOT_ID });
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
