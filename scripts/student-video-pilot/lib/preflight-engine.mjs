/**
 * Generic preflight runner for student-video-pilot workflows.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { fail, pass, writePreflightReport } from "../../parent-video-pilot/lib/preflight-kit.mjs";
import {
  assertAllowedBaseUrl,
  isMobileViewport,
  viewportFor,
  workflowPaths,
} from "./common.mjs";
import {
  ensureDemoStudentAccess,
  ensureStudentSession,
  expectedDemoStudentName,
  resolveStudentDemoAccount,
} from "./student-session.mjs";

export async function runPreflight(workflow, { slug, viewport, baseUrl }) {
  assertAllowedBaseUrl(baseUrl);
  const paths = workflowPaths(slug, viewport);
  const mobile = isMobileViewport(viewport);
  const checks = [];
  const blockers = [];
  const account = resolveStudentDemoAccount();
  const demoName = expectedDemoStudentName();

  try {
    await ensureDemoStudentAccess(baseUrl);
    pass(checks, "demo_account_access", `${account.username}/****`);
  } catch (e) {
    fail(checks, "demo_account_access", e.message);
    blockers.push(e.message);
  }

  if (blockers.length === 0 && typeof workflow.preflightChecks === "function") {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: viewportFor(viewport),
      locale: "he-IL",
    });
    const page = await context.newPage();

    try {
      await ensureStudentSession(page, baseUrl, account);
      pass(checks, "student_ui_login", demoName);

      const ctx = {
        page,
        baseUrl,
        viewport,
        mobile,
        account,
        demoName,
        checks,
        blockers,
        pass: (id, msg) => pass(checks, id, msg),
        fail: (id, msg) => {
          fail(checks, id, msg);
          blockers.push(msg);
        },
      };

      await workflow.preflightChecks(ctx);
    } catch (e) {
      fail(checks, "preflight_browser_flow", e.message);
      blockers.push(`browser: ${e.message}`);
    } finally {
      await browser.close();
    }
  }

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  const report = {
    ok,
    checks,
    blockers,
    baseUrl,
    slug,
    viewport,
    workflowId: workflow.id,
    title: workflow.title,
    pilot: `student-video-${slug}-${viewport}`,
  };

  mkdirSync(paths.outDir, { recursive: true });
  writePreflightReport(paths.outDir, paths.preflightPath, report);
  return report;
}
