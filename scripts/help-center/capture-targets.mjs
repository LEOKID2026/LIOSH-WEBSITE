/**
 * Per-job element capture targets (section screenshots, not full-page reuse).
 */
import { routeForJob } from "./load-capture-jobs.mjs";

const LOADING_HIDE = [
  '[aria-busy="true"]',
  ".animate-pulse",
  'text=/טוען|טוענת|ממתין/u',
];

/**
 * @typedef {object} CaptureTarget
 * @property {string} path
 * @property {"none"|"student"|"parent"} auth
 * @property {string} selector
 * @property {number} [ancestorLevels]
 * @property {number} [minTextLength]
 * @property {string} [mustIncludeText]
 * @property {string[]} [hideLoading]
 * @property {(page: import("playwright").Page) => Promise<void>} [prepare]
 * @property {(page: import("playwright").Page) => Promise<void>} [afterGoto]
 */

/** @returns {CaptureTarget} */
export function resolveCaptureTarget(job, studentId) {
  const route = routeForJob(job);
  const path = resolvePath(route.path, studentId);
  const base = { path, auth: route.auth, hideLoading: LOADING_HIDE };

  const key = `${job.section}/${job.slug}/${job.region}`;

  /** @type {Record<string, Partial<CaptureTarget>>} */
  const map = {
    // —— parent-report ——
    "parent-report/report-overview/short-report": {
      selector: "h1:has-text('דוח להורים')",
      ancestorLevels: 2,
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/report-overview/detailed-report": {
      selector: "main, h1",
      minTextLength: 24,
      afterGoto: navigateToParentDetailedReportFromShort,
    },
    "parent-report/summary-card/summary": {
      selector: ".parent-report-print-summary-card >> nth=0",
      minTextLength: 4,
      afterGoto: waitParentReportReady,
    },
    "parent-report/data-presence/low-data": {
      selector:
        ".border-amber-400\\/25, .parent-report-important-disclaimer",
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/trends-and-confidence/trend": {
      selector: ".parent-report-graph-section",
      minTextLength: 4,
      afterGoto: waitParentReportReady,
    },
    "parent-report/strengths-and-improvements/strengths": {
      selector: ":text-matches('איפה נראו תוצאות טובות|מה הכי בולט עכשיו')",
      ancestorLevels: 1,
      minTextLength: 10,
      afterGoto: waitParentReportReady,
    },
    "parent-report/topics-and-buckets/topics-table": {
      selector: "h2:has-text('התקדמות בחשבון')",
      ancestorLevels: 2,
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/subjects-overview/six-subjects": {
      selector:
        ".grid.grid-cols-2.md\\:grid-cols-3:has(.parent-report-print-summary-card:has-text('חשבון'))",
      minTextLength: 12,
      afterGoto: waitParentReportReady,
    },
    "parent-report/recommendations/recommendations": {
      selector: ".parent-report-recommendations-print",
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/challenges-section/challenges": {
      selector: "h2:has-text('אתגרים')",
      ancestorLevels: 1,
      minTextLength: 6,
      afterGoto: waitParentReportReady,
    },
    "parent-report/detailed-report/letter": {
      selector: ".pr-detailed-subject-letter",
      minTextLength: 20,
      afterGoto: waitParentReportDetailedReady,
    },
    "parent-report/printing-and-pdf/pdf": {
      selector:
        "section:has(button:has-text('ייצא ל-PDF')), section:has(button:has-text('הדפס')), .parent-report-actions",
      ancestorLevels: 1,
      minTextLength: 12,
      afterGoto: waitParentReportReady,
      prepare: async (page) => {
        const btn = page
          .locator("button:has-text('ייצא ל-PDF'), button:has-text('הדפס')")
          .first();
        await btn.scrollIntoViewIfNeeded().catch(() => {});
      },
    },
    "parent-report/understanding-the-disclaimer/disclaimer": {
      selector: ".parent-report-important-disclaimer",
      minTextLength: 20,
      afterGoto: waitParentReportReady,
    },

    // —— parents ——
    "parents/welcome-and-overview/overview": {
      selector: "a[href*='/learning'], a[href*='/student']",
      ancestorLevels: 3,
      minTextLength: 20,
    },
    "parents/create-parent-account/login": {
      selector: "form:has([type='password'])",
      minTextLength: 10,
      mustIncludeText: "כניסה",
    },
    "parents/parent-dashboard-tour/dashboard": {
      selector: "section:has(h2:has-text('הילדים שלי')) .rounded.border",
      minTextLength: 8,
    },
    "parents/add-students/form": {
      selector: "form:has(button:has-text('הוסף ילד'))",
      minTextLength: 8,
    },
    "parents/student-pin-and-credentials/pin-display": {
      selector: ":text-matches('פרטי כניסת תלמיד|PIN')",
      ancestorLevels: 2,
      minTextLength: 8,
    },
    "parents/edit-or-delete-student/edit": {
      selector: "section:has(h2:has-text('הילדים שלי')) .rounded.border",
      minTextLength: 8,
    },
    "parents/how-to-read-report/report-link": {
      selector: "a:has-text('דוח הורים')",
      ancestorLevels: 2,
      minTextLength: 4,
    },
    "parents/parent-copilot/copilot-panel": {
      selector: ".parent-report-parent-ai-insight",
      minTextLength: 10,
      afterGoto: waitParentReportReady,
      prepare: async (page) => {
        const panel = page.locator(".parent-report-parent-ai-insight").first();
        if (!(await panel.isVisible().catch(() => false))) {
          throw new Error("copilot panel not present on report — skip");
        }
      },
    },
    "parents/monthly-rewards/rewards": {
      selector: "main, h1, h2",
      minTextLength: 8,
    },
    "parents/install-as-app/install-prompt": {
      selector: ":text-matches('התקן|הוסף למסך|אפליקציה|PWA|install', 'i')",
      ancestorLevels: 2,
      minTextLength: 8,
      prepare: async (page) => {
        const el = page.locator(":text-matches('התקן|הוסף למסך', 'i')").first();
        if (await el.isVisible().catch(() => false)) {
          await el.scrollIntoViewIfNeeded();
        }
      },
    },
    "parents/mobile-and-offline/offline-hub": {
      selector: "h1, [role='heading']",
      minTextLength: 6,
    },

    // —— students ——
    "students/student-login/login": {
      selector: "form:has([placeholder='שם משתמש'])",
      minTextLength: 6,
    },
    "students/student-home-tour/home": {
      selector: "main, #__next",
      minTextLength: 12,
    },
    "students/choose-subject-and-grade/subjects": {
      selector: "main",
      minTextLength: 15,
    },
    "students/answering-questions/question": {
      selector: '[data-testid$="-check-answer"], button:has-text("בדוק")',
      ancestorLevels: 2,
      minTextLength: 4,
      afterGoto: waitLearningQuestionReady,
    },
    "students/daily-missions/missions": {
      selector: "#daily-missions-heading",
      ancestorLevels: 2,
      minTextLength: 8,
      prepare: scrollHeadingIntoView("#daily-missions-heading"),
    },
    "students/monthly-persistence/persistence": {
      selector: "#monthly-persistence-heading",
      ancestorLevels: 2,
      minTextLength: 8,
      prepare: scrollHeadingIntoView("#monthly-persistence-heading"),
    },
    "students/coins-and-arcade/arcade": {
      selector: "main, h1",
      minTextLength: 10,
    },
    "students/avatar-and-profile/avatar": {
      selector: ":text-matches('אווטאר|אווטר|פרופיל')",
      ancestorLevels: 2,
      minTextLength: 4,
      prepare: async (page) => {
        const btn = page.getByRole("button", { name: /אווטאר|פרופיל/u }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(400);
        }
      },
    },
    "students/offline-games/offline": {
      selector: "main, h1",
      minTextLength: 8,
    },

    // —— subjects (question + explanation share master URL) ——
    "subjects/*/question": {
      selector: '[data-testid$="-check-answer"], button:has-text("בדוק")',
      ancestorLevels: 2,
      minTextLength: 4,
      afterGoto: waitLearningQuestionReady,
    },
    "subjects/*/explanation": {
      selector: "[role='dialog'] h4, .fixed.inset-0 h4, h4",
      ancestorLevels: 1,
      minTextLength: 8,
      afterGoto: waitLearningQuestionReady,
      prepare: openFullExplanationModal,
    },
  };

  const exact = map[key];
  if (exact) return { ...base, ...exact };

  if (job.section === "subjects") {
    if (job.region === "question") return { ...base, ...map["subjects/*/question"] };
    if (job.region === "explanation") return { ...base, ...map["subjects/*/explanation"] };
  }

  return {
    ...base,
    selector: "main",
    minTextLength: 8,
  };
}

