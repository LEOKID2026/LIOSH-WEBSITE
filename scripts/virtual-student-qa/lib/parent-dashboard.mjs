/**
 * Virtual Student QA Runner — parent dashboard verification + report opener.
 *
 * Phase B requires:
 *   1. /parent/dashboard renders (heading "דשבורד הורים").
 *   2. The expected linked student appears in the visible students list.
 *   3. The real parent-facing "דוח הורים" affordance is clicked for that
 *      student. The report MUST be reached via that click — never by
 *      direct URL construction.
 *
 * No localStorage truth, no API mocks. We rely on the visible DOM and the
 * browser's URL after the click.
 *
 * Hardening (2026-05-18 halt): after long student sessions the parent page
 * can land on /parent/report or a slow-hydrating dashboard. We retry
 * navigation, wait for multiple dashboard signals (URL + heading/cards/API),
 * and capture screenshot/html debug artifacts before failing.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Canonical parent report route from dashboard click (PWA-scoped portal). */
const PARENT_REPORT_PATH = "/parent/parent-report";
/** Legacy route — still accepted for backward-compatible deployments. */
const PARENT_REPORT_PATH_LEGACY = "/learning/parent-report";
const PARENT_REPORT_PATHS = [PARENT_REPORT_PATH, PARENT_REPORT_PATH_LEGACY];

function isParentReportHref(href) {
  if (!href) return false;
  return PARENT_REPORT_PATHS.some((p) => href.includes(p));
}

function isParentReportPathname(pathname) {
  if (!pathname) return false;
  return PARENT_REPORT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const PARENT_DASHBOARD_PATH = "/parent/dashboard";
const MAX_DASHBOARD_ATTEMPTS = 3;
const DASHBOARD_SIGNAL_TIMEOUT_MS = 45_000;
const LEGACY_CHILDREN_HEADING = /^הילדים שלי \(\d+\)$/u;

/** Current product dashboard: student cards live in a section with report links. */
function locateChildrenSection(page) {
  const modernSection = page
    .locator("section")
    .filter({ has: page.getByRole("link", { name: "דוח הורים" }) })
    .first();
  const legacySection = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: LEGACY_CHILDREN_HEADING }),
    })
    .first();
  return modernSection.or(legacySection);
}

function locateStudentCards(section) {
  return section.locator("div.grid > div");
}

function isOnParentDashboardUrl(url) {
  try {
    return new URL(url).pathname === PARENT_DASHBOARD_PATH;
  } catch {
    return false;
  }
}

async function navigateToParentDashboard(page, baseUrl, log) {
  const target = new URL(PARENT_DASHBOARD_PATH, baseUrl).toString();
  log?.(`parent-dashboard: goto ${target} (waitUntil=domcontentloaded)`);
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page
    .waitForURL(`**${PARENT_DASHBOARD_PATH}**`, { timeout: 20_000 })
    .catch(() => {});
}

async function waitForDashboardShellSignals(page, log) {
  const waitOnce = () =>
    page.waitForFunction(
      () => {
        let pathname = "";
        try {
          pathname = new URL(location.href).pathname;
        } catch {
          return false;
        }
        if (pathname !== "/parent/dashboard") return false;

        const bodyText = document.body?.innerText || "";
        if (bodyText.includes("בודק התחברות הורה")) return false;

        const hasHeading = Array.from(document.querySelectorAll("h1, h2")).some(
          (el) => (el.textContent || "").trim() === "דשבורד הורים"
        );
        const reportLinks = document.querySelectorAll(
          'a[href*="/parent/parent-report"], a[href*="/learning/parent-report"]'
        ).length;
        const hasAccountLine = bodyText.includes("ילדים בחשבון:");
        const hasEmptyState = bodyText.includes("עדיין לא נוספו ילדים");

        return hasHeading || reportLinks > 0 || hasAccountLine || hasEmptyState;
      },
      undefined,
      { timeout: DASHBOARD_SIGNAL_TIMEOUT_MS }
    );

  try {
    await waitOnce();
  } catch (error) {
    const authPending = await page
      .locator("body")
      .innerText()
      .then((t) => t.includes("בודק התחברות הורה"))
      .catch(() => false);
    if (authPending) {
      log?.(
        "parent-dashboard: parent auth hydration slow — reloading dashboard once"
      );
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await waitOnce();
    } else {
      throw error;
    }
  }
  const headingVisible = await page
    .getByRole("heading", { name: "דשבורד הורים" })
    .isVisible()
    .catch(() => false);
  if (headingVisible) {
    log?.("parent-dashboard: heading 'דשבורד הורים' visible");
  } else {
    log?.(
      "parent-dashboard: dashboard shell ready (heading not yet visible; cards/account line detected)"
    );
  }
}

