/**
 * Learning flow helpers — math/geometry practice, answers, step-by-step modal.
 */

export async function confirmMixedModal(page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    const allBtn = page.getByRole("button", { name: "הכל", exact: true });
    if (await allBtn.isVisible().catch(() => false)) {
      await allBtn.click();
    }
    await save.click();
    await page.waitForTimeout(400);
  }
}

export async function dismissTheoryHelpIfOpen(page) {
  const closeBtn = page.getByRole("button", { name: /סגור|×/ }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

function learningUrl(baseUrl, path) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${rel}` : rel;
}

export async function startMathLearning(page, { operation = "addition", grade = "3", baseUrl } = {}) {
  await page.goto(learningUrl(baseUrl, "/learning/math-master"), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  await confirmMixedModal(page);

  const gradeSelect = page.getByTestId("math-grade-select");
  if (await gradeSelect.isVisible().catch(() => false)) {
    await gradeSelect.selectOption(String(grade));
  }
  const opSelect = page.getByTestId("math-operation-select");
  if (await opSelect.isVisible().catch(() => false)) {
    await opSelect.selectOption(operation);
    await confirmMixedModal(page);
  }

  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="math-start-game"]');
      const name = document.querySelector('[data-testid="math-player-name"]');
      return btn && !btn.disabled && name && (name.textContent || "").trim().length > 1;
    },
    undefined,
    { timeout: 90_000 }
  );
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(600);
}

export async function pickGeometryTopicWithDiagram(page) {
  const topicSelect = page.getByTestId("geometry-topic-select");
  await topicSelect.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const sel = document.querySelector('[data-testid="geometry-topic-select"]');
      return sel && sel.options && sel.options.length > 2;
    },
    undefined,
    { timeout: 60_000 }
  );
  const optionCount = await topicSelect.evaluate((el) => el.options.length);

  for (let idx = 1; idx < optionCount; idx++) {
    await page.evaluate((i) => {
      const sel = document.querySelector('[data-testid="geometry-topic-select"]');
      if (!sel?.options?.[i]) return;
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }, idx);
    await page.waitForTimeout(400);
    await confirmMixedModal(page);
    await page.getByTestId("geometry-start-game").click();
    try {
      await page.getByTestId("geometry-question-stem").waitFor({ state: "visible", timeout: 25_000 });
      const hasDiagram = await page.evaluate(() => {
        const stem = document.querySelector('[data-testid="geometry-question-stem"]');
        if (!stem) return false;
        return !!stem.querySelector("svg, canvas, img");
      });
      if (hasDiagram) return `index-${idx}`;
    } catch {
      /* try next topic */
    }
    await page.getByTestId("learning-stop-game").click().catch(() => {});
    await page.waitForTimeout(400);
    await topicSelect.waitFor({ state: "visible", timeout: 30_000 });
  }

  await page.evaluate(() => {
    const sel = document.querySelector('[data-testid="geometry-topic-select"]');
    if (sel?.options?.[1]) {
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.waitForTimeout(400);
  await confirmMixedModal(page);
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="geometry-start-game"]');
      return btn && !btn.disabled;
    },
    undefined,
    { timeout: 90_000 }
  );
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ state: "visible", timeout: 60_000 });
  return "index-1-fallback";
}

export async function startGeometryLearning(page, { preferDiagram = true, baseUrl } = {}) {
  await page.goto(learningUrl(baseUrl, "/learning/geometry-master"), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  await confirmMixedModal(page);

  if (preferDiagram) {
    return pickGeometryTopicWithDiagram(page);
  }

  const topicSelect = page.getByTestId("geometry-topic-select");
  const values = await topicSelect.evaluate((el) =>
    [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
  );
  const topic = values[0] || "area";
  await topicSelect.selectOption(topic);
  await confirmMixedModal(page);
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ state: "visible", timeout: 60_000 });
  return topic;
}

async function inferMathCorrectAnswer(page) {
  const surface = page.getByTestId("math-question-surface");
  const text = await surface.innerText().catch(() => "");
  const normalized = text.replace(/\s+/g, " ").trim();

  const add = normalized.match(/(\d+)\s*[+＋]\s*(\d+)/);
  if (add) return String(Number(add[1]) + Number(add[2]));

  const sub = normalized.match(/(\d+)\s*[-−]\s*(\d+)/);
  if (sub) return String(Number(sub[1]) - Number(sub[2]));

  const mul = normalized.match(/(\d+)\s*[×x*]\s*(\d+)/i);
  if (mul) return String(Number(mul[1]) * Number(mul[2]));

  const div = normalized.match(/(\d+)\s*[÷/:]\s*(\d+)/);
  if (div && Number(div[2]) !== 0) return String(Math.floor(Number(div[1]) / Number(div[2])));

  const eq = normalized.match(/=\s*(\?|…|\.\.\.)/);
  if (eq) {
    const expr = normalized.replace(/=\s*(\?|…|\.\.\.).*$/, "").trim();
    if (/^[\d+\-×x*÷/:().\s]+$/.test(expr)) {
      const safe = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/x/gi, "*");
      try {
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${safe})`)();
        if (Number.isFinite(val)) return String(Math.round(val));
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function submitMathAnswer(page, value) {
  const surface = page.getByTestId("math-question-surface");
  const textInput = page.getByTestId("math-text-answer");
  if (await textInput.isVisible().catch(() => false)) {
    await textInput.click({ force: true });
    await textInput.fill(String(value));
    await page.waitForTimeout(200);
    const check = page.getByTestId("math-check-answer");
    await check.waitFor({ state: "visible", timeout: 10_000 });
    if (await check.isEnabled().catch(() => false)) {
      await check.click();
      return;
    }
    await textInput.press("Enter");
    return;
  }

  const mcqButtons = surface.locator("button").filter({
    hasNotText: /בדוק|צעד|רמז|הבא|טבלה|שאלה|הצג/,
  });
  const count = await mcqButtons.count();
  for (let i = 0; i < count; i++) {
    const btn = mcqButtons.nth(i);
    const label = (await btn.innerText()).trim();
    if (label && String(label) === String(value)) {
      await btn.click({ force: true });
      return;
    }
  }
  if (count > 0) await mcqButtons.first().click({ force: true });
}

export async function answerMath(page, { correct = true } = {}) {
  await page.getByTestId("math-question-surface").waitFor({ state: "visible", timeout: 30_000 });
  const textInput = page.getByTestId("math-text-answer");
  const hasText = await textInput.isVisible().catch(() => false);

  if (correct && hasText) {
    let answer = await inferMathCorrectAnswer(page);
    if (answer == null) {
      for (const guess of ["10", "12", "15", "20", "8", "6", "4", "2"]) {
        await submitMathAnswer(page, guess);
        await page.waitForTimeout(900);
        const body = await page.locator("body").innerText();
        if (body.includes("נכון") || body.includes("מצוין")) return;
        if (!body.includes("לא נכון")) return;
      }
      return;
    }
    await submitMathAnswer(page, answer);
    await page.waitForTimeout(1200);
    return;
  }

  if (!correct && hasText) {
    await submitMathAnswer(page, "999999");
    await page.waitForTimeout(1800);
    return;
  }

  if (correct) {
    const surface = page.getByTestId("math-question-surface");
    const mcq = surface.locator("button").filter({ hasNotText: /בדוק|צעד|רמז|הבא|טבלה/ });
    const n = await mcq.count();
    for (let i = 0; i < n; i++) {
      await mcq.nth(i).click({ force: true });
      await page.waitForTimeout(900);
      const body = await page.locator("body").innerText();
      if (body.includes("נכון") || body.includes("מצוין")) return;
    }
  } else {
    const mcq0 = page.getByTestId("math-question-surface").locator("button").first();
    if (await mcq0.isVisible().catch(() => false)) await mcq0.click({ force: true });
  }
  await page.waitForTimeout(1500);
}

export async function answerGeometry(page, { correct = true } = {}) {
  await page.getByTestId("geometry-question-stem").waitFor({ state: "visible", timeout: 30_000 });

  if (correct) {
    for (let idx = 0; idx < 6; idx++) {
      const mcq = page.getByTestId(`geometry-mcq-${idx}`);
      if (!(await mcq.isVisible().catch(() => false))) continue;
      const before = await page.getByTestId("geometry-question-stem").innerText();
      await mcq.scrollIntoViewIfNeeded().catch(() => {});
      await mcq.click({ force: true });
      await page.waitForTimeout(1200);
      const body = await page.locator("body").innerText();
      if (body.includes("נכון") || body.includes("Correct") || body.includes("🎉")) return;
      const after = await page.getByTestId("geometry-question-stem").innerText().catch(() => before);
      if (after !== before && !body.includes("Wrong") && !body.includes("לא נכון")) return;
    }
    const textInput = page.getByTestId("geometry-text-answer");
    if (await textInput.isVisible().catch(() => false)) {
      await textInput.fill("1");
      const checkBtn = page.getByRole("button", { name: /בדוק/ }).first();
      if (await checkBtn.isVisible().catch(() => false)) await checkBtn.click({ force: true });
    }
  } else {
    const textInput = page.getByTestId("geometry-text-answer");
    if (await textInput.isVisible().catch(() => false)) {
      await textInput.fill("wrong-guess");
      await page.getByRole("button", { name: /בדוק תשובה/ }).click();
    } else {
      const mcq0 = page.getByTestId("geometry-mcq-0");
      if (await mcq0.isVisible().catch(() => false)) await mcq0.click({ force: true });
    }
  }
  await page.waitForTimeout(1500);
}

export async function openStepExplanation(page) {
  const btn = page.getByRole("button", { name: /צעד-צעד/ }).first();
  await btn.waitFor({ state: "visible", timeout: 20_000 });
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click();
  await page.waitForTimeout(800);
}

export async function verifyExplanationOpen(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || "";
    const hasStepNav = /צעד\s+\d+\s+מתוך/i.test(text);
    const hasModal = !!document.querySelector('[class*="modal"], [role="dialog"]') ||
      text.includes("הסבר") ||
      text.includes("צעד");
    const titles = [...document.querySelectorAll("h2, h3, h4, strong, .font-bold")]
      .map((el) => (el.textContent || "").trim())
      .filter((t) => t.length > 2 && t.length < 80);
    const uniqueTitles = new Set(titles).size;
    return {
      ok: hasModal && (hasStepNav || uniqueTitles >= 2),
      hasStepNav,
      uniqueTitles,
      hasDiagram: !!document.querySelector("svg, canvas"),
    };
  });
}