function resolvePath(routePath, studentId) {
  const period = "period=month";
  if (routePath === "__PARENT_REPORT__") {
    if (!studentId) throw new Error("parent report requires studentId");
    return `/learning/parent-report?studentId=${encodeURIComponent(studentId)}&source=parent&${period}`;
  }
  if (routePath === "__PARENT_REPORT_DETAILED__") {
    if (!studentId) throw new Error("parent report detailed requires studentId");
    return `/learning/parent-report-detailed?studentId=${encodeURIComponent(studentId)}&source=parent&${period}`;
  }
  return routePath;
}

async function waitParentReportReady(page) {
  const path = new URL(page.url()).pathname;
  if (!path.includes("parent-report")) {
    throw new Error(`expected parent-report URL, got ${path}`);
  }
  await page
    .locator(".parent-report-print-summary-card")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function waitParentReportDetailedReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await page
    .locator(".pr-detailed-subject-letter")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(400);
}

function scrollHeadingIntoView(selector) {
  return async (page) => {
    const el = page.locator(selector).first();
    await el.waitFor({ state: "attached", timeout: 60_000 });
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(300);
  };
}

async function navigateToParentDetailedReportFromShort(page) {
  await waitParentReportReady(page);
  const link = page.getByRole("link", { name: /דוח מקיף/i }).first();
  await link.waitFor({ state: "visible", timeout: 30_000 });
  await link.click();
  await page.waitForURL(/parent-report-detailed/, { timeout: 90_000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function waitLearningQuestionReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});

  const playerName = page.locator('[data-testid$="-player-name"]').first();
  if (await playerName.count()) {
    await page
      .waitForFunction(
        () => {
          const node = document.querySelector('[data-testid$="-player-name"]');
          const text = node?.textContent?.trim() || "";
          return Boolean(text) && text !== "שחקן";
        },
        null,
        { timeout: 45_000 }
      )
      .catch(() => {});
  }

  const start = page.locator('[data-testid$="-start-game"]').first();
  if (await start.isVisible().catch(() => false)) {
    await start.click({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1500);
  } else {
    const legacyStart = page.getByRole("button", { name: /התחל|התחילו|start/i }).first();
    if (await legacyStart.isVisible().catch(() => false)) {
      await legacyStart.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  const textAnswer = page.locator('[data-testid$="-text-answer"]').first();
  if (await textAnswer.isVisible().catch(() => false)) {
    await textAnswer.fill("1").catch(() => {});
  }

  const check = page.locator('[data-testid$="-check-answer"]').first();
  if (await check.count()) {
    await check.waitFor({ state: "visible", timeout: 60_000 });
  } else {
    await page.getByRole("button", { name: "בדוק" }).first().waitFor({ state: "visible", timeout: 60_000 });
  }
  await page.waitForTimeout(400);
}

async function openFullExplanationModal(page) {
  const btn = page.getByRole("button", { name: /הסבר מלא/u }).first();
  await btn.waitFor({ state: "visible", timeout: 45_000 });
  await btn.click();
  await page
    .locator("[role='dialog'] h4, .fixed.inset-0 h4, h4")
    .first()
    .waitFor({ state: "visible", timeout: 25_000 });
  await page.waitForTimeout(400);
}
