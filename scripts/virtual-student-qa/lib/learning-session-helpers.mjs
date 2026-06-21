/**
 * Shared helpers for the per-subject scenario drivers.
 *
 * Every learning page emits the same three persistence events:
 *   - POST /api/learning/session/start   (once, on the first answer)
 *   - POST /api/learning/answer          (one per question)
 *   - POST /api/learning/session/finish  (once, on stop / unmount)
 *
 * The drivers MUST observe each of these in real time, otherwise we risk
 * racing past `learningSessionIdRef` being null and getting silent skips
 * inside the page (Phase A pinned this exact failure for math).
 *
 * These helpers consolidate the wait/log glue so every subject driver gets
 * the same behaviour without copy-pasting it.
 */

import {
  assertPracticeSessionStart,
  classifyPracticeAnswerEvidence,
} from "./practice-only-guard.mjs";

const SESSION_START_PATH = "/api/learning/session/start";
const SESSION_ANSWER_PATH = "/api/learning/answer";
const SESSION_FINISH_PATH = "/api/learning/session/finish";

/** Default wait for session/finish after stop — production runs often need >30s under load. */
export const SESSION_FINISH_TIMEOUT_MS = 90_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Visible label for Practice mode on every learning master page.
 * Must match MODES.practice.name in pages/learning/*-master.js (product copy).
 */
export const COUNTABLE_PRACTICE_MODE_BUTTON_LABEL = "תרגול";

/** Modes that must NOT appear in parent-report countable evidence (product policy). */
const NON_COUNTABLE_SESSION_MODES = new Set([
  "learning",
  "mistakes",
  "challenge",
  "speed",
  "marathon",
  "learning_book",
]);

/**
 * Select Practice / תרגול before starting a session so session/start persists
 * mode=practice and answers classify as countable independent practice.
 */
export async function selectCountablePracticeMode({ page, log, subjectLabel }) {
  const learningTab = page.getByRole("button", { name: "למידה", exact: true });
  const practiceTab = page.getByRole("button", {
    name: COUNTABLE_PRACTICE_MODE_BUTTON_LABEL,
    exact: true,
  });
  await practiceTab.waitFor({ state: "visible", timeout: 15_000 });

  if (await learningTab.count()) {
    const learningSelected = await learningTab
      .evaluate((el) => {
        const cls = el.className || "";
        return cls.includes("bg-") && !cls.includes("bg-white/10");
      })
      .catch(() => false);
    if (learningSelected) {
      log(
        `${subjectLabel}: Learning (למידה) tab was active — switching to Practice before start`
      );
    }
  }

  await practiceTab.click();
  log(
    `${subjectLabel}: selected Practice tab (${COUNTABLE_PRACTICE_MODE_BUTTON_LABEL}) ` +
      `— countable parent-report evidence path`
  );
}

export function readSessionStartRequestBody(sessionStartResponse) {
  if (!sessionStartResponse) return null;
  try {
    const postData = sessionStartResponse.request()?.postData();
    if (!postData) return null;
    return JSON.parse(postData);
  } catch {
    return null;
  }
}

export function readAnswerRequestBody(answerResponse) {
  if (!answerResponse) return null;
  try {
    const postData = answerResponse.request()?.postData();
    if (!postData) return null;
    return JSON.parse(postData);
  } catch {
    return null;
  }
}

/**
 * Fail only when session/start persisted a non-countable mode (e.g. learning).
 * @deprecated Prefer assertPracticeSessionStart — kept for legacy callers.
 */
export function assertCountableSessionMode({
  sessionStartResponse,
  subjectLabel,
  log,
  strict = true,
}) {
  try {
    return assertPracticeSessionStart({ sessionStartResponse, subjectLabel, log });
  } catch (error) {
    if (strict) throw error;
    log(`${subjectLabel}: WARN ${error?.message || error}`);
    return { ok: false, sessionMode: null };
  }
}

/**
 * Classify one /api/learning/answer payload.
 * afterStepByStep / book-context rows are expected-excluded inside practice.
 */
export function classifyAnswerEvidence({ answerResponse, subjectLabel, log }) {
  return classifyPracticeAnswerEvidence({ answerResponse, subjectLabel, log });
}

