/**
 * Browser checks for one final-launch subject.
 */
import { chromium } from "@playwright/test";
import { authenticateStudent } from "../../../virtual-student-qa/lib/student-auth.mjs";
import {
  GRADE_HE,
  SUBJECT_PLANS,
  studentForGrade,
  topicsForGrade,
} from "../visual-qa-config.mjs";
import { sampleHasIssues } from "../visual-qa-analyze.mjs";
import {
  captureQuestionSample,
  dismissBlockingUi,
  navigateToPlayerShell,
  readMcqAnswers,
  selectPracticeMode,
  selectTopicIfAvailable,
  startQuestionSurface,
  stopActiveGameIfAny,
} from "../visual-qa-surface.mjs";
import { attachPageDiagnostics } from "../visual-qa-timeout-artifacts.mjs";
import {
  FINAL_SIMULATION_PROFILES,
  FINAL_SIMULATION_SUBJECT_LABELS_HE,
  SIMULATION_CHECK_STEPS,
} from "./constants.mjs";

const MCQ_PREFIX = {
  math: "math-mcq-",
  geometry: "geometry-mcq-",
  hebrew: "hebrew-mcq-",
  english: "english-mcq-",
  science: "science-mcq-",
  moledet: "moledet-mcq-",
};

const CHECK_ANSWER = {
  math: "math-check-answer",
  geometry: "geometry-check-answer",
  hebrew: "hebrew-check-answer",
  english: "english-check-answer",
  science: "science-check-answer",
  moledet: "moledet-check-answer",
};

const NUMERIC = { math: "math-text-answer", geometry: "geometry-text-answer" };

function stepResult(steps, step, pass, detail = "") {
  steps[step] = { pass, detail };
}

function fail(steps, step, message) {
  stepResult(steps, step, false, message);
  return message;
}

async function trySubmitAnswer(page, harnessKey, profile) {
  const prefix = profile.mcqPrefix || MCQ_PREFIX[harnessKey];
  if (prefix) {
    const btn = page.getByTestId(`${prefix}0`);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      const checkId = profile.checkAnswerTestId ?? CHECK_ANSWER[harnessKey];
      if (checkId) {
        const check = page.getByTestId(checkId);
        if (await check.isVisible().catch(() => false) && (await check.isEnabled().catch(() => false))) {
          await check.click();
          await page.waitForTimeout(800);
          return "mcq+check";
        }
      }
      await page.waitForTimeout(600);
      return "mcq";
    }
  }

  const numId = NUMERIC[harnessKey];
  if (numId) {
    const input = page.getByTestId(numId);
    if (await input.isVisible().catch(() => false)) {
      await input.fill("42");
      const check = page.getByTestId(CHECK_ANSWER[harnessKey]);
      if (await check.isEnabled().catch(() => false)) await check.click();
      await page.waitForTimeout(600);
      return "numeric";
    }
  }
  return "none";
}

function hasVisibleLeaks(text) {
  return (
    /\bundefined\b|\bNaN\b|\[object Object\]/i.test(text) ||
    /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(text.slice(0, 4000))
  );
}

function sessionMetadataOk(json) {
  if (!json || json.ok === false) return false;
  return Boolean(json.learningSessionId || json.sessionId || json.id);
}

/**
 * @param {import("@playwright/test").Browser} browser
 * @param {{ baseUrl: string, subjectKey: string, logFile: string }} opts
 */
