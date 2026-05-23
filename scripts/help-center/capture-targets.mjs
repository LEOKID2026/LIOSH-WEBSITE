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
      minTextLength: 12,
      mustIncludeText: "דוח להורים",
    },
    "parent-report/report-overview/detailed-report": {
      selector: "a:has-text('דוח מקיף לתקופה')",
      minTextLength: 8,
    },
    "parent-report/summary-card/summary": {
      selector: ".grid.grid-cols-2.md\\:grid-cols-4:has(.parent-report-print-summary-card)",
      minTextLength: 12,
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
      selector: "button:has-text('ייצא ל-PDF'), button:has-text('הדפס')",
      minTextLength: 4,
      afterGoto: waitParentReportReady,
    },
    "parent-report/understanding-the-disclaimer/disclaimer": {
      selector: ".parent-report-important-disclaimer",
      minTextLength: 20,
      afterGoto: waitParentReportReady,
    },

    // —— parents ——
    "parents/welcome-and-overview/overview": {
      selector: "main, #__next",
      minTextLength: 30,
    },
    "parents/create-parent-account/login": {
      selector: "form:has([type='password']), main",
      minTextLength: 10,
      mustIncludeText: "כניסה",
    },
    "parents/parent-dashboard-tour/dashboard": {
      selector: "section:has(h2:has-text('הילדים שלי'))",
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
      selector: ".parent-report-parent-ai-insight, .border-cyan-500\\/20",
      minTextLength: 10,
      afterGoto: waitParentReportReady,
    },
    "parents/monthly-rewards/rewards": {
      selector: "main, h1, h2",
      minTextLength: 8,
    },
    "parents/install-as-app/install-prompt": {
      selector: "main, body",
      minTextLength: 20,
    },
    "parents/mobile-and-offline/offline-hub": {
      selector: "main, h1",
      minTextLength: 8,
    },

    // —— students ——
    "students/student-login/login": {
      selector: "main",
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
      selector: 'button:has-text("בדוק")',
      ancestorLevels: 5,
      minTextLength: 4,
      afterGoto: waitLearningQuestionReady,
    },
    "students/daily-missions/missions": {
      selector: "#daily-missions-heading",
      ancestorLevels: 2,
      minTextLength: 8,
    },
    "students/monthly-persistence/persistence": {
      selector: "#monthly-persistence-heading",
      ancestorLevels: 2,
      minTextLength: 8,
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
      selector: 'button:has-text("בדוק")',
      ancestorLevels: 5,
      minTextLength: 4,
      afterGoto: waitLearningQuestionReady,
    },
    "subjects/*/explanation": {
      selector: "h4",
      ancestorLevels: 3,
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
  if (routePath === "__PARENT_REPORT__") {
    if (!studentId) throw new Error("parent report requires studentId");
    return `/learning/parent-report?studentId=${encodeURIComponent(studentId)}&source=parent`;
  }
  if (routePath === "__PARENT_REPORT_DETAILED__") {
    if (!studentId) throw new Error("parent report detailed requires studentId");
    return `/learning/parent-report-detailed?studentId=${encodeURIComponent(studentId)}&source=parent`;
  }
  return routePath;
}

async function waitParentReportReady(page) {
  await page
    .getByRole("heading", { name: /דוח להורים/u })
    .first()
    .waitFor({ state: "visible", timeout: 120_000 });
  await page
    .locator(".parent-report-print-summary-card")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 })
    .catch(() => {});
  await page.waitForTimeout(600);
}

async function waitParentReportDetailedReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await page
    .locator(".pr-detailed-subject-letter, [class*='pr-detailed']")
    .first()
    .waitFor({ state: "visible", timeout: 180_000 });
  await page.waitForTimeout(800);
}

async function waitLearningQuestionReady(page) {
  const check = page.getByRole("button", { name: "בדוק" }).first();
  await check.waitFor({ state: "visible", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function openFullExplanationModal(page) {
  const btn = page.getByRole("button", { name: /הסבר מלא/u }).first();
  await btn.waitFor({ state: "visible", timeout: 30_000 });
  await btn.click();
  await page.locator("h4").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(400);
}
