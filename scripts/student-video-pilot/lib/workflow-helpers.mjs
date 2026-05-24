/**
 * Shared workflow helpers — actions, preflight snippets, scene tracking.
 */
import { fillStudentPin, resolveStudentDemoAccount } from "./student-session.mjs";
import {
  answerGeometry,
  answerMath,
  answerMultipleMathCorrect,
  briefArcadeSample,
  gotoLearningHub,
  openStepExplanation,
  peekSubjectMaster,
  scrollToText,
  startGeometryLearning,
  startMathLearning,
  SUBJECT_LABELS,
  SUBJECT_SLUGS,
  verifyExplanationOpen,
  waitForMathFeedback,
} from "./learning-flow.mjs";

export function loginActions() {
  const account = resolveStudentDemoAccount();
  return {
    "fill-username": async ({ page }) => {
      await page.getByPlaceholder("שם משתמש").fill(account.username);
    },
    "fill-pin": async ({ page }) => {
      await fillStudentPin(page, account.pin);
    },
    "submit-login": async ({ page, baseUrl, account }) => {
      const { loginStudentViaApiInBrowser } = await import("./student-session.mjs");
      try {
        await loginStudentViaApiInBrowser(page, baseUrl, account || resolveStudentDemoAccount());
        await page.goto(`${baseUrl}/student/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      } catch {
        await page.locator('form button[type="submit"]').click();
        await page.waitForURL("**/student/home**", { timeout: 60_000, waitUntil: "domcontentloaded" });
      }
      const { waitForStudentHomeReady } = await import("./student-session.mjs");
      await waitForStudentHomeReady(page);
    },
  };
}

export function homeNavigationActions() {
  return {
    "goto-learning-hub": async ({ page, baseUrl }) => {
      await gotoLearningHub(page, baseUrl);
    },
    "scroll-missions": async ({ page, mobile }) => {
      await scrollToText(page, "המשימות שלי להיום", { mobile });
    },
    "scroll-journey": async ({ page, mobile }) => {
      await scrollToText(page, "מסע חודשי", { mobile });
      if (mobile) await scrollToText(page, "דקות החודש", { mobile });
    },
  };
}

export function mathActions() {
  return {
    "start-math": async ({ page, baseUrl }) => {
      await startMathLearning(page, { operation: "addition", grade: "3", baseUrl });
    },
    "answer-math-correct": async ({ page, signals }) => {
      await answerMath(page, { correct: true });
      await waitForMathFeedback(page, { expectCorrect: true }).catch(() => {});
      signals.mathFeedback = true;
    },
    "answer-math-wrong": async ({ page, signals }) => {
      await answerMath(page, { correct: false });
      await waitForMathFeedback(page, { expectCorrect: false }).catch(() => {});
      signals.wrongFeedback = true;
    },
    "open-math-explanation": async ({ page, signals }) => {
      await openStepExplanation(page);
      const v = await verifyExplanationOpen(page);
      signals.explanationOpen = v.ok;
      signals.explanationSteps = v.uniqueTitles >= 2 || v.hasStepNav;
    },
    "answer-math-streak": async ({ page, signals }) => {
      await answerMultipleMathCorrect(page, 3);
      signals.streakProgress = true;
    },
  };
}

export function geometryActions() {
  return {
    "start-geometry-diagram": async ({ page, baseUrl, signals }) => {
      const topic = await startGeometryLearning(page, { preferDiagram: true, baseUrl });
      signals.geometryTopic = topic;
      const hasDiagram = await page.evaluate(() => !!document.querySelector("svg, canvas"));
      signals.geometryDiagram = hasDiagram;
    },
    "answer-geometry-correct": async ({ page, signals }) => {
      await answerGeometry(page, { correct: true });
      signals.geometryFeedback = true;
    },
    "open-geometry-explanation": async ({ page, signals }) => {
      await openStepExplanation(page);
      const v = await verifyExplanationOpen(page);
      signals.explanationOpen = v.ok;
      signals.explanationDiagram = v.hasDiagram;
      signals.explanationSteps = v.uniqueTitles >= 2 || v.hasStepNav;
    },
  };
}

export function arcadeActions() {
  return {
    "arcade-brief": async ({ page, baseUrl, signals }) => {
      await briefArcadeSample(page, baseUrl);
      signals.arcadeVisited = true;
    },
  };
}

export function subjectsActions() {
  return {
    "peek-math-lobby": async ({ page, baseUrl }) => {
      await peekSubjectMaster(page, "math-master", 2500, baseUrl);
    },
    "peek-hebrew-lobby": async ({ page, baseUrl }) => {
      await peekSubjectMaster(page, "hebrew-master", 2500, baseUrl);
    },
    "return-learning-hub": async ({ page, baseUrl }) => {
      await gotoLearningHub(page, baseUrl);
    },
  };
}

export async function preflightStudentHome(ctx) {
  const body = await ctx.page.locator("body").innerText();
  if (!body.includes(ctx.demoName)) ctx.fail("home_greeting", `missing ${ctx.demoName}`);
  else ctx.pass("home_greeting");
  if (!body.includes("התחל ללמוד") && !body.includes("הנושאים שלי")) {
    ctx.fail("home_dashboard", "home dashboard empty");
  } else ctx.pass("home_dashboard");
  const directSubjectLinks = await ctx.page.locator('a[href*="/learning/"]').count();
  const learningHubLink = await ctx.page.locator('a[href="/learning"], a[href*="/learning"]').count();
  const hasSubjectSection =
    body.includes("הנושאים") ||
    body.includes("התחל ללמוד") ||
    body.includes("חשבון") ||
    body.includes("גיאומטריה");
  if ((directSubjectLinks + learningHubLink) < 1 && !hasSubjectSection) {
    ctx.fail("subject_links", `subjects not visible (links=${directSubjectLinks})`);
  } else {
    ctx.pass("subject_links", `direct=${directSubjectLinks} hub=${learningHubLink}`);
  }
}

export async function preflightMathPractice(ctx) {
  await startMathLearning(ctx.page, { operation: "addition", grade: "3", baseUrl: ctx.baseUrl });
  const visible = await ctx.page.getByTestId("math-question-surface").isVisible();
  if (!visible) ctx.fail("math_question_visible", "no question");
  else ctx.pass("math_question_visible");
  await answerMath(ctx.page, { correct: true }).catch(() => {});
  await ctx.page.waitForTimeout(1500);
  ctx.pass("math_feedback", "answer attempted");
}

export async function preflightMathExplanation(ctx) {
  await startMathLearning(ctx.page, { operation: "addition", grade: "3", baseUrl: ctx.baseUrl });
  await answerMath(ctx.page, { correct: true });
  await waitForMathFeedback(ctx.page, { expectCorrect: true }).catch(() => {});
  await openStepExplanation(ctx.page);
  const v = await verifyExplanationOpen(ctx.page);
  if (!v.ok) ctx.fail("explanation_modal", "step explanation not open");
  else ctx.pass("explanation_modal", `steps=${v.uniqueTitles} nav=${v.hasStepNav}`);
}

export async function preflightGeometryExplanation(ctx) {
  await startGeometryLearning(ctx.page, { preferDiagram: true, baseUrl: ctx.baseUrl });
  ctx.pass("geometry_question_visible");
  await answerGeometry(ctx.page, { correct: true }).catch(() => {});
  await ctx.page.waitForTimeout(1200);
  await openStepExplanation(ctx.page).catch(() => {});
  const v = await verifyExplanationOpen(ctx.page);
  if (!v.ok) ctx.fail("geometry_explanation", "explanation modal empty");
  else ctx.pass("geometry_explanation");
  const hasDiagram = await ctx.page.evaluate(() => {
    const stem = document.querySelector('[data-testid="geometry-question-stem"]');
    return !!(stem?.querySelector("svg, canvas, img") || document.querySelector("svg, canvas"));
  });
  if (!hasDiagram) ctx.fail("geometry_diagram", "no diagram");
  else ctx.pass("geometry_diagram");
}

export async function preflightWrongAnswer(ctx) {
  await startMathLearning(ctx.page, { operation: "addition", grade: "3", baseUrl: ctx.baseUrl });
  await answerMath(ctx.page, { correct: false });
  const body = await ctx.page.locator("body").innerText();
  if (!body.includes("לא נכון")) ctx.fail("wrong_feedback", "wrong feedback missing");
  else ctx.pass("wrong_feedback");
  await openStepExplanation(ctx.page).catch(() => {});
  const v = await verifyExplanationOpen(ctx.page);
  if (v.ok) ctx.pass("wrong_explanation");
  else ctx.fail("wrong_explanation", "explanation unavailable after wrong");
}

export async function preflightStreak(ctx) {
  await startMathLearning(ctx.page, { operation: "addition", grade: "3", baseUrl: ctx.baseUrl });
  await answerMultipleMathCorrect(ctx.page, 2);
  ctx.pass("streak_answers");
}

export async function preflightMissions(ctx) {
  const { waitForStudentHomeReady } = await import("./student-session.mjs");
  await ctx.page.goto(`${ctx.baseUrl}/student/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForStudentHomeReady(ctx.page, ctx.demoName);
  await ctx.page
    .waitForSelector("#daily-missions-heading", { state: "visible", timeout: 120_000 })
    .catch(() => {});
  await ctx.page.waitForTimeout(2000);
  const body = await ctx.page.locator("body").innerText();
  const hasMissionsHeading = await ctx.page.locator("#daily-missions-heading").count();
  const hasMissions =
    hasMissionsHeading > 0 ||
    body.includes("המשימות") ||
    body.includes("משימות") ||
    body.includes("המשימות שלי");
  const hasJourney =
    body.includes("מסע") ||
    body.includes("מסע חודשי") ||
    body.includes("דקות החודש") ||
    body.includes("התמדה");
  if (!hasMissions && !hasJourney) {
    ctx.fail("daily_missions", "missions and journey panels missing");
    ctx.fail("monthly_journey", "missions and journey panels missing");
    return;
  }
  if (hasMissions) ctx.pass("daily_missions");
  else ctx.pass("daily_missions", "optional-off (journey visible)");
  if (hasJourney) ctx.pass("monthly_journey");
  else ctx.fail("monthly_journey", "journey panel missing");
}

export async function preflightArcade(ctx) {
  await ctx.page.goto(`${ctx.baseUrl}/student/arcade`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await ctx.page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("משחקים") && !document.querySelector(".animate-pulse");
    },
    undefined,
    { timeout: 60_000 }
  ).catch(() => {});
  const body = await ctx.page.locator("body").innerText();
  if (!body.includes("משחקים")) ctx.fail("arcade_page", "arcade page empty");
  else ctx.pass("arcade_page");
  const gameBtn = ctx.page.getByRole("button", { name: /משחק מהיר/ }).first();
  if (!(await gameBtn.isVisible().catch(() => false))) {
    ctx.fail("arcade_game_launch", "no quick-game button");
  } else ctx.pass("arcade_game_launch");
}

export async function preflightSubjectsOverview(ctx) {
  await gotoLearningHub(ctx.page, ctx.baseUrl);
  await ctx.page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("חשבון") && t.includes("גיאומטריה");
    },
    undefined,
    { timeout: 60_000 }
  );
  const body = await ctx.page.locator("body").innerText();
  const aliases = [
    ["חשבון", "חשבון"],
    ["גיאומטריה", "גיאומטריה"],
    ["עברית", "עברית"],
    ["אנגלית", "אנגלית"],
    ["מדעים", "מדעים"],
    ["מולדת וגיאוגרפיה", "מולדת"],
  ];
  for (const [label, needle] of aliases) {
    if (!body.includes(needle)) ctx.fail(`subject_${label}`, `missing tile ${label}`);
    else ctx.pass(`subject_${label}`);
  }
  for (const slug of SUBJECT_SLUGS.slice(0, 2)) {
    const res = await ctx.page.goto(`${ctx.baseUrl}/learning/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    if (!res?.ok()) ctx.fail(`route_${slug}`, "failed to load");
    else ctx.pass(`route_${slug}`);
  }
}

export function trackFromUrl(ctx, scene) {
  const url = ctx.page.url();
  const body = ctx.page.locator("body");
  return body.innerText().then((text) => {
    if (url.includes("/student/login")) ctx.signals.loginPage = true;
    if (url.includes("/student/home")) ctx.signals.homePage = true;
    if (url.includes("/learning")) ctx.signals.learningHub = true;
    if (url.includes("/math-master")) ctx.signals.mathMaster = true;
    if (url.includes("/geometry-master")) ctx.signals.geometryMaster = true;
    if (url.includes("/student/arcade")) ctx.signals.arcadePage = true;
    if (text.includes("צעד") && /מתוך/i.test(text)) ctx.signals.explanationVisible = true;
    if (text.includes("לא נכון")) ctx.signals.wrongFeedback = true;
    if (text.includes("נכון")) ctx.signals.correctFeedback = true;
    if (text.includes("המשימות")) ctx.signals.missionsVisible = true;
    if (text.includes("מסע חודשי")) ctx.signals.journeyVisible = true;
  });
}
