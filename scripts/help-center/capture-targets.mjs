/**
 * Per-job element capture targets (section screenshots, not full-page reuse).
 */
import { routeForJob } from "./load-capture-jobs.mjs";

const LOADING_HIDE = [
  '[aria-busy="true"]',
  ".animate-pulse",
  'text=/טוען|טוענת|ממתין/u',
];

/** Must match Help Center demo child (see seed-demo-report-data.mjs). */
const DEMO_PLAYER_NAME = "ישראל ישראלי";

async function seedLocalPlayerName(page) {
  await page.evaluate((name) => {
    localStorage.setItem("mleo_player_name", name);
  }, DEMO_PLAYER_NAME);
}

function detailedReportSeedPayload(playerName) {
  const now = Date.now();
  const mkTopic = (sessions) => ({ topics: { t1: { sessions } } });
  const one = (correct, total) => [
    {
      timestamp: now,
      total,
      correct,
      mode: "learning",
      grade: "g3",
      level: "medium",
      duration: 300,
    },
  ];

  localStorage.setItem("mleo_player_name", playerName);
  localStorage.setItem(
    "mleo_time_tracking",
    JSON.stringify({
      operations: {
        addition: {
          sessions: Array.from({ length: 8 }, (_, i) => ({
            timestamp: now - i * 3600000,
            total: 24,
            correct: 22,
            mode: "learning",
            grade: "g4",
            level: "medium",
            duration: 400,
          })),
        },
      },
    })
  );
  localStorage.setItem(
    "mleo_math_master_progress",
    JSON.stringify({ progress: { addition: { total: 400, correct: 360 } } })
  );
  localStorage.setItem("mleo_mistakes", JSON.stringify([]));
  localStorage.setItem(
    "mleo_geometry_time_tracking",
    JSON.stringify({
      topics: {
        perimeter: {
          sessions: Array.from({ length: 6 }, (_, i) => ({
            timestamp: now - i * 400000,
            total: 20,
            correct: 18,
            mode: "learning",
            grade: "g4",
            level: "hard",
            duration: 380,
          })),
        },
      },
    })
  );
  localStorage.setItem(
    "mleo_geometry_master_progress",
    JSON.stringify({ progress: { perimeter: { total: 120, correct: 108 } } })
  );
  localStorage.setItem("mleo_geometry_mistakes", JSON.stringify([]));
  localStorage.setItem("mleo_english_time_tracking", JSON.stringify(mkTopic(one(8, 10))));
  localStorage.setItem(
    "mleo_english_master_progress",
    JSON.stringify({ progress: { t1: { total: 50, correct: 42 } } })
  );
  localStorage.setItem("mleo_english_mistakes", JSON.stringify([]));
  localStorage.setItem("mleo_science_time_tracking", JSON.stringify(mkTopic(one(7, 10))));
  localStorage.setItem(
    "mleo_science_master_progress",
    JSON.stringify({ progress: { t1: { total: 40, correct: 30 } } })
  );
  localStorage.setItem("mleo_science_mistakes", JSON.stringify([]));
  localStorage.setItem("mleo_hebrew_time_tracking", JSON.stringify(mkTopic(one(9, 11))));
  localStorage.setItem(
    "mleo_hebrew_master_progress",
    JSON.stringify({ progress: { t1: { total: 44, correct: 38 } } })
  );
  localStorage.setItem("mleo_hebrew_mistakes", JSON.stringify([]));
  localStorage.setItem(
    "mleo_moledet_geography_time_tracking",
    JSON.stringify(mkTopic(one(6, 9)))
  );
  localStorage.setItem(
    "mleo_moledet_geography_master_progress",
    JSON.stringify({ progress: { t1: { total: 36, correct: 28 } } })
  );
  localStorage.setItem("mleo_moledet_geography_mistakes", JSON.stringify([]));
}

/** Rich v2 local practice data (parity with overnight strong-stable profile). */
async function seedDetailedReportLocalStorage(page) {
  await page.addInitScript(detailedReportSeedPayload, DEMO_PLAYER_NAME);
  await page.evaluate(detailedReportSeedPayload, DEMO_PLAYER_NAME);
}

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
 * @property {(page: import("playwright").Page) => Promise<void>} [beforeGoto]
 * @property {(page: import("playwright").Page) => Promise<void>} [afterGoto]
 * @property {number} [expandMobileClipTo] — minimum clip height on mobile (px from element top)
 */

