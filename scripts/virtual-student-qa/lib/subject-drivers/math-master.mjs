/**
 * Math master driver — Phase A.
 *
 * Drives the real /learning/math-master page using the page's stable testids:
 *   math-player-name (display, auto-filled from /api/student/me)
 *   math-grade-select  / math-operation-select
 *   math-start-game
 *   math-text-answer + math-check-answer (text input answer flow)
 *   "שאלה הבאה" button (no testid; matched by role+name)
 *   learning-stop-game (fires session/finish)
 *
 * Phase A scenario uses operation='addition', which renders the text-input
 * answer UI in mode='learning' (default). That branch is responsible for
 * firing /api/learning/answer per submission.
 */

const MATH_PATH = "/learning/math-master";

export async function runMathScenario({ page, baseUrl, scenario, log, screenshotter }) {
  const url = new URL(MATH_PATH, baseUrl).toString();
  log(`math-master: navigate ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const playerNameDiv = page.getByTestId("math-player-name");
  await playerNameDiv.waitFor({ state: "visible", timeout: 30_000 });

  log("math-master: waiting for player name to auto-populate from /api/student/me");
  try {
    await page.waitForFunction(
      () => {
        const node = document.querySelector('[data-testid="math-player-name"]');
        const text = node?.textContent?.trim() || "";
        return Boolean(text) && text !== "שחקן";
      },
      null,
      { timeout: 30_000 }
    );
  } catch (error) {
    throw new Error(
      "math-master: player name did not auto-populate from /api/student/me. " +
        "Confirm the test student row has a non-empty full_name in Supabase. " +
        `Underlying timeout: ${error?.message || error}`
    );
  }

  const gradeSelect = page.getByTestId("math-grade-select");
  const operationSelect = page.getByTestId("math-operation-select");
  const startButton = page.getByTestId("math-start-game");

  // Capture the actual student state from the visible UI BEFORE we override
  // anything. The grade-select reflects the student's account grade (page
  // forces it to match grade_level on mount). The player-name div reflects
  // the student's full_name from /api/student/me. Both are needed by
  // Phase B (parent dashboard match + run-summary disclosure).
  const playerName = (await playerNameDiv.innerText().catch(() => "")).trim();
  const accountGradeRaw = await gradeSelect.inputValue().catch(() => "");
  const accountGradeNumber = Number(accountGradeRaw) || null;
  log(
    `math-master: detected playerName='${playerName}' accountGrade=${accountGradeRaw || "(empty)"}`
  );

  await gradeSelect.selectOption({ value: String(scenario.grade) });
  await operationSelect.selectOption({ value: scenario.operation });

  await screenshotter("02-math-master-ready");

  await startButton.waitFor({ state: "visible", timeout: 10_000 });
  log(
    `math-master: starting game grade=${scenario.grade} operation=${scenario.operation} questions=${scenario.questionCount}`
  );

  // The page fires POST /api/learning/session/start asynchronously inside
  // ensureLearningSessionId() and then immediately renders the first question.
  // If we answer before the start response lands, learningSessionIdRef stays
  // null on the page, every saveAnswer waits on the same start promise, and
  // — critically — recordSessionProgress in stopGame() will see a null ref and
  // SKIP finishLearningSession entirely. So we explicitly wait for the
  // start response to arrive before doing anything else.
  const sessionStartResponse = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/learning/session/start"),
      { timeout: 30_000 }
    )
    .catch(() => null);
  await startButton.click();
  const startRes = await sessionStartResponse;
  if (!startRes) {
    throw new Error("math-master: did not observe /api/learning/session/start response after start click");
  }
  log(`math-master: observed /api/learning/session/start response (status=${startRes.status()})`);

  const textInput = page.getByTestId("math-text-answer");
  const checkButton = page.getByTestId("math-check-answer");

  try {
    await textInput.waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    throw new Error(
      "math-master: math-text-answer input did not appear after start. " +
        `Operation '${scenario.operation}' may have rendered a choice-button UI instead. ` +
        `Underlying timeout: ${error?.message || error}`
    );
  }

  const answeredQuestions = [];

  for (let i = 0; i < scenario.questionCount; i++) {
    const questionIndex = i + 1;
    log(`math-master: question ${questionIndex}/${scenario.questionCount} - waiting for prompt`);

    await page.waitForFunction(
      () => {
        const input = document.querySelector('[data-testid="math-text-answer"]');
        if (!input) return false;
        if (input.disabled) return false;
        return (input.value || "") === "";
      },
      null,
      { timeout: 30_000 }
    );

    const exerciseText = await page
      .getByTestId("student-question-body")
      .innerText()
      .catch(() => "");
    const computed = parseAndCompute(exerciseText);
    const pick = scenario.pickAnswer({
      profile: scenario.profile,
      computedAnswer: computed,
      topicKey: scenario.operation,
      weaknessTopics: scenario.weaknessTopics ?? [],
    });

    log(
      `math-master: q${questionIndex} body="${shortText(exerciseText)}" computed=${computed} ` +
        `submit=${pick.value} intendedCorrect=${pick.intendedCorrect}`
    );

    // Capture the answer-save response promise BEFORE clicking check, so we
    // are guaranteed to observe THIS question's POST /api/learning/answer
    // before moving on. Same reasoning as session/start above.
    const answerResponse = page
      .waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/learning/answer"),
        { timeout: 20_000 }
      )
      .catch(() => null);

    await textInput.fill(pick.value);
    await checkButton.click();

    await page.waitForFunction(
      () => {
        const input = document.querySelector('[data-testid="math-text-answer"]');
        return Boolean(input) && input.disabled === true;
      },
      null,
      { timeout: 15_000 }
    );

    const answerRes = await answerResponse;
    if (!answerRes) {
      throw new Error(
        `math-master: q${questionIndex} did not observe /api/learning/answer response within timeout`
      );
    }

    answeredQuestions.push({
      index: questionIndex,
      exerciseText: shortText(exerciseText),
      computed,
      submitted: pick.value,
      intendedCorrect: pick.intendedCorrect,
    });

    // In mode='learning', math-master auto-advances via setTimeout(
    // generateNewQuestion, 1000ms) for correct answers and 2000ms for wrong
    // answers. The "שאלה הבאה" button only appears in the brief window
    // between submit and auto-advance, so we DON'T click it. The next
    // iteration's wait for "input enabled and empty" naturally synchronizes
    // on the auto-advance.
  }

  await screenshotter("03-math-master-questions-complete");

  const stopButton = page.getByTestId("learning-stop-game");
  await stopButton.waitFor({ state: "visible", timeout: 10_000 });
  log("math-master: clicking learning-stop-game (fires session/finish)");
  await stopButton.click();

  // session/finish is fire-and-forget inside the page's recordSessionProgress.
  // Wait until the request actually resolves (success OR failure), with a
  // generous timeout. networkidle is unreliable under `next dev` because HMR
  // keeps a long-lived connection open, so we poll Playwright directly for a
  // POST response on the finish endpoint instead.
  try {
    await page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/learning/session/finish"),
      { timeout: 30_000 }
    );
    log("math-master: observed /api/learning/session/finish response");
  } catch (error) {
    log(
      `math-master: did not observe /api/learning/session/finish within timeout: ${error?.message || error}`
    );
  }

  await screenshotter("04-math-master-after-stop");

  return {
    answeredQuestions,
    playerName,
    accountGrade: accountGradeNumber,
    accountGradeRaw,
  };
}

function parseAndCompute(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/[×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/=.*$/, "")
    .replace(/\u00a0/g, " ");

  const horizontal = cleaned.match(/(-?\d+)\s*([+\-*/])\s*(-?\d+)/);
  if (horizontal) {
    return safeArith(Number(horizontal[1]), horizontal[2], Number(horizontal[3]));
  }

  const numbers = Array.from(cleaned.matchAll(/-?\d+/g)).map((match) => Number(match[0]));
  const opMatch = cleaned.match(/[+\-*/]/);
  if (numbers.length >= 2 && opMatch) {
    return safeArith(numbers[0], opMatch[0], numbers[1]);
  }

  return null;
}

function safeArith(a, op, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? null : a / b;
    default:
      return null;
  }
}

function shortText(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 80);
}