export async function waitForMathFeedback(page, { expectCorrect = null, timeout = 15_000 } = {}) {
  await page.waitForFunction(
    (wantCorrect) => {
      const t = document.body?.innerText || "";
      if (wantCorrect === true) return t.includes("נכון");
      if (wantCorrect === false) return t.includes("לא נכון") || t.includes("Wrong");
      return t.includes("נכון") || t.includes("לא נכון") || t.includes("Wrong");
    },
    expectCorrect,
    { timeout }
  );
}

export async function answerMultipleMathCorrect(page, count = 3) {
  for (let i = 0; i < count; i++) {
    await answerMath(page, { correct: true });
    await waitForMathFeedback(page, { expectCorrect: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

export async function scrollToText(page, text, { mobile = false } = {}) {
  await page.evaluate((needle) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.includes(needle)) {
        walker.currentNode.parentElement?.scrollIntoView({ behavior: "instant", block: "center" });
        return;
      }
    }
    window.scrollBy(0, window.innerHeight * 0.75);
  }, text);
  await page.waitForTimeout(mobile ? 600 : 400);
}

export async function briefArcadeSample(page, baseUrl) {
  await page.goto(`${baseUrl}/student/arcade`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("משחקים") && !t.includes("animate-pulse");
    },
    undefined,
    { timeout: 60_000 }
  ).catch(() => {});
  await page.waitForTimeout(800);

  const quickBtn = page.getByRole("button", { name: /משחק מהיר/ }).first();
  if (await quickBtn.isVisible().catch(() => false)) {
    await quickBtn.scrollIntoViewIfNeeded().catch(() => {});
    await quickBtn.click();
    await page.waitForTimeout(4000);
  }
}

export async function peekSubjectMaster(page, slug, holdMs = 2500, baseUrl) {
  await page.goto(learningUrl(baseUrl, `/learning/${slug}`), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(holdMs);
}

export async function gotoLearningHub(page, baseUrl) {
  await page.goto(`${baseUrl}/learning`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
}

export const SUBJECT_SLUGS = [
  "math-master",
  "geometry-master",
  "hebrew-master",
  "english-master",
  "science-master",
  "moledet-geography-master",
];

export const SUBJECT_LABELS = [
  "חשבון",
  "גיאומטריה",
  "עברית",
  "אנגלית",
  "מדעים",
  "מולדת וגיאוגרפיה",
];