export function assertSessionHasCountableEvidence({
  countableCount,
  excludedCount,
  subjectLabel,
  log,
  strict = true,
}) {
  if (countableCount > 0) {
    log(
      `${subjectLabel}: session evidence summary ` +
        `countable=${countableCount} excluded=${excludedCount}`
    );
    return { ok: true, countableCount, excludedCount };
  }
  const msg =
    `${subjectLabel}: no report-countable answers in session ` +
    `(countable=0 excluded=${excludedCount}). ` +
    `Require at least one diagnostic_independent row per studied subject.`;
  if (strict) throw new Error(msg);
  log(`${subjectLabel}: WARN ${msg}`);
  return { ok: false, countableCount, excludedCount };
}

/**
 * Per-session tracker: validate practice mode once, classify each answer,
 * require ≥1 countable row at session end.
 */
export function createPracticeEvidenceTracker(subjectLabel, log) {
  let sessionModeValidated = false;
  let sessionMode = null;
  let countableAnswers = 0;
  let excludedAnswers = 0;

  return {
    recordAnswer({ sessionStartResponse, answerResponse }) {
      if (!sessionModeValidated) {
        const modeResult = assertCountableSessionMode({
          sessionStartResponse,
          subjectLabel,
          log,
          strict: true,
        });
        sessionMode = modeResult.sessionMode;
        sessionModeValidated = true;
      }
      const classification = classifyAnswerEvidence({
        answerResponse,
        subjectLabel,
        log,
      });
      if (classification.countable) countableAnswers += 1;
      if (classification.excluded) excludedAnswers += 1;
      return classification;
    },
    finalize({ strict = true } = {}) {
      assertSessionHasCountableEvidence({
        countableCount: countableAnswers,
        excludedCount: excludedAnswers,
        subjectLabel,
        log,
        strict,
      });
      return {
        countableAnswers,
        excludedAnswers,
        sessionMode,
      };
    },
  };
}

/** @deprecated Prefer createPracticeEvidenceTracker — kept for smoke tools. */
export function assertCountableProductEvidence({
  sessionStartResponse,
  answerResponse,
  subjectLabel,
  log,
  strict = false,
}) {
  const tracker = createPracticeEvidenceTracker(subjectLabel, log);
  tracker.recordAnswer({ sessionStartResponse, answerResponse });
  return tracker.finalize({ strict });
}

export async function waitForSessionStart({ page, log, subject, timeoutMs = 30_000 }) {
  try {
    const res = await page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(SESSION_START_PATH),
      { timeout: timeoutMs }
    );
    log(
      `${subject}: observed ${SESSION_START_PATH} response (status=${res.status()})`
    );
    assertPracticeSessionStart({
      sessionStartResponse: res,
      subjectLabel: subject,
      log,
    });
    return res;
  } catch (error) {
    throw new Error(
      `${subject}: did not observe ${SESSION_START_PATH} within ${timeoutMs}ms — ` +
        `learning session never opened. Underlying: ${error?.message || error}`
    );
  }
}

/**
 * Wrap a click that should produce exactly one /api/learning/answer POST.
 * Returns the response object so the caller can read isCorrect / status.
 *
 * If `doClick` throws (e.g. Playwright actionability timeout), we still
 * await/swallow the dangling `waitForResponse` promise so the closing
 * browser does not surface a node:unhandledRejection later. The original
 * click error is re-thrown unchanged so callers see the real cause.
 */
export async function waitForAnswerSave({ page, doClick, log, subject, questionIndex, timeoutMs = 30_000 }) {
  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(SESSION_ANSWER_PATH),
      { timeout: timeoutMs }
    )
    // Always defuse the rejection up-front; we still surface the failure
    // through the normal control-flow below by checking the resolved value.
    .catch((err) => ({ __answerWaitError: err }));

  let clickError = null;
  try {
    await doClick();
  } catch (error) {
    clickError = error;
  }

  const settled = await responsePromise;
  if (clickError) {
    // The click never landed; the response promise will already be rejected
    // by the time the browser closes. Re-throw the original click error so
    // the runner records the right root cause.
    throw clickError;
  }
  if (settled && settled.__answerWaitError) {
    throw new Error(
      `${subject}: q${questionIndex} did not observe ${SESSION_ANSWER_PATH} within ${timeoutMs}ms — ` +
        `Underlying: ${settled.__answerWaitError?.message || settled.__answerWaitError}`
    );
  }
  log(
    `${subject}: q${questionIndex} observed ${SESSION_ANSWER_PATH} response (status=${settled.status()})`
  );
  return settled;
}