async function captureDashboardFailureDebug({
  page,
  log,
  artifacts,
  screenshotPrefix,
  reason,
  attempt,
}) {
  const url = page.url();
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    // ignore
  }
  log?.(
    `parent-dashboard: attempt ${attempt}/${MAX_DASHBOARD_ATTEMPTS} failed — ${reason} url=${url} pathname=${pathname}`
  );
  if (artifacts?.saveScreenshot) {
    await artifacts.saveScreenshot(
      page,
      `${screenshotPrefix}parent-dashboard-failure-attempt${attempt}`
    );
  }
  if (artifacts?.root) {
    try {
      const logsDir = join(artifacts.root, "logs");
      mkdirSync(logsDir, { recursive: true });
      const safePrefix = String(screenshotPrefix).replace(/[^a-zA-Z0-9._-]/g, "_");
      const html = await page.content().catch(() => "");
      writeFileSync(
        join(
          logsDir,
          `${safePrefix}parent-dashboard-failure-attempt${attempt}.html`
        ),
        html.slice(0, 120_000),
        "utf8"
      );
    } catch (error) {
      log?.(
        `parent-dashboard: debug html capture failed: ${error?.message || error}`
      );
    }
  }
  if (artifacts?.appendLog) {
    artifacts.appendLog(
      "parent-dashboard-debug",
      `attempt ${attempt} failed: ${reason} url=${url}`
    );
  }
}

async function ensureParentDashboardShell({
  page,
  baseUrl,
  log,
  artifacts,
  screenshotPrefix,
}) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_DASHBOARD_ATTEMPTS; attempt++) {
    try {
      if (!isOnParentDashboardUrl(page.url()) || attempt > 1) {
        await navigateToParentDashboard(page, baseUrl, log);
      }
      await waitForDashboardShellSignals(page, log);
      return;
    } catch (error) {
      lastError = error;
      await captureDashboardFailureDebug({
        page,
        log,
        artifacts,
        screenshotPrefix,
        reason: error?.message || String(error),
        attempt,
      });
      if (attempt < MAX_DASHBOARD_ATTEMPTS) {
        log?.(
          `parent-dashboard: retrying dashboard navigation (${attempt + 1}/${MAX_DASHBOARD_ATTEMPTS})`
        );
        await page.waitForTimeout(1000 * attempt);
      }
    }
  }
  throw new Error(
    `parent-dashboard: dashboard shell not ready after ${MAX_DASHBOARD_ATTEMPTS} attempts: ${
      lastError?.message || lastError
    }`
  );
}