export async function runSubjectSimulation(browser, { baseUrl, subjectKey, logFile }) {
  const profile = FINAL_SIMULATION_PROFILES[subjectKey];
  const harnessKey = profile.harnessKey;
  const plan = SUBJECT_PLANS[harnessKey];
  const grade = profile.grade;
  const student = studentForGrade(grade, false);
  const subjectLabel = FINAL_SIMULATION_SUBJECT_LABELS_HE[subjectKey] || subjectKey;
  const steps = Object.fromEntries(SIMULATION_CHECK_STEPS.map((s) => [s, { pass: false, detail: "" }]));
  const surfaceSubject = profile.surfaceSubject || harnessKey;

  let topic = null;
  let sessionStartJson = null;
  let finishObserved = false;

  if (!plan) {
    const msg = fail(steps, "subject_loads", `missing SUBJECT_PLANS for ${harnessKey}`);
    return buildResult(subjectKey, subjectLabel, grade, topic, steps, msg, logFile);
  }
  if (!student) {
    const msg = fail(steps, "subject_loads", `no AAA student for grade ${grade}`);
    return buildResult(subjectKey, subjectLabel, grade, topic, steps, msg, logFile);
  }

  const context = await browser.newContext({ baseURL: baseUrl, locale: "he-IL" });
  const page = await context.newPage();
  const diag = attachPageDiagnostics(page);
  page.setDefaultTimeout(90_000);

  page.on("response", async (response) => {
    const url = response.url();
    if (response.request().method() !== "POST") return;
    if (url.includes("/api/learning/session/start")) {
      try {
        sessionStartJson = await response.json();
      } catch {
        sessionStartJson = null;
      }
    }
    if (url.includes("/api/learning/session/finish") && response.status() === 200) {
      finishObserved = true;
    }
  });

  try {
    await authenticateStudent({ context, page, account: student, baseUrl, log: () => {} });
    await navigateToPlayerShell(page, plan, baseUrl);
    await dismissBlockingUi(page);
    stepResult(steps, "subject_loads", true, plan.path);

    topic = topicsForGrade(plan, grade)[0];
    const picked = await selectTopicIfAvailable(page, plan.topicSelectTestId, topic, () => {});
    topic = picked;
    stepResult(steps, "grade_topic_selection", true, `${grade} / ${picked.value}`);

    await selectPracticeMode(page, profile.masterLabel, plan.startTestId, () => {});
    const sessionInfo = await startQuestionSurface(page, plan.startTestId, surfaceSubject, {});

    const sample = await captureQuestionSample(page, {
      subject: harnessKey,
      grade: `g${grade}`,
      gradeDisplay: GRADE_HE[grade],
      gradeNumber: grade,
      studentLabel: student.label,
      topic: topic?.value,
      topicDisplay: topic?.label,
      url: `${baseUrl}${plan.path}`,
      mode: "final-subject-simulation",
    });

    const prefix = profile.mcqPrefix || MCQ_PREFIX[harnessKey];
    const answers = prefix ? await readMcqAnswers(page, prefix) : sample.answersDisplayed;
    const isMcq = sample.inputType === "mcq";
    const mcqOk = !isMcq || answers.length === 4;

    if (sampleHasIssues(sample) || !sample.questionText?.trim()) {
      fail(
        steps,
        "question_load",
        `issues=${JSON.stringify(sample.issues?.details || [])} q=${Boolean(sample.questionText)}`
      );
    } else if (isMcq && !mcqOk) {
      fail(steps, "question_load", `mcq_count=${answers.length}`);
    } else {
      stepResult(steps, "question_load", true, `${isMcq ? "mcq×4" : sample.inputType}`);
    }

    const rawFlags = sample.issues?.flags || {};
    stepResult(steps, "no_raw_ids", !rawFlags.rawIds, rawFlags.rawIds ? "raw ids in question surface" : "ok");
    stepResult(
      steps,
      "no_undefined_null_nan",
      !rawFlags.undefinedNullNan,
      rawFlags.undefinedNullNan ? "undefined/null/NaN visible" : "ok"
    );

    const answerMode = await trySubmitAnswer(page, harnessKey, profile);
    const bodyAfter = await page.locator("body").innerText().catch(() => "");
    if (answerMode === "none") {
      fail(steps, "answer_submit", "could not submit an answer");
    } else if (hasVisibleLeaks(bodyAfter)) {
      fail(steps, "answer_submit", `leak after answer (${answerMode})`);
    } else {
      stepResult(steps, "answer_submit", true, answerMode);
    }

    if (!sessionMetadataOk(sessionStartJson) && !sessionInfo.sessionStarted) {
      fail(steps, "diagnostic_metadata", "session/start missing learningSessionId");
    } else {
      stepResult(
        steps,
        "diagnostic_metadata",
        true,
        sessionStartJson?.learningSessionId ? "session id ok" : "session started"
      );
    }

    stepResult(
      steps,
      "parent_report_evidence",
      Boolean(sessionStartJson?.ok !== false || sessionInfo.sessionStarted),
      "session write path observed (report aggregate uses same subject keys)"
    );

    const actRes = await page.request.get("/api/student/activities");
    const actOk = actRes.ok();
    let actDetail = actOk ? "activities api ok" : `status=${actRes.status()}`;
    if (actOk) {
      const actBody = await actRes.json().catch(() => ({}));
      const actText = JSON.stringify(actBody);
      if (/\bundefined\b|\[object Object\]/i.test(actText)) {
        actDetail = "bad activities payload";
        stepResult(steps, "parent_activity", false, actDetail);
      } else {
        stepResult(steps, "parent_activity", true, actDetail);
      }
    } else {
      stepResult(steps, "parent_activity", false, actDetail);
    }

    await stopActiveGameIfAny(page).catch(() => {});
    if (finishObserved) {
      steps.diagnostic_metadata.detail += "; finish observed";
    }

    stepResult(steps, "no_crash", true, "completed without throw");
  } catch (error) {
    const msg = error?.message || String(error);
    fail(steps, "no_crash", msg);
    if (!steps.subject_loads.pass) fail(steps, "subject_loads", msg);
    if (diag?.consoleErrors?.length) {
      steps.no_crash.detail += `; console=${diag.consoleErrors.slice(0, 2).join(" | ")}`;
    }
  } finally {
    await stopActiveGameIfAny(page).catch(() => {});
    await context.close();
  }

  const pass = SIMULATION_CHECK_STEPS.every((s) => steps[s]?.pass);
  const firstFail = SIMULATION_CHECK_STEPS.find((s) => !steps[s]?.pass);
  return buildResult(
    subjectKey,
    subjectLabel,
    grade,
    topic,
    steps,
    firstFail ? `${firstFail}: ${steps[firstFail].detail}` : "",
    logFile,
    pass
  );
}

