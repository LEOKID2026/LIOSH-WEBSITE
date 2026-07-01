/**
 * Browser checks for one final-launch subject — regular / advanced display levels.
 */
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
  scanActivitiesForDisplayLevels,
  verifyActivityLevelPlans,
} from "./activity-level-checks.mjs";
import {
  DISPLAY_LEVEL_HE,
  readDisplayLevelOptions,
  selectDisplayLevel,
  validateDisplayLevelOptions,
} from "./display-level-surface.mjs";
import {
  FINAL_SIMULATION_PROFILES,
  FINAL_SIMULATION_SUBJECT_LABELS_HE,
  isRegularOnlySubject,
  LEVEL_CHECK_STEPS,
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

function isAcceptableMcqAnswerCount(answers) {
  const labels = answers.map((a) => String(a || "").trim()).filter(Boolean);
  if (labels.length === 4) return true;
  if (
    labels.length === 2 &&
    labels.every((a) => /^(נכון|לא נכון)$/i.test(a))
  ) {
    return true;
  }
  return labels.length >= 2 && labels.length <= 4;
}

const TYPING_PLACEHOLDER = "כתוב את התשובה שלך כאן...";

async function trySubmitTypingAnswer(page) {
  const input = page.locator(`input[placeholder="${TYPING_PLACEHOLDER}"]`);
  if (!(await input.isVisible().catch(() => false))) return null;
  if (!(await input.isEnabled().catch(() => false))) return null;
  await input.fill("hello");
  const checkBtn = page.getByRole("button", { name: /בדוק תשובה/ });
  if (await checkBtn.isVisible().catch(() => false) && (await checkBtn.isEnabled().catch(() => false))) {
    await checkBtn.click();
    await page.waitForTimeout(1000);
    return "typing";
  }
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  return "typing-enter";
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

  if (harnessKey === "english" || harnessKey === "hebrew") {
    const typingMode = await trySubmitTypingAnswer(page);
    if (typingMode) return typingMode;
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

function emptyLevelSteps() {
  return Object.fromEntries(LEVEL_CHECK_STEPS.map((s) => [s, { pass: false, detail: "" }]));
}

/**
 * Run question flow for one display level on an already-authenticated page.
 */
async function runDisplayLevelFlow(page, {
  baseUrl,
  profile,
  plan,
  harnessKey,
  surfaceSubject,
  grade,
  student,
  topic,
  displayLevel,
  logFile,
}) {
  const steps = emptyLevelSteps();
  const diag = attachPageDiagnostics(page);
  page.setDefaultTimeout(90_000);

  let sessionStartJson = null;
  let finishObserved = false;

  const onResponse = async (response) => {
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
  };
  page.on("response", onResponse);

  const levelLabel = DISPLAY_LEVEL_HE[displayLevel] || displayLevel;

  try {
    await stopActiveGameIfAny(page).catch(() => {});
    await navigateToPlayerShell(page, plan, baseUrl);
    await dismissBlockingUi(page);

    const picked = await selectTopicIfAvailable(page, plan.topicSelectTestId, topic, () => {});
    await selectDisplayLevel(page, plan, displayLevel);
    stepResult(steps, "level_loads", true, levelLabel);

    await selectPracticeMode(page, profile.masterLabel, plan.startTestId, () => {});
    const sessionInfo = await startQuestionSurface(page, plan.startTestId, surfaceSubject, {});

    const sample = await captureQuestionSample(page, {
      subject: harnessKey,
      grade: `g${grade}`,
      gradeDisplay: GRADE_HE[grade],
      gradeNumber: grade,
      studentLabel: student.label,
      topic: picked?.value ?? topic?.value,
      topicDisplay: picked?.label ?? topic?.label,
      url: `${baseUrl}${plan.path}`,
      mode: `final-subject-simulation-${displayLevel}`,
      displayLevel,
    });

    const prefix = profile.mcqPrefix || MCQ_PREFIX[harnessKey];
    const answers = prefix ? await readMcqAnswers(page, prefix) : sample.answersDisplayed;
    const isMcq = sample.inputType === "mcq";
    const mcqOk = !isMcq || isAcceptableMcqAnswerCount(answers);

    if (sampleHasIssues(sample) || !sample.questionText?.trim()) {
      fail(
        steps,
        "question_load",
        `issues=${JSON.stringify(sample.issues?.details || [])} q=${Boolean(sample.questionText)}`
      );
    } else if (isMcq && !mcqOk) {
      fail(steps, "question_load", `mcq_count=${answers.length}`);
    } else {
      stepResult(
        steps,
        "question_load",
        true,
        `${isMcq ? `mcq×${answers.length}` : sample.inputType}`
      );
    }

    const rawFlags = sample.issues?.flags || {};
    stepResult(steps, "no_raw_ids", !rawFlags.rawIds, rawFlags.rawIds ? "raw ids in surface" : "ok");
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
      fail(steps, "metadata_exists", "session/start missing learningSessionId");
    } else {
      stepResult(
        steps,
        "metadata_exists",
        true,
        sessionStartJson?.learningSessionId ? "session id ok" : "session started"
      );
    }

    stepResult(
      steps,
      "diagnostic_evidence",
      Boolean(sessionStartJson?.ok !== false || sessionInfo.sessionStarted || finishObserved),
      finishObserved ? "session finish observed" : "session start evidence"
    );

    stepResult(steps, "no_crash", true, "completed without throw");
  } catch (error) {
    const msg = error?.message || String(error);
    fail(steps, "no_crash", msg);
    if (!steps.level_loads.pass) fail(steps, "level_loads", msg);
    if (diag?.consoleErrors?.length) {
      steps.no_crash.detail += `; console=${diag.consoleErrors.slice(0, 2).join(" | ")}`;
    }
  } finally {
    page.off("response", onResponse);
    await stopActiveGameIfAny(page).catch(() => {});
  }

  const pass = LEVEL_CHECK_STEPS.every((s) => steps[s]?.pass);
  const firstFail = LEVEL_CHECK_STEPS.find((s) => !steps[s]?.pass);
  return {
    displayLevel,
    levelLabel,
    pass,
    steps,
    error: pass ? "" : `${firstFail}: ${steps[firstFail]?.detail}`,
    logFile,
  };
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
  const student = studentForGrade(grade, Boolean(profile.useSecondStudent));
  const subjectLabel = FINAL_SIMULATION_SUBJECT_LABELS_HE[subjectKey] || subjectKey;
  const surfaceSubject = profile.surfaceSubject || harnessKey;
  const regularOnly = isRegularOnlySubject(subjectKey);

  const setup = {
    subject_loads: { pass: false, detail: "" },
    grade_topic_selection: { pass: false, detail: "" },
  };

  let topic = null;

  if (!plan) {
    return buildResult(subjectKey, subjectLabel, grade, topic, setup, {}, null, {}, logFile, {
      error: `missing SUBJECT_PLANS for ${harnessKey}`,
    });
  }
  if (!student) {
    return buildResult(subjectKey, subjectLabel, grade, topic, setup, {}, null, {}, logFile, {
      error: `no AAA student for grade ${grade}`,
    });
  }

  const context = await browser.newContext({ baseURL: baseUrl, locale: "he-IL" });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);

  let advancedAbsent = null;

  try {
    await authenticateStudent({ context, page, account: student, baseUrl, log: () => {} });
    await navigateToPlayerShell(page, plan, baseUrl);
    await dismissBlockingUi(page);
    setup.subject_loads = { pass: true, detail: plan.path };

    topic = topicsForGrade(plan, grade)[0];
    const picked = await selectTopicIfAvailable(page, plan.topicSelectTestId, topic, () => {});
    topic = picked;
    setup.grade_topic_selection = { pass: true, detail: `${grade} / ${picked.value}` };

    const { options } = await readDisplayLevelOptions(page, plan, { regularOnly });
    const validation = validateDisplayLevelOptions(options, { regularOnly });
    advancedAbsent = {
      pass: validation.ok,
      detail: validation.ok
        ? regularOnly
          ? "מתקדם not present / not selectable"
          : "רגיל+מתקדם options valid"
        : validation.reason,
      options: options.map((o) => o.label),
    };

    if (!validation.ok) {
      setup.subject_loads = { pass: false, detail: validation.reason };
    }
  } catch (error) {
    const msg = error?.message || String(error);
    setup.subject_loads = { pass: false, detail: msg };
    advancedAbsent = { pass: false, detail: msg, options: [] };
  }

  const levels = {};
  const setupOk = setup.subject_loads.pass && setup.grade_topic_selection.pass && advancedAbsent?.pass;

  if (setupOk) {
    levels.regular = await runDisplayLevelFlow(page, {
      baseUrl,
      profile,
      plan,
      harnessKey,
      surfaceSubject,
      grade,
      student,
      topic,
      displayLevel: "regular",
      logFile,
    });

    if (!regularOnly) {
      levels.advanced = await runDisplayLevelFlow(page, {
        baseUrl,
        profile,
        plan,
        harnessKey,
        surfaceSubject,
        grade,
        student,
        topic,
        displayLevel: "advanced",
        logFile,
      });
    }
  } else {
    levels.regular = {
      displayLevel: "regular",
      levelLabel: DISPLAY_LEVEL_HE.regular,
      pass: false,
      steps: emptyLevelSteps(),
      error: setup.subject_loads.detail || advancedAbsent?.detail || "setup failed",
      logFile,
      skipped: true,
    };
    if (!regularOnly) {
      levels.advanced = {
        displayLevel: "advanced",
        levelLabel: DISPLAY_LEVEL_HE.advanced,
        pass: false,
        steps: emptyLevelSteps(),
        error: "skipped — setup failed",
        logFile,
        skipped: true,
      };
    }
  }

  const activityPlans = verifyActivityLevelPlans(subjectKey);
  let activitiesApi = { pass: true, detail: "not scanned" };
  try {
    const actRes = await page.request.get("/api/student/activities");
    if (actRes.ok()) {
      activitiesApi = scanActivitiesForDisplayLevels(await actRes.json().catch(() => ({})), subjectKey);
    } else {
      activitiesApi = { pass: false, detail: `activities status=${actRes.status()}` };
    }
  } catch (e) {
    activitiesApi = { pass: false, detail: e?.message || String(e) };
  }

  await page.close();
  await context.close();

  const activities = {
    regular: {
      pass: activityPlans.regular.pass && activitiesApi.pass,
      detail: `${activityPlans.regular.detail}; api: ${activitiesApi.detail}`,
    },
    advanced: regularOnly
      ? {
          pass: activityPlans.advanced.pass,
          detail: activityPlans.advanced.detail,
          status: "N/A",
        }
      : {
          pass: activityPlans.advanced.pass,
          detail: activityPlans.advanced.detail,
          status: activityPlans.advanced.pass ? "PASS" : "FAIL",
        },
  };

  const pass = computeSubjectPass({ regularOnly, setup, levels, advancedAbsent, activities });

  const firstFail = findFirstFailure({ setup, levels, advancedAbsent, activities, regularOnly });
  return buildResult(
    subjectKey,
    subjectLabel,
    grade,
    topic,
    setup,
    levels,
    advancedAbsent,
    activities,
    logFile,
    { pass, error: pass ? "" : firstFail }
  );
}

function computeSubjectPass({ regularOnly, setup, levels, advancedAbsent, activities }) {
  const setupOk = setup.subject_loads.pass && setup.grade_topic_selection.pass;
  if (!setupOk) return false;

  if (regularOnly) {
    return (
      advancedAbsent?.pass &&
      levels.regular?.pass &&
      activities.regular?.pass &&
      activities.advanced?.pass
    );
  }

  return (
    advancedAbsent?.pass &&
    levels.regular?.pass &&
    levels.advanced?.pass &&
    activities.regular?.pass &&
    activities.advanced?.pass
  );
}

function findFirstFailure({ setup, levels, advancedAbsent, activities, regularOnly }) {
  if (!setup.subject_loads.pass) return `subject_loads: ${setup.subject_loads.detail}`;
  if (!setup.grade_topic_selection.pass) return `grade_topic_selection: ${setup.grade_topic_selection.detail}`;
  if (!advancedAbsent?.pass) return `level_options: ${advancedAbsent?.detail}`;
  if (!levels.regular?.pass) return `regular: ${levels.regular.error}`;
  if (!regularOnly && !levels.advanced?.pass) return `advanced: ${levels.advanced?.error}`;
  if (!activities.regular?.pass) return `regular_activity: ${activities.regular.detail}`;
  if (!regularOnly && !activities.advanced?.pass) return `advanced_activity: ${activities.advanced.detail}`;
  if (regularOnly && !activities.advanced?.pass) return `advanced_activity: ${activities.advanced.detail}`;
  return "";
}

function buildResult(
  subjectKey,
  subjectLabel,
  grade,
  topic,
  setup,
  levels,
  advancedAbsent,
  activities,
  logFile,
  { pass, error }
) {
  return {
    subject: subjectKey,
    subjectLabel,
    grade,
    topic: topic?.value ?? null,
    topicLabel: topic?.label ?? null,
    regularOnly: isRegularOnlySubject(subjectKey),
    pass,
    setup,
    levels,
    advancedAbsent,
    activities,
    error,
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