/**
 * Read the `isCorrect` boolean from a /api/learning/answer response.
 * Returns null if the body cannot be parsed (we never block on parsing —
 * the persistence wait already proved the network event happened).
 */
export async function readAnswerIsCorrect(answerResponse) {
  if (!answerResponse) return null;
  try {
    const req = answerResponse.request();
    const postData = req.postData();
    if (!postData) return null;
    const body = JSON.parse(postData);
    if (typeof body?.isCorrect === "boolean") return body.isCorrect;
    return null;
  } catch {
    return null;
  }
}

export async function waitForSessionFinish({
  page,
  log,
  subject,
  timeoutMs = SESSION_FINISH_TIMEOUT_MS,
  strict = false,
}) {
  try {
    const res = await page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(SESSION_FINISH_PATH),
      { timeout: timeoutMs }
    );
    log(
      `${subject}: observed ${SESSION_FINISH_PATH} response (status=${res.status()})`
    );
    return true;
  } catch (error) {
    const msg =
      `${subject}: did not observe ${SESSION_FINISH_PATH} within ${timeoutMs}ms — ` +
      `${error?.message || error}`;
    log(msg);
    if (strict) throw new Error(msg);
    return false;
  }
}

/**
 * Race-safe session end: register finish listener BEFORE clicking stop.
 * Throws if finish is not observed — callers must not proceed to stamp/snapshot.
 */
export async function clickStopAndConfirmSessionFinish({
  page,
  log,
  subject,
  timeoutMs = SESSION_FINISH_TIMEOUT_MS,
}) {
  const stopButton = page.getByTestId("learning-stop-game");
  await stopButton.waitFor({ state: "visible", timeout: 10_000 });
  log(`${subject}: clicking learning-stop-game (fires session/finish)`);

  const finishPromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(SESSION_FINISH_PATH),
    { timeout: timeoutMs }
  );

  await stopButton.click();

  try {
    const res = await finishPromise;
    log(
      `${subject}: observed ${SESSION_FINISH_PATH} response (status=${res.status()})`
    );
    return res;
  } catch (error) {
    throw new Error(
      `${subject}: did not observe ${SESSION_FINISH_PATH} within ${timeoutMs}ms — ` +
        `${error?.message || error}`
    );
  }
}

/**
 * Robust topic selection with option-load wait, verify, and one controlled reload.
 */
export async function selectTopicRobustly({
  page,
  baseUrl,
  path,
  topicSelectTestid,
  playerNameTestid,
  topic,
  subjectLabel,
  log,
  required = true,
  maxAttempts = 3,
}) {
  if (!topic) return { ok: true, topic: null, skipped: true };

  const selectOnce = async () => {
    const topicSelect = page.getByTestId(topicSelectTestid);
    await topicSelect.waitFor({ state: "visible", timeout: 15_000 });
    await page
      .waitForFunction(
        (testid) => {
          const el = document.querySelector(`[data-testid="${testid}"]`);
          return el && el.options && el.options.length > 1;
        },
        topicSelectTestid,
        { timeout: 12_000 }
      )
      .catch(() => {});
    await topicSelect.selectOption({ value: topic });
    const selected = await topicSelect.inputValue().catch(() => "");
    if (selected !== topic) {
      throw new Error(`selection mismatch wanted=${topic} got=${selected || "(empty)"}`);
    }
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await selectOnce();
      log(`${subjectLabel}: selected topic=${topic} (attempt ${attempt})`);
      return { ok: true, topic };
    } catch (error) {
      log(
        `${subjectLabel}: topic select to '${topic}' failed attempt ${attempt}/${maxAttempts} ` +
          `(${String(error?.message || error).slice(0, 160)})`
      );
      if (attempt < maxAttempts && baseUrl && path) {
        log(`${subjectLabel}: controlled reload before topic retry`);
        await page.goto(new URL(path, baseUrl).toString(), {
          waitUntil: "domcontentloaded",
        });
        if (playerNameTestid) {
          await page
            .getByTestId(playerNameTestid)
            .waitFor({ state: "visible", timeout: 30_000 })
            .catch(() => {});
        }
        await sleep(400 * attempt);
      }
    }
  }

  if (required) {
    throw new Error(
      `${subjectLabel}: topic '${topic}' could not be selected after ${maxAttempts} attempts`
    );
  }
  log(`${subjectLabel}: keeping default topic after failed select of '${topic}'`);
  return { ok: false, topic: null };
}