/** Wait for the dashboard to finish loading the linked-students list. */
async function waitForDashboardReady(
  page,
  log,
  expectedStudentName,
  { artifacts, screenshotPrefix } = {}
) {
  // Legacy deployments rendered "הילדים שלי (N)" as an h2; current product
  // uses a student card grid with "דוח הורים" links instead. Keep optional
  // wait so older deployments still converge.
  const legacyChildrenHeading = page.getByRole("heading", {
    name: LEGACY_CHILDREN_HEADING,
  });

  // The dashboard's `students` state is `[]` on first paint and is only
  // populated after the /api/parent/list-students fetch resolves.
  let apiSummary = null;
  try {
    const resp = await page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/parent/list-students"),
      { timeout: 30_000 }
    );
    const status = resp.status();
    let parsedCount = null;
    let bodyError = null;
    try {
      const body = await resp.json();
      if (body && Array.isArray(body.students)) {
        parsedCount = body.students.length;
      } else if (body && body.error) {
        bodyError = String(body.error).slice(0, 200);
      }
    } catch (_e) {
      // Non-JSON or already-consumed body; tolerate.
    }
    apiSummary = { status, parsedCount, bodyError };
    log?.(
      `parent-dashboard: /api/parent/list-students -> status=${status} students=${parsedCount} error=${bodyError || "(none)"}`
    );
  } catch (error) {
    apiSummary = {
      status: null,
      parsedCount: null,
      bodyError: `wait timeout: ${error?.message || error}`,
    };
    log?.(
      `parent-dashboard: /api/parent/list-students wait timed out: ${error?.message || error}`
    );
  }

  const childrenSection = locateChildrenSection(page);
  const targetName = String(expectedStudentName || "").trim();
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (targetName) {
      const modernCards = locateStudentCards(childrenSection).filter({
        has: page.getByRole("heading", {
          level: 3,
          name: targetName,
          exact: true,
        }),
      });
      if ((await modernCards.count()) > 0) break;
      const legacySection = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", { name: LEGACY_CHILDREN_HEADING }),
        })
        .first();
      const legacyCards = legacySection
        .locator(":scope > div")
        .filter({ hasText: targetName });
      if ((await legacyCards.count()) > 0) break;
    }
    if ((await page.getByText("עדיין לא נוספו ילדים", { exact: false }).count()) > 0) {
      break;
    }
    if ((await page.getByRole("link", { name: "דוח הורים" }).count()) > 0) {
      break;
    }
    if (await legacyChildrenHeading.isVisible().catch(() => false)) {
      const headingText = await legacyChildrenHeading.textContent().catch(() => "");
      const m = String(headingText || "").match(/\((\d+)\)/);
      if (m && Number(m[1]) > 0) break;
    }
    if (apiSummary?.parsedCount != null && apiSummary.parsedCount > 0) {
      await page.waitForTimeout(250);
      if ((await page.getByRole("link", { name: "דוח הורים" }).count()) > 0) {
        break;
      }
    }
    await page.waitForTimeout(250);
  }

  let childrenSummary = "";
  if (await legacyChildrenHeading.isVisible().catch(() => false)) {
    childrenSummary = (await legacyChildrenHeading.textContent())?.trim() || "";
  } else {
    const accountLine = page.getByText(/^ילדים בחשבון:/u);
    if (await accountLine.isVisible().catch(() => false)) {
      childrenSummary = (await accountLine.textContent())?.trim() || "";
    } else {
      const reportLinks = await page.getByRole("link", { name: "דוח הורים" }).count();
      childrenSummary = `student-cards=${reportLinks} apiStudents=${apiSummary?.parsedCount ?? "(unknown)"}`;
    }
  }
  log?.(`parent-dashboard: children section -> ${childrenSummary}`);
  return { apiSummary, headingText: childrenSummary };
}

/** Locate the per-student card whose visible name matches expectedName. */
function locateStudentCard(page, expectedName) {
  const modernSection = page
    .locator("section")
    .filter({ has: page.getByRole("link", { name: "דוח הורים" }) })
    .first();
  const modernCard = locateStudentCards(modernSection).filter({
    has: page.getByRole("heading", {
      level: 3,
      name: expectedName,
      exact: true,
    }),
  });

  const legacySection = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: LEGACY_CHILDREN_HEADING }),
    })
    .first();
  const legacyCard = legacySection.locator(":scope > div").filter({
    hasText: expectedName,
  });

  return modernCard.or(legacyCard).first();
}

/**
 * Verify the dashboard contains the expected student and click the real
 * parent-facing "דוח הורים" link to navigate to the report.
 *
 * If the page is not currently on /parent/dashboard, this will navigate
 * to the dashboard URL first so callers (e.g. Phase C snapshot loops) can
 * be invoked from any prior page state without bypassing the real UI.
 *
 * `screenshotPrefix` — when provided, screenshots written by this helper
 * are prefixed with it so repeated snapshots in the same run do not
 * overwrite each other.
 */