/** @returns {CaptureTarget} */
export function resolveCaptureTarget(job, studentId, viewportName = "desktop") {
  const route = routeForJob(job);
  const path = resolvePath(route.path, studentId);
  const base = { path, auth: route.auth, hideLoading: LOADING_HIDE };

  const key = `${job.section}/${job.slug}/${job.region}`;
  const isMobile = viewportName === "mobile";

  /** @type {Record<string, Partial<CaptureTarget>>} */
  const map = {
    // —— parent-report ——
    "parent-report/report-overview/short-report": {
      selector: ".parent-report-print-summary-card >> nth=0",
      ancestorLevels: 1,
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/report-overview/detailed-report": {
      selector: "a:has-text('דוח מקיף לתקופה')",
      ancestorLevels: 2,
      minTextLength: 8,
      expandMobileClipTo: 320,
      afterGoto: waitParentReportReady,
      prepare: scrollHeadingIntoView("a:has-text('דוח מקיף לתקופה')"),
    },
    "parent-report/summary-card/summary": {
      selector: ".parent-report-print-summary-card >> nth=0",
      ancestorLevels: 1,
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/data-presence/low-data": {
      selector:
        ".border-amber-400\\/25, .parent-report-important-disclaimer",
      minTextLength: 8,
      afterGoto: waitParentReportReady,
    },
    "parent-report/trends-and-confidence/trend": {
      selector: ".parent-report-graph-section .parent-report-chart-card >> nth=0",
      minTextLength: 8,
      afterGoto: waitParentReportReady,
      prepare: scrollHeadingIntoView(".parent-report-graph-section .parent-report-chart-card"),
    },
    "parent-report/strengths-and-improvements/strengths": {
      selector: ":text-matches('איפה נראו תוצאות טובות|מה הכי בולט עכשיו')",
      ancestorLevels: 1,
      minTextLength: 10,
      afterGoto: waitParentReportReady,
    },
    "parent-report/topics-and-buckets/topics-table": {
      selector:
        viewportName === "mobile"
          ? "div.avoid-break:has(h2.parent-report-math-progress-title) div.bg-black\\/40.border.rounded-lg >> nth=0"
          : "div.avoid-break:has(h2.parent-report-math-progress-title)",
      minTextLength: 12,
      expandTabletClipTo: viewportName === "mobile" ? undefined : 420,
      expandDesktopClipTo: viewportName === "desktop" ? 420 : undefined,
      afterGoto: waitParentReportReady,
      prepare: scrollHeadingIntoView(".parent-report-math-progress-title"),
    },
    "parent-report/subjects-overview/six-subjects": {
      selector:
        ".grid.grid-cols-2.md\\:grid-cols-3:has(.parent-report-print-summary-card:has-text('חשבון'))",
      minTextLength: 12,
      afterGoto: waitParentReportReady,
    },
    "parent-report/recommendations/recommendations": {
      selector: isMobile
        ? ".parent-report-recommendations-print"
        : ".parent-report-recommendations-print .parent-report-rec-item >> nth=0",
      minTextLength: 12,
      afterGoto: waitParentReportReady,
      prepare: scrollHeadingIntoView("h2:has-text('המלצות')"),
    },
    "parent-report/challenges-section/challenges": {
      selector: ".bg-black\\/30.border:has(> h2:has-text('אתגרים'))",
      minTextLength: 16,
      expandMobileClipTo: 360,
      afterGoto: waitParentReportReady,
      prepare: scrollHeadingIntoView("h2:has-text('אתגרים')"),
    },
    "parent-report/detailed-report/letter": {
      selector: "#parent-report-detailed-print .pr-detailed-subject-block >> nth=0",
      minTextLength: 16,
      expandMobileClipTo: isMobile ? 380 : undefined,
      expandTabletClipTo: 420,
      expandDesktopClipTo: 480,
      afterGoto: waitParentReportDetailedReady,
      prepare: scrollHeadingIntoView("#parent-report-detailed-print .pr-detailed-subject-block"),
    },
    "parent-report/printing-and-pdf/pdf": {
      selector: "button:has-text('ייצא ל-PDF')",
      ancestorLevels: 2,
      minTextLength: 8,
      expandMobileClipTo: 220,
      expandTabletClipTo: 220,
      afterGoto: waitParentReportReady,
      prepare: async (page) => {
        const btn = page.locator("button:has-text('ייצא ל-PDF')").first();
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
      selector: "main h1",
      minTextLength: 12,
    },
    "parents/create-parent-account/login": {
      selector: "main form:has([placeholder='אימייל הורה'])",
      ancestorLevels: 1,
      minTextLength: 5,
      mustIncludeText: "כניסה",
      allowAttachedOnly: true,
      beforeGoto: clearAuthStorageForPublicLogin,
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
      selector: "section:has(h2:has-text('הילדים שלי')) button:has-text('איפוס PIN')",
      ancestorLevels: 1,
      minTextLength: 6,
      allowAttachedOnly: true,
      prepare: async (page) => {
        const pinBtn = page
          .locator("section:has(h2:has-text('הילדים שלי')) button:has-text('איפוס PIN')")
          .first();
        if (await pinBtn.count()) {
          await pinBtn.scrollIntoViewIfNeeded().catch(() => {});
          return;
        }
        const setPin = page
          .locator("section:has(h2:has-text('הילדים שלי')) button:has-text('הגדרת שם משתמש ו-PIN')")
          .first();
        if (await setPin.count()) {
          await setPin.scrollIntoViewIfNeeded().catch(() => {});
        }
      },
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
      selector: "main section >> nth=0",
      minTextLength: 12,
      prepare: async (page) => {
        const main = page.locator("main section").first();
        await main.waitFor({ state: "visible", timeout: 60_000 });
        await main.scrollIntoViewIfNeeded().catch(() => {});
      },
    },
    "parents/install-as-app/install-prompt": {
      selector: "button:has-text('התקן אפליקציה')",
      ancestorLevels: 2,
      minTextLength: 8,
      allowAttachedOnly: true,
      prepare: async (page) => {
        await page.evaluate(() => localStorage.removeItem("app-install-dismissed"));
        const btn = page.locator("button:has-text('התקן אפליקציה')").first();
        await btn.scrollIntoViewIfNeeded().catch(() => {});
      },
    },
    "parents/mobile-and-offline/offline-hub": {
      selector: "section.grid a[href^='/offline/'] >> nth=0",
      minTextLength: 10,
      allowAttachedOnly: true,
    },

    // —— students ——
    "students/student-login/login": {
      selector: "form:has([placeholder='שם משתמש'])",
      minTextLength: 6,
      allowAttachedOnly: true,
      beforeGoto: clearAuthStorageForPublicLogin,
    },
    "students/student-home-tour/home": {
      selector: "section.rounded-3xl.border-emerald-500\\/25",
      minTextLength: 16,
    },
    "students/choose-subject-and-grade/subjects": {
      selector: "section.grid.sm\\:grid-cols-3 > a >> nth=0",
      minTextLength: 10,
    },
    "students/answering-questions/question": {
      selector:
        '[data-testid$="-check-answer"], [data-testid*="-mcq-"], button:has-text("בדוק")',
      ancestorLevels: 2,
      minTextLength: 4,
      afterGoto: waitLearningQuestionReady,
    },
    "students/daily-missions/missions": {
      selector: "section[aria-labelledby='daily-missions-heading']",
      minTextLength: 8,
      afterGoto: waitStudentHomeReady,
      prepare: scrollHeadingIntoView("#daily-missions-heading"),
    },
    "students/monthly-persistence/persistence": {
      selector: "section[aria-labelledby='monthly-persistence-heading'], #monthly-persistence-heading",
      minTextLength: 6,
      afterGoto: waitStudentHomeReady,
      prepare: scrollHeadingIntoView("#monthly-persistence-heading"),
    },
    "students/coins-and-arcade/arcade": {
      selector: "h1:has-text('משחקים')",
      ancestorLevels: 1,
      minTextLength: 6,
      expandDesktopClipTo: 420,
    },
    "students/avatar-and-profile/avatar": {
      selector: "[role='dialog'][aria-labelledby='student-avatar-modal-title'] > div.max-w-md",
      minTextLength: 12,
      prepare: async (page) => {
        const btn = page.getByRole("button", { name: /בחירת אווטר/u }).first();
        await btn.waitFor({ state: "visible", timeout: 30_000 });
        await btn.click();
        await page.locator("#student-avatar-modal-title").waitFor({ state: "visible", timeout: 20_000 });
      },
    },
    "students/offline-games/offline": {
      selector: "a[href='/offline/memory-match']",
      ancestorLevels: 1,
      minTextLength: 10,
      expandMobileClipTo: 280,
    },

    // —— subjects (question + explanation share master URL) ——
    "subjects/*/question": {
      selector: '[data-testid$="-question-surface"]',
      minTextLength: 8,
      expandMobileClipTo: 300,
      expandTabletClipTo: 320,
      expandDesktopClipTo: 360,
      afterGoto: waitLearningQuestionReady,
    },
    "subjects/*/explanation": {
      selector: ".fixed.inset-0.z-\\[200\\] [class*='border-emerald-400'][class*='rounded-2xl']",
      minTextLength: 16,
      capDesktopClipHeight: 420,
      minDesktopClipWidth: 820,
      expandMobileClipTo: 400,
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

async function clearAuthStorageForPublicLogin(page) {
  await page.context().clearCookies().catch(() => {});
  if (!/^https?:/i.test(page.url())) return;
  await page
    .evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes("supabase") || k.includes("liosh") || k.includes("student"))) {
          keys.push(k);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
    })
    .catch(() => {});
}

async function waitParentReportDetailedReady(page) {
  await seedDetailedReportLocalStorage(page);
  if (new URL(page.url()).pathname.includes("parent-report-detailed")) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const block = page
    .locator(
      "#parent-report-detailed-print .pr-detailed-subject-letter, #parent-report-detailed-print .pr-detailed-subject-block, #parent-report-detailed-print .pr-detailed-summary-subject, #parent-report-detailed-print .pr-detailed-section",
    )
    .first();
  await block.scrollIntoViewIfNeeded().catch(() => {});
  await block.waitFor({ state: "visible", timeout: 90_000 });
  await page
    .locator("#parent-report-detailed-print")
    .waitFor({ state: "visible", timeout: 90_000 })
    .catch(() => {});
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
  await seedDetailedReportLocalStorage(page);
  const current = new URL(page.url());
  const studentId = current.searchParams.get("studentId");
  const link = page.getByRole("link", { name: /דוח מקיף לתקופה/i }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForURL(/parent-report-detailed/, { timeout: 90_000 });
  } else if (studentId) {
    const detailed = new URL("/learning/parent-report-detailed", current.origin);
    detailed.searchParams.set("studentId", studentId);
    detailed.searchParams.set("source", "parent");
    detailed.searchParams.set("period", "month");
    await page.goto(detailed.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  } else {
    throw new Error("cannot reach parent-report-detailed (no link or studentId)");
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await waitParentReportDetailedReady(page);
}

async function waitStudentHomeReady(page) {
  const path = new URL(page.url()).pathname;
  if (path !== "/student/home") {
    await page.goto(new URL("/student/home", page.url()).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function warmMasterFromHome(page) {
  const masterPath = new URL(page.url()).pathname;
  const homeUrl = new URL("/student/home", page.url()).toString();
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(600);
  await page.goto(new URL(masterPath, page.url()).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
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

  const nameNow = ((await playerName.innerText().catch(() => "")) || "").trim();
  if (!nameNow || nameNow === "שחקן") {
    await warmMasterFromHome(page);
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

  const gradeSelect = page.locator('[data-testid$="-grade-select"]').first();
  if (await gradeSelect.count()) {
    const gradeVal = await gradeSelect.inputValue().catch(() => "");
    if (!gradeVal) {
      const options = await gradeSelect.locator("option").all();
      for (const opt of options) {
        const v = (await opt.getAttribute("value"))?.trim();
        if (v) {
          await gradeSelect.selectOption({ value: v });
          break;
        }
      }
    }
  }

  const operationSelect = page.locator('[data-testid$="-operation-select"]').first();
  if (await operationSelect.count()) {
    const opVal = await operationSelect.inputValue().catch(() => "");
    if (!opVal) {
      const options = await operationSelect.locator("option").all();
      for (const opt of options) {
        const v = (await opt.getAttribute("value"))?.trim();
        if (v) {
          await operationSelect.selectOption({ value: v });
          break;
        }
      }
    }
  }

  const topicSelect = page.locator('[data-testid$="-topic-select"]').first();
  if (await topicSelect.count()) {
    const topicVal = await topicSelect.inputValue().catch(() => "");
    if (!topicVal) {
      const options = await topicSelect.locator("option").all();
      for (const opt of options) {
        const v = (await opt.getAttribute("value"))?.trim();
        if (v) {
          await topicSelect.selectOption({ value: v });
          break;
        }
      }
    }
  }

  const start = page.locator('[data-testid$="-start-game"]').first();
  if (await start.count()) {
    await start.waitFor({ state: "visible", timeout: 30_000 });
    for (let i = 0; i < 60; i++) {
      if (await start.isEnabled().catch(() => false)) break;
      await page.waitForTimeout(500);
    }
    if (!(await start.isEnabled().catch(() => false))) {
      throw new Error("start-game button visible but still disabled (player name or grade?)");
    }
    await start.click({ timeout: 15_000 });
    await page.waitForTimeout(2000);
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

  const check = page
    .locator('[data-testid$="-check-answer"], button:has-text("בדוק")')
    .first();
  const mcq = page.locator('[data-testid*="-mcq-"]').first();
  if (await check.count()) {
    await check.waitFor({ state: "visible", timeout: 60_000 });
  } else if (await mcq.count()) {
    await mcq.waitFor({ state: "visible", timeout: 60_000 });
  } else {
    await page
      .getByRole("button", { name: /בדוק/u })
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
  }
  await page.waitForTimeout(400);
}

async function openFullExplanationModal(page) {
  const explainBtn = page
    .locator("button")
    .filter({ hasText: /הסבר מלא|צעד-צעד/i })
    .first();
  await explainBtn.waitFor({ state: "visible", timeout: 60_000 });
  await explainBtn.scrollIntoViewIfNeeded().catch(() => {});
  await explainBtn.click({ timeout: 15_000 });
  await page
    .locator(
      ".fixed.inset-0 h3, .fixed.inset-0 h4, h3:has-text('איך פותרים'), h3:has-text('פתרון')"
    )
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(500);
}
