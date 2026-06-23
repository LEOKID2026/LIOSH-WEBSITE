import { chromium } from "@playwright/test";

const grades = [
  ["g1", "כיתה א"],
  ["g2", "כיתה ב"],
  ["g3", "כיתה ג"],
  ["g4", "כיתה ד"],
  ["g5", "כיתה ה"],
  ["g6", "כיתה ו"],
];

const topicsByGrade = {
  g1: ["חיבור", "חיסור", "כפל", "השוואה", "חוש מספרים", "בעיות מילוליות"],
  g2: ["חיבור", "חיסור", "כפל", "חילוק", "שברים", "השוואה", "חוש מספרים", "בעיות מילוליות"],
  g3: ["חיבור", "חיסור", "כפל", "חילוק", "חילוק עם שארית", "שברים", "סדר פעולות", "בעיות מילוליות"],
  g4: ["חזקות", "גורמים וכפולות", "אומדן", "חילוק עם שארית", "שברים", "בעיות מילוליות"],
  g5: ["אחוזים", "שברים", "עשרוניים", "אומדן", "בעיות מילוליות"],
  g6: ["יחס", "קנה מידה", "אחוזים", "שברים", "בעיות מילוליות"],
};

const sensitive = {
  "שברים": 0,
  "יחס": 0,
  "קנה מידה": 0,
  "סדר פעולות": 0,
  "אחוזים": 0,
  "בעיות מילוליות": 0,
  "חילוק עם שארית": 0,
};

const sensitiveGrade = {
  "שברים": ["g3", "כיתה ג"],
  "יחס": ["g6", "כיתה ו"],
  "קנה מידה": ["g6", "כיתה ו"],
  "סדר פעולות": ["g3", "כיתה ג"],
  "אחוזים": ["g6", "כיתה ו"],
  "בעיות מילוליות": ["g6", "כיתה ו"],
  "חילוק עם שארית": ["g3", "כיתה ג"],
};

const byGrade = Object.fromEntries(grades.map(([g]) => [g, 0]));
const findings = [];
const samples = [];
const gradeTarget = Number(process.env.MATH_UI_GRADE_TARGET || 6);
const sensitiveTarget = Number(process.env.MATH_UI_SENSITIVE_TARGET || 5);

function visibleQuestionSlice(text) {
  return text.split("\n").slice(-22).join(" | ").slice(0, 650);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    baseURL: "http://127.0.0.1:3002",
    locale: "he-IL",
    viewport: { width: 1366, height: 768 },
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);

  await page.goto("/student/login?next=%2Flearning%2Fmath-master", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.getByTestId("student-login-username").fill("AAA6");
  await page.getByTestId("student-login-pin").fill("1234");
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/learning\/math-master/, { timeout: 120000 });
  await page.waitForTimeout(3000);

  async function clickText(text) {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exact = page.getByRole("button", { name: new RegExp(`^${escaped}$`) });
    if (await exact.count()) {
      await exact.first().click();
      await page.waitForTimeout(350);
      return true;
    }
    const exactText = page.locator("button").filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
    if (await exactText.count()) {
      await exactText.first().click();
      await page.waitForTimeout(350);
      return true;
    }
    return false;
  }

  async function ensureStopped() {
    await page.keyboard.press("Escape").catch(() => {});
    const closeButtons = page.locator("button").filter({ hasText: /^(✖|סגירה)$/ });
    for (let i = 0; i < Math.min(await closeButtons.count(), 3); i += 1) {
      await closeButtons.nth(i).click().catch(() => {});
      await page.waitForTimeout(150);
    }
    const stop = page.getByRole("button", { name: /עצור/ });
    if (await stop.count()) {
      await stop.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  async function oneSample(gradeKey, gradeLabel, topic) {
    await ensureStopped();
    await clickText(gradeLabel);
    await clickText("למידה");
    const topicOk = await clickText(topic);
    if (!topicOk) {
      findings.push({ grade: gradeKey, topic, issue: "topic button not found" });
      return;
    }
    await page.getByRole("button", { name: /התחל/ }).click();
    await page.waitForTimeout(850);
    const before = await page.locator("body").innerText({ timeout: 20000 }).catch((e) => `ERR ${e.message}`);
    const inputModes = await page.locator("input").evaluateAll((els) =>
      els.map((e) => e.getAttribute("inputmode") || e.getAttribute("type") || "")
    ).catch(() => []);
    const bad =
      /undefined|null|NaN|Internal Server Error|Unhandled Runtime Error|404This page could not be found/.test(before) ||
      before.includes("חשבון");
    if (bad) findings.push({ grade: gradeKey, topic, issue: "bad visible text", body: before.slice(0, 500) });
    byGrade[gradeKey] += 1;
    if (Object.prototype.hasOwnProperty.call(sensitive, topic)) sensitive[topic] += 1;
    samples.push({ grade: gradeKey, topic, inputModes, body: visibleQuestionSlice(before) });
    if (samples.length % 10 === 0) {
      console.error(`UI_SAMPLE_PROGRESS ${samples.length}`);
    }

    const input = page.locator("input").first();
    if (await input.count()) {
      await input.fill("0").catch(() => {});
    }
    const check = page.getByRole("button", { name: /בדוק/ });
    if (await check.count()) {
      await check.first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await ensureStopped();
  }

  for (const [gradeKey, gradeLabel] of grades) {
    const topics = topicsByGrade[gradeKey];
    for (let i = 0; i < gradeTarget; i += 1) {
      await oneSample(gradeKey, gradeLabel, topics[i % topics.length]);
    }
  }

  for (const topic of Object.keys(sensitive)) {
    const [gradeKey, gradeLabel] = sensitiveGrade[topic];
    while (sensitive[topic] < sensitiveTarget) {
      await oneSample(gradeKey, gradeLabel, topic);
    }
  }

  await page.screenshot({ path: "qa/screenshots/math-reaudit-ui-sampling-final.png", fullPage: true }).catch(() => {});
  await browser.close();
  console.log(JSON.stringify({ byGrade, sensitive, total: samples.length, findings, samplePreview: samples.slice(0, 12) }, null, 2));
}

await main();