/**
 * MCQ option click with visibility/enabled/geometry checks and short retries.
 */
export async function clickMcqOptionRobustly({
  page,
  mcqTestid,
  log,
  subjectLabel,
  questionIndex,
  maxClickAttempts = 3,
}) {
  const target = page.getByTestId(mcqTestid);

  await page
    .waitForFunction(
      (tid) => {
        const btn = document.querySelector(`[data-testid="${tid}"]`);
        if (!btn || btn.disabled) return false;
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      mcqTestid,
      { timeout: 15_000 }
    )
    .catch(() => {});

  const visible = await target.isVisible().catch(() => false);
  if (!visible) {
    throw new Error(
      `${subjectLabel}: q${questionIndex} MCQ option ${mcqTestid} not visible/enabled`
    );
  }

  await target.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});

  let lastError = null;
  for (let attempt = 1; attempt <= maxClickAttempts; attempt++) {
    try {
      await target.click({ timeout: 8_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxClickAttempts) {
        log(
          `${subjectLabel}: q${questionIndex} MCQ click attempt ${attempt}/${maxClickAttempts} failed; retrying`
        );
        await sleep(250 * attempt);
      }
    }
  }

  log(
    `${subjectLabel}: q${questionIndex} Playwright click failed; falling back to native DOM .click()`
  );
  try {
    await target.evaluate((el) => el.click(), undefined, { timeout: 10_000 });
    return;
  } catch (domError) {
    throw new Error(
      `${subjectLabel}: q${questionIndex} MCQ click failed for ${mcqTestid}: ` +
        `${domError?.message || domError || lastError?.message || lastError}`
    );
  }
}

/**
 * Limit parallel student workers (stability under production load).
 */
export async function runWithConcurrency(items, concurrency, workerFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, list.length));
  let nextIndex = 0;

  async function drain() {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      await workerFn(list[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => drain()));
}

export function shortText(text, max = 80) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Decide a per-question observed/intended result entry. The shape is
 * identical across subject drivers so the run summary can aggregate them.
 */
export function buildAnsweredQuestionEntry({
  index,
  topic,
  exerciseText,
  computedAnswer,
  submittedValue,
  intendedCorrect,
  observedCorrect,
  flow,
}) {
  return {
    index,
    topic: topic ?? null,
    flow: flow || "unknown",
    exerciseText: shortText(exerciseText),
    computed: computedAnswer == null ? null : computedAnswer,
    submitted: submittedValue == null ? null : String(submittedValue),
    intendedCorrect: !!intendedCorrect,
    observedCorrect: typeof observedCorrect === "boolean" ? observedCorrect : null,
  };
}

/**
 * Tally intended vs observed correct counts for the run summary.
 */
export function tallyCorrectness(answeredQuestions) {
  const total = answeredQuestions.length;
  let intendedCorrect = 0;
  let observedCorrect = 0;
  let observedKnown = 0;
  for (const q of answeredQuestions) {
    if (q.intendedCorrect) intendedCorrect += 1;
    if (typeof q.observedCorrect === "boolean") {
      observedKnown += 1;
      if (q.observedCorrect) observedCorrect += 1;
    }
  }
  return {
    total,
    intendedCorrect,
    intendedRate: total > 0 ? intendedCorrect / total : null,
    observedCorrect: observedKnown > 0 ? observedCorrect : null,
    observedKnown,
    observedRate: observedKnown > 0 ? observedCorrect / observedKnown : null,
  };
}
