/**
 * Visual QA — read question surface, grade verification, screenshots.
 */

import { compact, analyzeSample, dedupeRepeatedStem } from "./visual-qa-analyze.mjs";

const MCQ_PREFIX_BY_SUBJECT = {
  math: "math-mcq-",
  geometry: "geometry-mcq-",
  hebrew: "hebrew-mcq-",
  english: "english-mcq-",
  science: "science-mcq-",
  moledet: "moledet-mcq-",
};

export async function waitForQuestionSurface(page, subject, timeoutMs = 60_000) {
  await page
    .getByTestId("learning-stop-game")
    .waitFor({ state: "visible", timeout: timeoutMs })
    .catch(() => {});

  await page.waitForFunction(
    ({ subject }) => {
      const readText = (sel) => {
        const el = document.querySelector(`[data-testid="${sel}"]`);
        return (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
      };

      if (readText("student-question-body").length > 2) return true;
      if (readText("student-question-lead").length > 2) return true;
      if (readText(`${subject}-question-stem`).length > 2) return true;

      const numericIds = { math: "math-text-answer", geometry: "geometry-text-answer" };
      const numId = numericIds[subject];
      if (numId) {
        const input = document.querySelector(`[data-testid="${numId}"]`);
        if (input && !input.disabled) {
          const rect = input.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
        }
      }

      const prefixes = {
        math: "math-mcq-",
        geometry: "geometry-mcq-",
        hebrew: "hebrew-mcq-",
        english: "english-mcq-",
      };
      const prefix = prefixes[subject];
      if (prefix) {
        for (let i = 0; i < 8; i += 1) {
          const btn = document.querySelector(`[data-testid="${prefix}${i}"]`);
          if (!btn || btn.disabled) continue;
          const rect = btn.getBoundingClientRect();
          const label = (btn.innerText || btn.textContent || "").trim();
          if (rect.width > 0 && rect.height > 0 && label) return true;
        }
      }
      return false;
    },
    { subject },
    { timeout: timeoutMs }
  );
}

export async function dismissBlockingUi(page, { stopActiveGame = false } = {}) {
  await page.keyboard.press("Escape").catch(() => {});
  if (stopActiveGame) {
    const stop = page.getByTestId("learning-stop-game");
    if (await stop.isVisible().catch(() => false)) {
      await stop.click().catch(() => {});
      await page.waitForTimeout(400);
    }
  }
  const continuePractice = page.getByTestId("hebrew-g1-book-first-continue-practice");
  if (await continuePractice.isVisible().catch(() => false)) {
    await continuePractice.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

function playerShellTimeoutMs() {
  const raw = Number(process.env.VISUAL_QA_PLAYER_SHELL_TIMEOUT_MS || 120_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 120_000;
}

function subjectRouteTimeoutMs() {
  const raw = Number(process.env.VISUAL_QA_SUBJECT_ROUTE_TIMEOUT_MS || 120_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 120_000;
}

/** Navigate to subject master and wait for player shell — retries reload on cold dev. */
export async function navigateToPlayerShell(page, plan, baseUrl, { log = () => {} } = {}) {
  const routeTimeout = subjectRouteTimeoutMs();
  const shellTimeout = playerShellTimeoutMs();
  const targetUrl = `${String(baseUrl).replace(/\/$/, "")}${plan.path}`;
  const player = page.getByTestId(plan.playerTestId);
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      if (attempt > 1) {
        log(`player-shell: retry ${attempt}/2 for ${plan.playerTestId}`);
      }
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: routeTimeout });
      await dismissBlockingUi(page);
      await player.waitFor({ state: "visible", timeout: shellTimeout });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: routeTimeout }).catch(() => {});
        await page.waitForTimeout(1500);
      }
    }
  }

  throw lastError || new Error(`player shell not ready: ${plan.playerTestId}`);
}

export async function readQuestionStem(page, subject) {
  const parts = [];
  for (const testid of ["student-question-lead", "student-question-body"]) {
    const loc = page.getByTestId(testid);
    if (await loc.count()) {
      const t = compact(await loc.first().innerText().catch(() => ""));
      if (t && !parts.includes(t)) parts.push(t);
    }
  }
  if (!parts.length) {
    const stemLoc = page.getByTestId(`${subject}-question-stem`);
    if (await stemLoc.count()) {
      const t = compact(await stemLoc.first().innerText().catch(() => ""));
      if (t) parts.push(t);
    }
  }
  if (parts.length === 2) {
    const joined = compact(parts.join(" "));
    if (joined.includes(parts[0]) && joined.includes(parts[1]) && parts[0].length > parts[1].length * 0.8) {
      return dedupeRepeatedStem(parts[1].length >= parts[0].length ? parts[1] : parts[0]);
    }
  }
  return dedupeRepeatedStem(compact(parts.join(" ")));
}

