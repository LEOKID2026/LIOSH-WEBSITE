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
 */

const PARENT_REPORT_PATH = "/learning/parent-report";
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

/** Wait for the dashboard to finish loading the linked-students list. */
async function waitForDashboardReady(page, log, expectedStudentName) {
  // The auth check renders a "בודק התחברות הורה..." placeholder before
  // session is hydrated. After hydration we expect the real dashboard heading.
  await page
    .getByRole("heading", { name: "דשבורד הורים" })
    .waitFor({ state: "visible", timeout: 30_000 });
  log?.("parent-dashboard: heading 'דשבורד הורים' visible");

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

const PARENT_DASHBOARD_PATH = "/parent/dashboard";

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

  const currentUrl = page.url();
  const isOnDashboard = (() => {
    try {
      const u = new URL(currentUrl);
      return u.pathname === PARENT_DASHBOARD_PATH;
    } catch {
      return false;
    }
  })();
  if (!isOnDashboard) {
    if (!baseUrl) {
      throw new Error(
        "verifyParentDashboardAndOpenReport: baseUrl is required when the " +
          "page is not already on /parent/dashboard"
      );
    }
    const target = new URL(PARENT_DASHBOARD_PATH, baseUrl).toString();
    log?.(
      `parent-dashboard: navigating to ${target} (current=${currentUrl})`
    );
    await page.goto(target, { waitUntil: "domcontentloaded" });
  }

  const dashboardUrl = page.url();
  const dashReadyInfo = await waitForDashboardReady(page, log, expectedStudentName);

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
  if (!linkHref || !linkHref.includes("/learning/parent-report")) {
    throw new Error(
      `parent-dashboard: "דוח הורים" link href looks wrong: ${String(linkHref)}`
    );
  }
  log?.(`parent-dashboard: clicking דוח הורים -> ${linkHref}`);

  await Promise.all([
    page.waitForURL("**/learning/parent-report**", { timeout: 30_000 }),
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
  if (reportPathname !== PARENT_REPORT_PATH) {
    throw new Error(
      `parent-dashboard: expected report path ${PARENT_REPORT_PATH}, got ${reportPathname} (${reportUrl})`
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