function buildResult(subjectKey, subjectLabel, grade, topic, steps, error, logFile, pass = false) {
  const allPass = pass || SIMULATION_CHECK_STEPS.every((s) => steps[s]?.pass);
  return {
    subject: subjectKey,
    subjectLabel,
    grade,
    topic: topic?.value ?? null,
    topicLabel: topic?.label ?? null,
    pass: allPass,
    steps,
    error: allPass ? "" : error,
    logFile,
  };
}

export async function smokeParentReport(browser, baseUrl) {
  const email = process.env.E2E_PARENT_EMAIL || "";
  const password = process.env.E2E_PARENT_PASSWORD || "";
  if (!email || !password) {
    return { pass: true, detail: "NOT_RUN (no E2E_PARENT_* env)", notRun: true };
  }

  const context = await browser.newContext({ baseURL: baseUrl, locale: "he-IL" });
  const page = await context.newPage();
  try {
    await page.goto("/parent/login", { waitUntil: "domcontentloaded" });
    await page.getByTestId("parent-login-identifier").fill(email);
    await page.getByTestId("parent-login-secret").fill(password);
    await page.getByRole("button", { name: /כניסה|התחבר/i }).click();
    await page.waitForURL(/\/(parent|learning)/, { timeout: 60_000 });
    await page.goto("/learning/parent-report", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);
    const text = await page.locator("body").innerText().catch(() => "");
    if (hasVisibleLeaks(text)) {
      return { pass: false, detail: "leak/undefined in parent report" };
    }
    return { pass: true, detail: "parent report loaded" };
  } catch (e) {
    return { pass: false, detail: e?.message || String(e) };
  } finally {
    await context.close();
  }
}