export async function readMcqAnswers(page, prefix) {
  const out = [];
  for (let i = 0; i < 8; i += 1) {
    const btn = page.getByTestId(`${prefix}${i}`);
    if (!(await btn.count())) break;
    if (await btn.isVisible().catch(() => false)) {
      out.push(compact(await btn.innerText()));
    }
  }
  return out;
}

export async function detectInputType(page, subject) {
  const numericTestIds = { math: "math-text-answer", geometry: "geometry-text-answer" };
  const numId = numericTestIds[subject];
  if (numId) {
    const input = page.getByTestId(numId);
    if (await input.isVisible().catch(() => false)) return "numeric";
  }

  const typing = page.locator('input[type="text"], textarea, input[inputmode]').first();
  if (await typing.isVisible().catch(() => false)) {
    const ph = await typing.getAttribute("placeholder").catch(() => "");
    if (ph?.includes("כתוב")) return "typing";
    if (subject === "math" || subject === "geometry") return "numeric";
    return "typing";
  }

  const prefix = MCQ_PREFIX_BY_SUBJECT[subject];
  if (prefix && (await page.locator(`[data-testid^="${prefix}"]`).count())) {
    return "mcq";
  }
  return "unknown";
}

export async function readDiagram(page, subject) {
  if (subject !== "geometry") {
    return { hasDiagram: false, diagramType: null };
  }
  const diagram = page.getByTestId("geometry-question-diagram");
  if (!(await diagram.isVisible().catch(() => false))) {
    return { hasDiagram: false, diagramType: null };
  }
  const kind = await diagram.getAttribute("data-diagram-kind").catch(() => null);
  return { hasDiagram: true, diagramType: kind || "geometry-question-diagram" };
}

export async function readAudioState(page, gradeNumber) {
  const settleMs = 2000;
  await page.waitForTimeout(settleMs);

  const selectors = [
    'button[aria-label*="נגן שמע"]',
    'button[aria-label*="שמע"]',
    'button:has-text("נגן")',
    'button:has-text("🔊")',
  ];
  let visible = false;
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      visible = true;
      break;
    }
  }
  return { audioButtonVisible: visible, audioSettleMs: settleMs };
}

export async function readActionButtons(page) {
  const stepBtn = page.getByRole("button", { name: /צעד-צעד|צעד צעד/i }).first();
  const explainBtn = page.getByRole("button", { name: /הסבר מלא/i }).first();
  return {
    hasStepButton: await stepBtn.isVisible().catch(() => false),
    hasFullExplanationButton: await explainBtn.isVisible().catch(() => false),
  };
}