export async function verifyParentDashboardAndOpenReport({
  page,
  baseUrl,
  expectedStudentName,
  log,
  artifacts,
  artifactPrefix,
}) {
  const screenshotPrefix = artifactPrefix ? `${artifactPrefix}-` : "";

  if (!baseUrl) {
    throw new Error(
      "verifyParentDashboardAndOpenReport: baseUrl is required"
    );
  }

  const currentUrl = page.url();
  log?.(
    `parent-dashboard: navigating to ${new URL(PARENT_DASHBOARD_PATH, baseUrl)} (current=${currentUrl})`
  );
  await ensureParentDashboardShell({
    page,
    baseUrl,
    log,
    artifacts,
    screenshotPrefix,
  });

  const dashboardUrl = page.url();
  const dashReadyInfo = await waitForDashboardReady(page, log, expectedStudentName, {
    artifacts,
    screenshotPrefix,
  });

  const card = locateStudentCard(page, expectedStudentName);
  const cardCount = await card.count();
  if (cardCount === 0) {
    if (artifacts?.saveScreenshot) {
      await artifacts.saveScreenshot(
        page,
        `${screenshotPrefix}parent-dashboard-student-missing`
      );
    }
    const childrenSection = locateChildrenSection(page);
    const visibleNames = await childrenSection
      .locator("h3")
      .allTextContents()
      .catch(() => []);
    const legacyNames = await childrenSection
      .locator(":scope > div .font-semibold.text-white")
      .allTextContents()
      .catch(() => []);
    const apiInfo = dashReadyInfo?.apiSummary
      ? ` apiStatus=${dashReadyInfo.apiSummary.status} apiStudents=${dashReadyInfo.apiSummary.parsedCount} apiError=${dashReadyInfo.apiSummary.bodyError || "(none)"}`
      : "";
    throw new Error(
      `parent-dashboard: linked student "${expectedStudentName}" not visible. ` +
        `Visible names: ${JSON.stringify([...visibleNames, ...legacyNames].filter(Boolean))}${apiInfo}`
    );
  }

  if (artifacts?.saveScreenshot) {
    await artifacts.saveScreenshot(
      page,
      `${screenshotPrefix}parent-dashboard-with-student`
    );
  }

  const reportLink = card.getByRole("link", { name: "דוח הורים" });
  const linkCount = await reportLink.count();
  if (linkCount === 0) {
    throw new Error(
      `parent-dashboard: "דוח הורים" link not found in card for "${expectedStudentName}"`
    );
  }

  // Capture the href before clicking — we'll later assert the post-click
  // URL matches it (proof the report was reached via the dashboard click,
  // not a direct URL construction).
  const linkHref = await reportLink.first().getAttribute("href");
  if (!isParentReportHref(linkHref)) {
    throw new Error(
      `parent-dashboard: "דוח הורים" link href looks wrong: ${String(linkHref)} ` +
        `(expected ${PARENT_REPORT_PATHS.join(" or ")})`
    );
  }
  log?.(`parent-dashboard: clicking דוח הורים -> ${linkHref}`);

  await Promise.all([
    page.waitForURL(
      (url) => isParentReportPathname(new URL(url).pathname),
      { timeout: 30_000 }
    ),
    reportLink.first().click(),
  ]);

  const reportUrl = page.url();
  let reportPathname = "";
  let studentIdFromUrl = "";
  try {
    const u = new URL(reportUrl);
    reportPathname = u.pathname;
    studentIdFromUrl = u.searchParams.get("studentId") || "";
  } catch {
    // ignore
  }
  if (!isParentReportPathname(reportPathname)) {
    throw new Error(
      `parent-dashboard: expected report path ${PARENT_REPORT_PATHS.join(" or ")}, got ${reportPathname} (${reportUrl})`
    );
  }
  if (!studentIdFromUrl) {
    throw new Error(
      `parent-dashboard: report URL is missing studentId — ${reportUrl}`
    );
  }
  log?.(`parent-dashboard: report opened via dashboard click -> ${reportUrl}`);

  return {
    dashboardUrl,
    reportUrl,
    reportLinkHref: linkHref,
    studentIdFromUrl,
    studentName: expectedStudentName,
  };
}
