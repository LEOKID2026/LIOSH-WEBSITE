/**
 * Math master driver — Phase A + Phase C.
 *
 * Drives the real /learning/math-master page using the page's stable testids:
 *   math-player-name (display, auto-filled from /api/student/me)
 *   math-grade-select  / math-operation-select
 *   math-start-game
 *   math-text-answer + math-check-answer (text input answer flow)
 *   learning-stop-game (fires session/finish)
 *
 * Phase C: profile-driven correctness uses computed arithmetic answers; the
 * driver tallies intended vs observed (from /api/learning/answer's request
 * body) so the run summary can prove that profiles really differentiate.
 */

import {
  waitForSessionStart,
  waitForAnswerSave,
  clickStopAndConfirmSessionFinish,
  readAnswerIsCorrect,
  buildAnsweredQuestionEntry,
  tallyCorrectness,
  shortText,
  selectCountablePracticeMode,
  createPracticeEvidenceTracker,
} from "../learning-session-helpers.mjs";
import { attachSessionPacingToScenario } from "../session-pacing.mjs";

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
  // the student's full_name from /api/student/me.
  const playerName = (await playerNameDiv.innerText().catch(() => "")).trim();
  const accountGradeRaw = await gradeSelect.inputValue().catch(() => "");
  const accountGradeNumber = Number(accountGradeRaw) || null;
  log(
    `math-master: detected playerName='${playerName}' accountGrade=${accountGradeRaw || "(empty)"}`
  );

  await gradeSelect.selectOption({ value: String(scenario.grade) });
  await operationSelect.selectOption({ value: scenario.operation });

  await screenshotter("02-math-master-ready");

  await selectCountablePracticeMode({ page, log, subjectLabel: "math-master" });

  await startButton.waitFor({ state: "visible", timeout: 10_000 });
  log(
    `math-master: starting game mode=practice grade=${scenario.grade} operation=${scenario.operation} ` +
      `profile=${scenario.profile} questions=${scenario.questionCount}`
  );

  const sessionStartPromise = waitForSessionStart({
    page,
    log,
    subject: "math-master",
  });
  await startButton.click();
  const sessionStartResponse = await sessionStartPromise;

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

  const evidenceTracker = createPracticeEvidenceTracker("math-master", log);
  const pacing = attachSessionPacingToScenario(scenario, {
    log,
    subjectLabel: "math-master",
  });
  for (let i = 0; i < scenario.questionCount; i++) {
    const questionIndex = i + 1;
    log(
      `math-master: question ${questionIndex}/${scenario.questionCount} - waiting for prompt`
    );

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

    await pacing.waitBeforeAnswer(questionIndex);

    const answerRes = await waitForAnswerSave({
      page,
      log,
      subject: "math-master",
      questionIndex,
      doClick: async () => {
        await textInput.fill(pick.value);
        await checkButton.click();
      },
    });

    evidenceTracker.recordAnswer({
      sessionStartResponse,
      answerResponse: answerRes,
    });

    // After waitForAnswerSave returns, the answer save has been ack'd by the
    // server. The original Phase A driver also waited for input.disabled===true
    // here, but with the unified helper that wait races the page's auto-advance
    // back to an enabled input on the next question; it's safe to rely on the
    // top-of-loop "input enabled and empty" wait for synchronization instead.

    const observedCorrect = await readAnswerIsCorrect(answerRes);

    answeredQuestions.push(
      buildAnsweredQuestionEntry({
        index: questionIndex,
        topic: scenario.operation,
        exerciseText,
        computedAnswer: computed,
        submittedValue: pick.value,
        intendedCorrect: pick.intendedCorrect,
        observedCorrect,
        flow: "text",
      })
    );
  }

  await screenshotter("03-math-master-questions-complete");

  await clickStopAndConfirmSessionFinish({
    page,
    log,
    subject: "math-master",
  });

  await screenshotter("04-math-master-after-stop");

  const evidence = evidenceTracker.finalize();

  const tally = tallyCorrectness(answeredQuestions);
  log(
    `math-master: profile=${scenario.profile} intendedCorrect=${tally.intendedCorrect}/${tally.total} ` +
      `observedCorrect=${tally.observedCorrect ?? "n/a"}/${tally.observedKnown}`
  );

  return {
    answeredQuestions,
    playerName,
    accountGrade: accountGradeNumber,
    accountGradeRaw,
    tally,
    answerFlow: "text",
    evidence,
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
