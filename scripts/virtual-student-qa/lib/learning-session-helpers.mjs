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

const SESSION_START_PATH = "/api/learning/session/start";
const SESSION_ANSWER_PATH = "/api/learning/answer";
const SESSION_FINISH_PATH = "/api/learning/session/finish";

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

export async function waitForSessionFinish({ page, log, subject, timeoutMs = 30_000 }) {
  try {
    await page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(SESSION_FINISH_PATH),
      { timeout: timeoutMs }
    );
    log(`${subject}: observed ${SESSION_FINISH_PATH} response`);
    return true;
  } catch (error) {
    log(
      `${subject}: did not observe ${SESSION_FINISH_PATH} within ${timeoutMs}ms — ` +
        `${error?.message || error}`
    );
    return false;
  }
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