export async function readDisplayedGrade(page, plan) {
  let raw = "";
  if (plan.gradeSelectTestId) {
    raw = await page.getByTestId(plan.gradeSelectTestId).inputValue().catch(() => "");
  } else if (plan.gradeSelectAfterPlayer) {
    raw = await page
      .locator(`[data-testid="${plan.playerTestId}"]`)
      .locator("xpath=following-sibling::select[1]")
      .inputValue()
      .catch(() => "");
  }
  if (plan.gradeValueKind === "g-key") {
    const n = parseInt(String(raw).replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : null;
}

export async function readSubjectLabelOnPage(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  return { hasHeshbonLabel: body.includes("חשבון") && !body.includes("מתמטיקה") };
}

export async function captureQuestionSample(page, meta, { screenshotPath } = {}) {
  const {
    subject,
    grade,
    gradeDisplay,
    gradeNumber,
    studentLabel,
    topic,
    topicDisplay,
    url,
    mode,
  } = meta;

  await page.waitForTimeout(500);
  const questionText = await readQuestionStem(page, subject);
  const inputType = await detectInputType(page, subject);
  const prefix = MCQ_PREFIX_BY_SUBJECT[subject];
  const answersDisplayed = prefix ? await readMcqAnswers(page, prefix) : [];
  const diagram = await readDiagram(page, subject);
  const audio = await readAudioState(page, gradeNumber);
  const buttons = await readActionButtons(page);
  const labels = await readSubjectLabelOnPage(page);

  let screenshot = null;
  if (screenshotPath) {
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      screenshot = screenshotPath;
    } catch {
      screenshot = null;
    }
  }

  const sample = {
    subject,
    grade,
    gradeDisplay,
    gradeNumber,
    studentLabel,
    url: url || page.url(),
    mode: mode || "sample",
    topic,
    topicDisplay,
    questionText,
    answersDisplayed,
    inputType,
    hasDiagram: diagram.hasDiagram,
    diagramType: diagram.diagramType,
    audioRequired: gradeNumber <= 2 && (subject === "hebrew" || subject === "english"),
    audioButtonVisible: audio.audioButtonVisible,
    hasStepButton: buttons.hasStepButton,
    hasFullExplanationButton: buttons.hasFullExplanationButton,
    hasHeshbonLabel: labels.hasHeshbonLabel,
    screenshotPath: screenshot,
  };

  sample.issues = analyzeSample(sample);
  return sample;
}

export async function selectPracticeMode(page, subjectLabel, startTestId, log) {
  await page.getByTestId(startTestId).waitFor({ state: "visible", timeout: 60_000 });

  const practiceByName = page.getByRole("button", { name: "תרגול", exact: true });
  if (await practiceByName.isVisible().catch(() => false)) {
    await practiceByName.click();
    log?.(`${subjectLabel}: Practice tab (תרגול)`);
    return "practice";
  }

  const startBtn = page.getByTestId(startTestId);
  const precedingStrip = startBtn.locator(
    'xpath=preceding::div[@dir="rtl" and contains(@class,"flex-wrap")][1]'
  );
  const stripButton = precedingStrip.locator('button[type="button"]').first();
  if (await stripButton.isVisible().catch(() => false)) {
    await stripButton.click();
    log?.(`${subjectLabel}: Practice tab (mode strip fallback)`);
    return "practice-fallback";
  }

  const learningByName = page.getByRole("button", { name: "למידה", exact: true });
  if (await learningByName.isVisible().catch(() => false)) {
    await learningByName.click();
    log?.(`${subjectLabel}: Learning tab fallback`);
    return "learning-fallback";
  }

  throw new Error(`${subjectLabel}: no mode tabs visible before start`);
}

export async function startQuestionSurface(page, startTestId, subject, { log } = {}) {
  const sessionStart = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/learning/session/start"),
      { timeout: 60_000 }
    )
    .catch(() => null);

  await page.getByTestId(startTestId).click();
  const startRes = await sessionStart;
  await waitForQuestionSurface(page, subject);
  await dismissBlockingUi(page);

  return {
    sessionStarted: Boolean(startRes),
    sessionStatus: startRes?.status?.() ?? null,
  };
}

export async function selectTopicIfAvailable(page, topicSelectTestId, topic, log) {
  const select = page.getByTestId(topicSelectTestId);
  await select.waitFor({ state: "visible", timeout: 30_000 });
  await page
    .waitForFunction(
      (testid) => {
        const el = document.querySelector(`[data-testid="${testid}"]`);
        return el && el.options && el.options.length > 1;
      },
      topicSelectTestId,
      { timeout: 15_000 }
    )
    .catch(() => {});

  const options = await select.locator("option").evaluateAll((opts) =>
    opts.map((o) => ({ value: o.value, label: (o.textContent || "").trim() })).filter((o) => o.value)
  );

  const wanted = options.find((o) => o.value === topic.value);
  if (wanted) {
    await select.selectOption(topic.value);
    return { value: wanted.value, label: topic.label || wanted.label };
  }

  const fallback =
    options.find((o) => o.value !== "mixed" && o.value !== "") || options[0];
  if (!fallback) {
    throw new Error(`no selectable topics in ${topicSelectTestId}`);
  }
  log?.(
    `topic ${topic.value} unavailable — using ${fallback.value} (${fallback.label || fallback.value})`
  );
  await select.selectOption(fallback.value);
  return { value: fallback.value, label: fallback.label || fallback.value };
}

export async function stopActiveGameIfAny(page) {
  await dismissBlockingUi(page, { stopActiveGame: true });
}
